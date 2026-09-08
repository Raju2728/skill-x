import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
  Lock,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import webRTCManager from '../../lib/webrtc/WebRTCManager';
import Avatar from '../../components/ui/Avatar';
import './VideoCallUI.css';

export default function VideoCallUI({
  partner,
  onEndCall,
  isIncoming = false,
  callId = null,
}) {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let timer;

    async function setupVideoCall() {
      try {
        setCallStatus('Establishing secure link...');

        // Start local video and audio
        const localStream = await webRTCManager.startLocalMedia(true, true);
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }

        webRTCManager.onRemoteStream = (stream) => {
          setCallStatus('Connected');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          if (!timer) {
            timer = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
          }
        };

        webRTCManager.onCallEnd = () => {
          onEndCall?.();
        };

        webRTCManager.onConnectionStateChange = (state) => {
          if (state === 'connected') setCallStatus('Connected');
          if (state === 'connecting') setCallStatus('Connecting...');
          if (state === 'disconnected') setCallStatus('Reconnecting...');
          if (state === 'failed') setCallStatus('Connection failed');
        };

        if (!isIncoming) {
          await webRTCManager.initiateCall(partner._id, true, callId);
        }
      } catch (err) {
        console.error('Video call initiation failed:', err);
        setCallStatus('Camera/Mic permission failed');
      }
    }

    setupVideoCall();

    return () => {
      if (timer) clearInterval(timer);
      webRTCManager.closeCall();
    };
  }, [partner._id, isIncoming, callId, onEndCall]);

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

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div ref={containerRef} className="video-call-overlay animate-fade-in">
      {/* Remote Video (Full Container) */}
      <div className="video-call-remote-wrapper">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="video-call-remote-video"
        />

        {callStatus !== 'Connected' && (
          <div className="video-call-waiting-overlay">
            <Avatar src={partner?.avatar} name={partner?.name} size="2xl" />
            <h3>{partner?.name || 'Partner'}</h3>
            <p className="video-call-status-badge">{callStatus}</p>
          </div>
        )}
      </div>

      {/* Top Header Bar */}
      <div className="video-call-header">
        <div className="video-call-partner-meta">
          <Avatar src={partner?.avatar} name={partner?.name} size="sm" />
          <span className="video-call-partner-name">{partner?.name}</span>
          <span className="video-call-timer-badge">
            {callStatus === 'Connected' ? formatTimer(callDuration) : callStatus}
          </span>
        </div>

        <div className="video-call-header-actions">
          <div className="video-call-encryption-tag">
            <Lock size={13} className="text-success" />
            <span>P2P WebRTC Encrypted</span>
          </div>
          <button
            type="button"
            className="video-ctrl-icon-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Local Video Picture-in-Picture (PiP) */}
      <div className="video-call-pip-wrapper">
        {!isVideoMuted ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-call-pip-video"
          />
        ) : (
          <div className="video-call-pip-placeholder">
            <Avatar name="You" size="md" />
            <span>Camera Off</span>
          </div>
        )}
        <span className="video-call-pip-label">You</span>
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="video-call-controls-bar">
        <button
          type="button"
          className={`video-ctrl-btn ${isAudioMuted ? 'video-ctrl-active-warn' : ''}`}
          onClick={toggleAudio}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          aria-label="Toggle microphone"
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          type="button"
          className={`video-ctrl-btn ${isVideoMuted ? 'video-ctrl-active-warn' : ''}`}
          onClick={toggleVideo}
          title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          aria-label="Toggle camera"
        >
          {isVideoMuted ? <VideoOff size={20} /> : <VideoIcon size={20} />}
        </button>

        <button
          type="button"
          className={`video-ctrl-btn ${isScreenSharing ? 'video-ctrl-active-primary' : ''}`}
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          aria-label="Toggle screen share"
        >
          {isScreenSharing ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
        </button>

        <button
          type="button"
          className="video-ctrl-btn-end"
          onClick={onEndCall}
          title="End Video Call"
          aria-label="End call"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
