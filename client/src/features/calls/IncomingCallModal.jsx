import { useState } from 'react';
import { Phone, PhoneOff, Video, Loader } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import './IncomingCallModal.css';

export default function IncomingCallModal() {
  const { incomingCall, setIncomingCall, socket } = useSocket();
  const navigate = useNavigate();
  const [permissionState, setPermissionState] = useState('idle'); // idle | requesting | denied
  const [permissionError, setPermissionError] = useState('');

  if (!incomingCall) return null;

  const { callerId, callerName, callerAvatar, callType = 'voice', conversationId } = incomingCall;

  const handleAccept = async () => {
    setPermissionState('requesting');
    setPermissionError('');

    try {
      // Request mic/camera permission based on call type
      const constraints = {
        audio: true,
        video: callType === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Permissions granted — stop tracks for now (the meeting room will re-acquire)
      stream.getTracks().forEach(track => track.stop());

      socket?.emit('call:accept', { callerId, conversationId });
      setIncomingCall(null);
      setPermissionState('idle');

      navigate(`/app/chat`, {
        state: {
          partnerId: callerId,
          activeCall: { callType, isIncoming: true, callerId },
        },
      });
    } catch (err) {
      console.error('Media permission denied:', err);
      setPermissionState('denied');

      if (err.name === 'NotAllowedError') {
        setPermissionError(
          `${callType === 'video' ? 'Camera & Microphone' : 'Microphone'} access was denied. Please allow permissions in your browser settings to accept calls.`
        );
      } else if (err.name === 'NotFoundError') {
        setPermissionError(
          `No ${callType === 'video' ? 'camera or microphone' : 'microphone'} found on this device.`
        );
      } else {
        setPermissionError('Failed to access media devices. Please check your device settings.');
      }
    }
  };

  const handleDecline = () => {
    socket?.emit('call:reject', { callerId, reason: 'declined', conversationId });
    setIncomingCall(null);
    setPermissionState('idle');
    setPermissionError('');
  };

  return (
    <div className="incoming-call-backdrop animate-fade-in">
      <div className="incoming-call-card animate-scale-in">
        <div className="incoming-call-pulse">
          <Avatar src={callerAvatar} name={callerName || 'Caller'} size="xl" />
        </div>

        <div className="incoming-call-info">
          <h3>{callerName || 'Exchange Partner'}</h3>
          {permissionState === 'requesting' ? (
            <p className="incoming-call-permission-msg">
              Requesting {callType === 'video' ? 'camera & microphone' : 'microphone'} access...
            </p>
          ) : permissionState === 'denied' ? (
            <p className="incoming-call-error-msg">
              {permissionError}
            </p>
          ) : (
            <p>
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
          >
            <PhoneOff size={22} />
          </button>

          <button
            type="button"
            className="call-btn-accept"
            onClick={handleAccept}
            disabled={permissionState === 'requesting'}
            aria-label="Accept call"
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
