import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Video, Loader, ShieldAlert } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { startRingtone, stopRingtone } from '../../lib/webrtc/ringtone';
import './IncomingCallModal.css';

export default function IncomingCallModal() {
  const { incomingCall, setIncomingCall, socket, setActiveCall } = useSocket();
  const navigate = useNavigate();
  const [permissionState, setPermissionState] = useState('idle'); // idle | requesting | denied
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    if (incomingCall) {
      startRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const { callId, callerId, callerName, callerAvatar, callType = 'voice', conversationId } = incomingCall;

  const handleAccept = async () => {
    stopRingtone();
    setPermissionState('requesting');
    setPermissionError('');

    try {
      // User gesture triggered: request media stream
      const constraints = {
        audio: true,
        video: callType === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Clean temporary test stream; the active call component will acquire and bind
      stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });

      socket?.emit('call:accept', { callId, callerId, conversationId });

      const activeCallState = {
        callId,
        callType,
        isIncoming: true,
        callerId,
        partner: {
          _id: callerId,
          name: callerName || 'Partner',
          avatar: callerAvatar,
        },
      };

      setActiveCall?.(activeCallState);
      setIncomingCall(null);
      setPermissionState('idle');

      navigate(`/app/chat`, {
        state: {
          partnerId: callerId,
          activeCall: activeCallState,
        },
      });
    } catch (err) {
      console.error('Media permission denied:', err);
      setPermissionState('denied');

      if (err.name === 'NotAllowedError') {
        setPermissionError(
          `${callType === 'video' ? 'Camera & Microphone' : 'Microphone'} access was denied. Please allow device permissions in your browser address bar to accept the call.`
        );
      } else if (err.name === 'NotFoundError') {
        setPermissionError(
          `No ${callType === 'video' ? 'camera or microphone' : 'microphone'} found on this device.`
        );
      } else {
        setPermissionError('Failed to access media devices. Please check device connections.');
      }
    }
  };

  const handleDecline = () => {
    stopRingtone();
    socket?.emit('call:reject', { callId, callerId, reason: 'declined', conversationId });
    setIncomingCall(null);
    setPermissionState('idle');
    setPermissionError('');
  };

  return (
    <div className="incoming-call-backdrop animate-fade-in">
      <div className="incoming-call-card animate-scale-in">
        <div className="incoming-call-pulse">
          <Avatar src={callerAvatar} name={callerName || 'Caller'} size="2xl" />
        </div>

        <div className="incoming-call-info">
          <h3>{callerName || 'Exchange Partner'}</h3>
          {permissionState === 'requesting' ? (
            <p className="incoming-call-permission-msg">
              Requesting {callType === 'video' ? 'camera & microphone' : 'microphone'} access...
            </p>
          ) : permissionState === 'denied' ? (
            <div className="incoming-call-error-box">
              <ShieldAlert size={16} className="text-danger" />
              <p className="incoming-call-error-msg">{permissionError}</p>
            </div>
          ) : (
            <p className="incoming-call-type-label">
              Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
            </p>
          )}
        </div>

        <div className="incoming-call-actions">
          <button
            type="button"
            className="call-btn-decline"
            onClick={handleDecline}
            aria-label="Decline call"
            title="Decline"
          >
            <PhoneOff size={22} />
          </button>

          <button
            type="button"
            className="call-btn-accept"
            onClick={handleAccept}
            disabled={permissionState === 'requesting'}
            aria-label="Accept call"
            title="Accept"
          >
            {permissionState === 'requesting' ? (
              <Loader size={22} className="animate-spin" />
            ) : callType === 'video' ? (
              <Video size={22} />
            ) : (
              <Phone size={22} />
            )}
          </button>
        </div>

        {permissionState === 'denied' && (
          <button
            type="button"
            className="incoming-call-retry"
            onClick={handleAccept}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
