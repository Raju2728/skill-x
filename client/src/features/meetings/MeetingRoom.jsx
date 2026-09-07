import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, Monitor, PhoneOff,
  MessageSquare, FileText, Users, Share2, Sparkles, Settings
} from 'lucide-react';
import webRTCManager from '../../lib/webrtc/WebRTCManager';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { sessionAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import './MeetingRoom.css';

export default function MeetingRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const toast = useToast();

  const [session, setSession] = useState(location.state?.session || null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [activeSidebarTab, setActiveSidebarTab] = useState('notes'); // 'notes' | 'chat' | 'participants'
  const [noteContent, setNoteContent] = useState('');
  const [meetingChatMessages, setMeetingChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Initialize WebRTC & Media
  useEffect(() => {
    let localStreamRef;

    async function initMeeting() {
      try {
        const stream = await webRTCManager.startLocalMedia(true, true);
        localStreamRef = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        webRTCManager.onRemoteStream = (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        };

        if (socket) {
          socket.emit('meeting:join', { sessionId: roomId });

          socket.on('meeting:participant-joined', ({ userId }) => {
            toast.info('Peer joined', 'Another participant entered the meeting room.');
            // Establish WebRTC connection
            webRTCManager.initiateCall(userId, true);
          });

          socket.on('note:update', ({ content }) => {
            setNoteContent(content);
          });

          socket.on('meeting:chat', (msg) => {
            setMeetingChatMessages(prev => [...prev, msg]);
          });
        }
      } catch (err) {
        console.error('Meeting init error:', err);
        toast.error('Media error', 'Could not access camera/microphone');
      }
    }

    initMeeting();

    return () => {
      if (socket) {
        socket.emit('meeting:leave', { sessionId: roomId });
      }
      webRTCManager.closeCall();
    };
  }, [roomId, socket, toast]);

  const toggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    webRTCManager.toggleMuteAudio(next);
  };

  const toggleVideo = () => {
    const next = !isVideoMuted;
    setIsVideoMuted(next);
    webRTCManager.toggleMuteVideo(next);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      webRTCManager.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      const stream = await webRTCManager.startScreenShare();
      if (stream) {
        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    }
  };

  const handleNoteChange = (e) => {
    const val = e.target.value;
    setNoteContent(val);
    socket?.emit('note:update', { sessionId: roomId, content: val });
  };

  const handleSendChat = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const msg = {
      senderName: user?.name || 'Me',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMeetingChatMessages(prev => [...prev, msg]);
    socket?.emit('meeting:chat', msg);
    setChatInput('');
  };

  const handleLeaveMeeting = () => {
    webRTCManager.closeCall();
    navigate('/app/sessions');
  };

  return (
    <div className="meeting-room-wrapper">
      {/* Top Meeting Header */}
      <div className="meeting-top-bar">
        <div className="meeting-title-group">
          <div className="meeting-live-dot" />
          <h2 className="meeting-title">{session?.title || 'Learning Session Room'}</h2>
        </div>

        <div className="meeting-top-actions">
          <button
            type="button"
            className={`meeting-tab-btn ${activeSidebarTab === 'notes' ? 'meeting-tab-active' : ''}`}
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'notes' ? null : 'notes')}
          >
            <FileText size={16} />
            <span>Notes</span>
          </button>

          <button
            type="button"
            className={`meeting-tab-btn ${activeSidebarTab === 'chat' ? 'meeting-tab-active' : ''}`}
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'chat' ? null : 'chat')}
          >
            <MessageSquare size={16} />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Main Center Area: Video Tiles + Collapsible Sidebar */}
      <div className="meeting-stage-area">
        {/* Video Grid */}
        <div className="meeting-video-grid">
          {/* Remote Video Tile */}
          <div className="video-tile remote-tile">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="video-element"
            />
            <div className="tile-overlay">
              <span className="tile-name">Partner Video</span>
            </div>
          </div>

          {/* Local Video Tile */}
          <div className={`video-tile local-tile ${isVideoMuted ? 'video-tile-muted' : ''}`}>
            {isVideoMuted ? (
              <div className="video-muted-avatar">
                <Avatar name={user?.name || 'Me'} size="xl" />
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
              <span className="tile-name">{user?.name || 'You'} (Me)</span>
              {isAudioMuted && <MicOff size={14} className="text-danger" />}
            </div>
          </div>
        </div>

        {/* Sidebar Panel (Notes / In-Meeting Chat) */}
        {activeSidebarTab && (
          <aside className="meeting-sidebar-panel animate-slide-in-right">
            {activeSidebarTab === 'notes' && (
              <div className="meeting-notes-panel">
                <h4 className="meeting-sidebar-title">
                  <FileText size={16} className="text-accent" />
                  Live Synced Notes
                </h4>
                <textarea
                  className="meeting-notes-editor"
                  value={noteContent}
                  onChange={handleNoteChange}
                  placeholder="Take notes collaboratively during this session..."
                />
              </div>
            )}

            {activeSidebarTab === 'chat' && (
              <div className="meeting-chat-panel">
                <h4 className="meeting-sidebar-title">
                  <MessageSquare size={16} className="text-accent" />
                  In-Meeting Chat
                </h4>
                <div className="meeting-chat-stream">
                  {meetingChatMessages.map((m, i) => (
                    <div key={i} className="meeting-chat-msg">
                      <div className="flex justify-between items-center text-xs">
                        <strong>{m.senderName}</strong>
                        <span className="text-tertiary">{m.time}</span>
                      </div>
                      <p className="text-xs text-secondary mt-1">{m.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} className="meeting-chat-input-bar">
                  <input
                    type="text"
                    placeholder="Send a message..."
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

      {/* Bottom Control Bar */}
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
            title={isVideoMuted ? 'Start camera' : 'Stop camera'}
          >
            {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          <button
            type="button"
            className={`meet-ctrl-btn ${isScreenSharing ? 'meet-ctrl-active' : ''}`}
            onClick={toggleScreenShare}
            title="Share screen"
          >
            <Monitor size={20} />
          </button>
        </div>

        <button
          type="button"
          className="meet-ctrl-leave"
          onClick={handleLeaveMeeting}
        >
          <PhoneOff size={20} />
          <span>Leave Room</span>
        </button>
      </div>
    </div>
  );
}
