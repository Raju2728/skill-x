import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  MessageSquare,
  FileText,
  Users,
  Shield,
  Crown,
  UserX,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import webRTCManager from '../../lib/webrtc/WebRTCManager';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import MeetingLobby from './MeetingLobby';
import './MeetingRoom.css';

// Individual participant video tile
function ParticipantVideoTile({ participant, stream, isMuted }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().some(t => t.enabled);

  return (
    <div className={`video-tile ${!hasVideo ? 'video-tile-muted' : ''}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="video-element"
        />
      ) : (
        <div className="video-muted-avatar">
          <Avatar src={participant.avatar} name={participant.name || 'Participant'} size="xl" />
        </div>
      )}
      <div className="tile-overlay">
        <div className="tile-name-group">
          {participant.isHost && (
            <Crown size={13} className="text-warning" title="Host" />
          )}
          <span className="tile-name">{participant.name || 'Participant'}</span>
        </div>
        {isMuted && <MicOff size={14} className="text-danger" />}
      </div>
    </div>
  );
}

export default function MeetingRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const toast = useToast();

  const [session, setSession] = useState(location.state?.session || null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHost, setIsHost] = useState(false);

  // Participants Map: userId -> { userId, name, avatar, isHost, audio, video }
  const [participants, setParticipants] = useState(new Map());
  // Remote Streams Map: userId -> MediaStream
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  const [activeSidebarTab, setActiveSidebarTab] = useState('participants'); // 'notes' | 'chat' | 'participants'
  const [noteContent, setNoteContent] = useState('');
  const [meetingChatMessages, setMeetingChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const localVideoRef = useRef(null);

  useEffect(() => {
    if (!hasJoined) return;

    async function initMeeting() {
      try {
        // Start local video and audio
        const stream = await webRTCManager.startLocalMedia(!isVideoMuted, !isAudioMuted);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // WebRTC Mesh Remote Stream callback (HIGH-004)
        webRTCManager.onMeshRemoteStream = (peerId, remoteStream) => {
          setRemoteStreams((prev) => {
            const updated = new Map(prev);
            updated.set(peerId, remoteStream);
            return updated;
          });
        };

        webRTCManager.onMeshParticipantLeft = (peerId) => {
          setRemoteStreams((prev) => {
            const updated = new Map(prev);
            updated.delete(peerId);
            return updated;
          });
          setParticipants((prev) => {
            const updated = new Map(prev);
            updated.delete(peerId);
            return updated;
          });
        };

        if (socket) {
          // Join room on socket server
          socket.emit('meeting:join', { sessionId: roomId });

          // Received roster of existing members
          socket.on('meeting:roster', async ({ participants: roster, isHost: hostFlag }) => {
            setIsHost(hostFlag);
            const initialMap = new Map();
            roster.forEach((p) => initialMap.set(p.userId, p));
            setParticipants(initialMap);

            // Connect to existing mesh peers
            await webRTCManager.joinMeetingMesh(roomId, roster, !isVideoMuted, !isAudioMuted);
          });

          // A new participant arrived
          socket.on('meeting:participant-joined', async (newParticipant) => {
            toast.info('Participant joined', `${newParticipant.name} entered the room.`);
            setParticipants((prev) => {
              const updated = new Map(prev);
              updated.set(newParticipant.userId, newParticipant);
              return updated;
            });
            // Connect to newcomer as initiator
            await webRTCManager.connectToMeshPeer(newParticipant.userId, true);
          });

          socket.on('meeting:participant-left', ({ userId }) => {
            webRTCManager.closeMeshPeer(userId);
            setParticipants((prev) => {
              const updated = new Map(prev);
              updated.delete(userId);
              return updated;
            });
          });

          socket.on('meeting:media-state', ({ userId, audio, video }) => {
            setParticipants((prev) => {
              const updated = new Map(prev);
              const p = updated.get(userId);
              if (p) {
                if (audio !== undefined) p.audio = audio;
                if (video !== undefined) p.video = video;
                updated.set(userId, { ...p });
              }
              return updated;
            });
          });

          socket.on('meeting:chat', (msg) => {
            setMeetingChatMessages((prev) => [...prev, msg]);
          });

          socket.on('note:update', ({ content }) => {
            setNoteContent(content);
          });

          // Host moderation events
          socket.on('meeting:force-mute', () => {
            setIsAudioMuted(true);
            webRTCManager.toggleMuteAudio(true);
            toast.warning('Muted by Host', 'Your microphone was muted by the session host.');
          });

          socket.on('meeting:kicked', ({ reason }) => {
            webRTCManager.leaveMeetingMesh();
            toast.error('Removed from room', reason || 'You were removed by the host.');
            navigate('/app/dashboard');
          });

          socket.on('meeting:ended', () => {
            webRTCManager.leaveMeetingMesh();
            toast.info('Meeting Ended', 'The host has ended this meeting session.');
            navigate('/app/dashboard');
          });
        }
      } catch (err) {
        console.error('Meeting initialization error:', err);
        toast.error('Device access error', 'Could not start camera/microphone. Please allow browser permissions.');
      }
    }

    initMeeting();

    return () => {
      if (socket) {
        socket.emit('meeting:leave', { sessionId: roomId });
      }
      webRTCManager.leaveMeetingMesh();
    };
  }, [hasJoined, roomId, socket]);

  const toggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    webRTCManager.toggleMuteAudio(next);
    socket?.emit('meeting:media-state', { sessionId: roomId, audio: !next });
  };

  const toggleVideo = () => {
    const next = !isVideoMuted;
    setIsVideoMuted(next);
    webRTCManager.toggleMuteVideo(next);
    socket?.emit('meeting:media-state', { sessionId: roomId, video: !next });
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      webRTCManager.stopScreenShare();
      setIsScreenSharing(false);
      socket?.emit('meeting:media-state', { sessionId: roomId, screen: false });
    } else {
      const stream = await webRTCManager.startScreenShare();
      if (stream) {
        setIsScreenSharing(true);
        socket?.emit('meeting:media-state', { sessionId: roomId, screen: true });
      }
    }
  };

  const handleLeaveMeeting = () => {
    webRTCManager.leaveMeetingMesh();
    navigate('/app/dashboard');
  };

  const handleEndMeetingForAll = () => {
    if (confirm('Are you sure you want to end this meeting for all participants?')) {
      socket?.emit('meeting:end-for-all', { sessionId: roomId });
      webRTCManager.leaveMeetingMesh();
      navigate('/app/dashboard');
    }
  };

  const handleMuteParticipant = (targetUserId) => {
    socket?.emit('meeting:mute-participant', { sessionId: roomId, targetUserId });
  };

  const handleKickParticipant = (targetUserId) => {
    if (confirm('Remove this participant from the meeting?')) {
      socket?.emit('meeting:kick-participant', { sessionId: roomId, targetUserId });
    }
  };

  const handleNoteChange = (e) => {
    const val = e.target.value;
    setNoteContent(val);
    socket?.emit('note:update', { sessionId: roomId, content: val });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('meeting:chat', { sessionId: roomId, text: chatInput.trim() });
    setChatInput('');
  };

  // Pre-join preview lobby before entering room
  if (!hasJoined) {
    return (
      <MeetingLobby
        sessionTitle={session?.title}
        userName={user?.name}
        userAvatar={user?.avatar}
        onJoin={({ initialAudioMuted, initialVideoMuted }) => {
          setIsAudioMuted(initialAudioMuted);
          setIsVideoMuted(initialVideoMuted);
          setHasJoined(true);
        }}
      />
    );
  }

  const remoteParticipantsList = Array.from(participants.values()).filter(
    (p) => p.userId !== user?._id
  );

  return (
    <div className="meeting-room-container">
      {/* Top Bar */}
      <div className="meeting-top-bar">
        <div className="meeting-meta">
          <div className="meeting-live-badge">
            <span className="live-dot animate-pulse" />
            <span>LIVE MEETING</span>
          </div>
          <h2 className="meeting-title">{session?.title || `Room: ${roomId}`}</h2>
          {isHost && (
            <span className="host-badge">
              <Crown size={12} /> Host
            </span>
          )}
        </div>

        <div className="meeting-top-actions">
          <button
            type="button"
            className={`meeting-tab-btn ${activeSidebarTab === 'participants' ? 'meeting-tab-active' : ''}`}
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'participants' ? null : 'participants')}
            title="Participants"
          >
            <Users size={16} />
            <span>People ({participants.size + 1})</span>
          </button>

          <button
            type="button"
            className={`meeting-tab-btn ${activeSidebarTab === 'notes' ? 'meeting-tab-active' : ''}`}
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'notes' ? null : 'notes')}
            title="Shared Notes"
          >
            <FileText size={16} />
            <span>Notes</span>
          </button>

          <button
            type="button"
            className={`meeting-tab-btn ${activeSidebarTab === 'chat' ? 'meeting-tab-active' : ''}`}
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'chat' ? null : 'chat')}
            title="In-Meeting Chat"
          >
            <MessageSquare size={16} />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Main Area: Dynamic Multi-User Grid + Sidebar */}
      <div className="meeting-stage-area">
        <div
          className={`meeting-video-grid grid-count-${Math.min(remoteParticipantsList.length + 1, 6)}`}
        >
          {/* Local User Video Tile */}
          <div className={`video-tile local-tile ${isVideoMuted ? 'video-tile-muted' : ''}`}>
            {isVideoMuted ? (
              <div className="video-muted-avatar">
                <Avatar src={user?.avatar} name={user?.name || 'You'} size="xl" />
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="video-element local-mirror"
              />
            )}
            <div className="tile-overlay">
              <div className="tile-name-group">
                {isHost && <Crown size={13} className="text-warning" />}
                <span className="tile-name">{user?.name || 'You'} (Me)</span>
              </div>
              {isAudioMuted && <MicOff size={14} className="text-danger" />}
            </div>
          </div>

          {/* Dynamic Remote Participant Tiles (Multi-User Mesh) */}
          {remoteParticipantsList.map((p) => (
            <ParticipantVideoTile
              key={p.userId}
              participant={p}
              stream={remoteStreams.get(p.userId)}
              isMuted={p.audio === false}
            />
          ))}
        </div>

        {/* Sidebar Panel */}
        {activeSidebarTab && (
          <aside className="meeting-sidebar-panel animate-slide-in-right">
            {/* Participants Roster & Host Moderation */}
            {activeSidebarTab === 'participants' && (
              <div className="meeting-participants-panel">
                <h4 className="meeting-sidebar-title">
                  <Users size={16} className="text-accent" />
                  Meeting Participants ({participants.size + 1})
                </h4>

                <div className="participants-list">
                  {/* Current User */}
                  <div className="participant-item">
                    <Avatar src={user?.avatar} name={user?.name} size="sm" />
                    <div className="participant-info">
                      <span className="participant-name">{user?.name || 'You'} (Me)</span>
                      {isHost && <span className="badge-host">Host</span>}
                    </div>
                    <div className="participant-status-icons">
                      {isAudioMuted ? <MicOff size={14} className="text-danger" /> : <Mic size={14} className="text-success" />}
                    </div>
                  </div>

                  {/* Remote Participants */}
                  {remoteParticipantsList.map((p) => (
                    <div key={p.userId} className="participant-item">
                      <Avatar src={p.avatar} name={p.name} size="sm" />
                      <div className="participant-info">
                        <span className="participant-name">{p.name || 'User'}</span>
                        {p.isHost && <span className="badge-host">Host</span>}
                      </div>

                      <div className="participant-actions">
                        {p.audio === false ? (
                          <MicOff size={14} className="text-danger" />
                        ) : (
                          <Mic size={14} className="text-success" />
                        )}

                        {/* Host Moderation Controls */}
                        {isHost && (
                          <div className="host-controls-group">
                            <button
                              type="button"
                              className="btn-host-action"
                              onClick={() => handleMuteParticipant(p.userId)}
                              title="Mute Participant"
                            >
                              <VolumeX size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-host-action btn-kick"
                              onClick={() => handleKickParticipant(p.userId)}
                              title="Remove Participant"
                            >
                              <UserX size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collaborative Synced Notes */}
            {activeSidebarTab === 'notes' && (
              <div className="meeting-notes-panel">
                <h4 className="meeting-sidebar-title">
                  <FileText size={16} className="text-accent" />
                  Real-time Collaborative Notes
                </h4>
                <textarea
                  className="meeting-notes-editor"
                  value={noteContent}
                  onChange={handleNoteChange}
                  placeholder="Type notes collaboratively here..."
                />
              </div>
            )}

            {/* In-Meeting Chat */}
            {activeSidebarTab === 'chat' && (
              <div className="meeting-chat-panel">
                <h4 className="meeting-sidebar-title">
                  <MessageSquare size={16} className="text-accent" />
                  In-Meeting Chat
                </h4>
                <div className="meeting-chat-stream">
                  {meetingChatMessages.map((m) => (
                    <div key={m.id} className="meeting-chat-msg">
                      <div className="flex justify-between items-center text-xs">
                        <strong>{m.senderName}</strong>
                        <span className="text-tertiary">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-1">{m.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} className="meeting-chat-input-bar">
                  <input
                    type="text"
                    placeholder="Send a message to meeting..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <Button size="sm" type="submit">Send</Button>
                </form>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Meeting Control Bar */}
      <div className="meeting-controls-bar">
        <div className="meeting-controls-group">
          <button
            type="button"
            className={`meet-ctrl-btn ${isAudioMuted ? 'meet-ctrl-muted' : ''}`}
            onClick={toggleAudio}
            title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            type="button"
            className={`meet-ctrl-btn ${isVideoMuted ? 'meet-ctrl-muted' : ''}`}
            onClick={toggleVideo}
            title={isVideoMuted ? 'Turn camera on' : 'Turn camera off'}
          >
            {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          <button
            type="button"
            className={`meet-ctrl-btn ${isScreenSharing ? 'meet-ctrl-active' : ''}`}
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            <Monitor size={20} />
          </button>
        </div>

        <div className="meeting-leave-group">
          {isHost && (
            <button
              type="button"
              className="meet-ctrl-end-all"
              onClick={handleEndMeetingForAll}
              title="End Meeting for Everyone"
            >
              End for All
            </button>
          )}

          <button
            type="button"
            className="meet-ctrl-leave"
            onClick={handleLeaveMeeting}
          >
            <PhoneOff size={20} />
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
}
