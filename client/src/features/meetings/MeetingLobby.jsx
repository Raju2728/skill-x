import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import './MeetingLobby.css';

export default function MeetingLobby({
  sessionTitle,
  userName,
  userAvatar,
  onJoin,
}) {
  const navigate = useNavigate();
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionError, setPermissionError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    let localStream = null;

    async function initPreview() {
      try {
        setPermissionError('');
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true },
        });

        streamRef.current = localStream;

        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }

        // Setup live audio meter
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(localStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateVolume = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };

          updateVolume();
        }
      } catch (err) {
        console.warn('Lobby preview permission notice:', err);
        if (err.name === 'NotAllowedError') {
          setPermissionError('Camera and microphone access was blocked. You can still join with devices off.');
        } else {
          setPermissionError('Device unavailable or in use by another application.');
        }
      }
    }

    initPreview();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
    };
  }, []);

  const toggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
  };

  const toggleCamera = () => {
    const next = !isCameraOff;
    setIsCameraOff(next);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
    }
  };

  const handleJoinClick = () => {
    // Release lobby preview stream before entering meeting room
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    onJoin({
      initialAudioMuted: isMicMuted,
      initialVideoMuted: isCameraOff,
    });
  };

  return (
    <div className="meeting-lobby-backdrop">
      <div className="meeting-lobby-card animate-scale-in">
        <button
          type="button"
          className="lobby-back-btn"
          onClick={() => navigate('/app/dashboard')}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div className="meeting-lobby-content">
          {/* Left: Video Preview */}
          <div className="meeting-lobby-preview">
            {!isCameraOff && !permissionError ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="lobby-video-preview"
              />
            ) : (
              <div className="lobby-camera-placeholder">
                <Avatar src={userAvatar} name={userName} size="2xl" />
                <span>{permissionError ? 'Device Inactive' : 'Camera is Off'}</span>
              </div>
            )}

            {/* Quick Preview Device Toggles */}
            <div className="lobby-preview-controls">
              <button
                type="button"
                className={`lobby-device-btn ${isMicMuted ? 'lobby-btn-warn' : ''}`}
                onClick={toggleMic}
                title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button
                type="button"
                className={`lobby-device-btn ${isCameraOff ? 'lobby-btn-warn' : ''}`}
                onClick={toggleCamera}
                title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
              </button>
            </div>

            {/* Audio Level Indicator */}
            {!isMicMuted && !permissionError && (
              <div className="lobby-audio-meter">
                <Volume2 size={13} className="text-secondary" />
                <div className="audio-meter-bar">
                  <div
                    className="audio-meter-fill"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Meeting Info & Join Action */}
          <div className="meeting-lobby-info">
            <div className="lobby-badge-group">
              <ShieldCheck size={14} className="text-success" />
              <span>Skill X Secure Meeting</span>
            </div>

            <h2 className="lobby-session-title">
              {sessionTitle || 'Interactive Skill Exchange Session'}
            </h2>

            <p className="lobby-session-desc">
              Check your camera and microphone settings before entering the room.
            </p>

            {permissionError && (
              <div className="lobby-permission-alert">
                <p>{permissionError}</p>
              </div>
            )}

            <div className="lobby-settings-summary">
              <div className="setting-row">
                <span>Microphone:</span>
                <strong>{isMicMuted ? 'Muted' : 'Active'}</strong>
              </div>
              <div className="setting-row">
                <span>Camera:</span>
                <strong>{isCameraOff ? 'Off' : 'Active'}</strong>
              </div>
              <div className="setting-row">
                <span>Joining as:</span>
                <strong>{userName || 'Participant'}</strong>
              </div>
            </div>

            <Button
              size="lg"
              variant="primary"
              className="lobby-join-btn"
              onClick={handleJoinClick}
            >
              <Sparkles size={18} />
              <span>Join Meeting Now</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
