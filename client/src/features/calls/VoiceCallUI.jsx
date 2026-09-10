import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Lock } from 'lucide-react';
import webRTCManager from '../../lib/webrtc/WebRTCManager';
import Avatar from '../../components/ui/Avatar';
import './VoiceCallUI.css';

export default function VoiceCallUI({
  partner,
  onEndCall,
  isIncoming = false,
  callId = null,
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState(isIncoming ? 'Connecting...' : 'Ringing...');
  const hasEndedRef = useRef(false);

  const audioRef = useRef(null);

  useEffect(() => {
    let timer;
    async function startCall() {
      try {
        webRTCManager.onRemoteStream = (stream) => {
          setCallStatus('Connected');
          if (audioRef.current) {
            audioRef.current.srcObject = stream;
            audioRef.current.play().catch(console.error);
          }
          if (!timer) {
            timer = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }
        };

        webRTCManager.onCallEnd = () => {
          onEndCall?.();
        };

        webRTCManager.onConnectionStateChange = (state) => {
          if (state === 'connected') setCallStatus('Connected');
          if (state === 'disconnected') setCallStatus('Reconnecting...');
          if (state === 'failed') setCallStatus('Call failed');
        };

        if (!isIncoming) {
          await webRTCManager.initiateCall(partner._id, false, callId);
        }
      } catch (err) {
        console.error('Call initialization failed:', err);
        setCallStatus('Microphone permission failed');
      }
    }

    startCall();

    return () => {
      if (timer) clearInterval(timer);
      // Only close call on unmount if we haven't already ended it via button
      if (!hasEndedRef.current) {
        webRTCManager.closeCall();
      }
    };
  }, [partner._id, isIncoming, onEndCall]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    webRTCManager.toggleMuteAudio(next);
  };

  const toggleSpeaker = () => {
    const next = !isSpeakerMuted;
    setIsSpeakerMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
  };

  // Explicitly end the call — emits call:end to server so both users disconnect
  const handleEndCall = () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    webRTCManager.closeCall(true); // true = notify socket
    onEndCall?.();
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="voice-call-overlay animate-fade-in">
      <audio ref={audioRef} autoPlay />

      <div className="voice-call-content">
        <div className="voice-call-encryption">
          <Lock size={12} className="text-success" />
          <span>Encrypted Voice Call</span>
        </div>

        <div className="voice-call-avatar-wrap">
          <Avatar src={partner?.avatar} name={partner?.name} size="2xl" />
          <div className="voice-audio-ripple" />
        </div>

        <h3 className="voice-call-name">{partner?.name}</h3>
        <p className="voice-call-status">
          {callStatus === 'Connected' ? formatTimer(callDuration) : callStatus}
        </p>

        {/* Controls */}
        <div className="voice-call-controls">
          <button
            type="button"
            className={`voice-ctrl-btn ${isMuted ? 'voice-ctrl-active' : ''}`}
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            type="button"
            className="voice-ctrl-end"
            onClick={handleEndCall}
            aria-label="End call"
          >
            <PhoneOff size={22} />
          </button>

          <button
            type="button"
            className={`voice-ctrl-btn ${isSpeakerMuted ? 'voice-ctrl-active' : ''}`}
            onClick={toggleSpeaker}
            aria-label={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
          >
            {isSpeakerMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
