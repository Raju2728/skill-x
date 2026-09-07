import { useState, useEffect } from 'react';
import { Check, CheckCheck, FileText, Download, Play, Pause, Phone, Video, PhoneOff, PhoneMissed } from 'lucide-react';
import e2eeService from '../../lib/crypto/e2eeService';
import './MessageBubble.css';

export default function MessageBubble({
  message,
  isOwn = false,
  conversationId,
  currentUserId,
  partnerUserId,
}) {
  const [decryptedText, setDecryptedText] = useState(message.plaintext || '');
  const [decrypting, setDecrypting] = useState(!message.plaintext);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function decrypt() {
      if (message.plaintext) {
        setDecryptedText(message.plaintext);
        setDecrypting(false);
        return;
      }

      // System messages have their own rendering — no decryption needed
      if (message.messageType === 'system') {
        setDecrypting(false);
        return;
      }

      if (!message.ciphertext) {
        setDecryptedText('');
        setDecrypting(false);
        return;
      }

      try {
        const text = await e2eeService.decryptMessage(
          conversationId,
          currentUserId,
          partnerUserId,
          message.ciphertext,
          message.nonce
        );
        if (isMounted) {
          setDecryptedText(text);
        }
      } catch (err) {
        if (isMounted) setDecryptedText('[Could not decrypt message]');
      } finally {
        if (isMounted) setDecrypting(false);
      }
    }
    decrypt();
    return () => { isMounted = false; };
  }, [message, conversationId, currentUserId, partnerUserId]);

  const formattedTime = new Date(message.timestamp || message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderStatus = () => {
    if (!isOwn) return null;
    if (message.deliveryStatus === 'read') {
      return <CheckCheck size={14} className="msg-status-read" />;
    }
    if (message.deliveryStatus === 'delivered') {
      return <CheckCheck size={14} className="msg-status-delivered" />;
    }
    return <Check size={14} className="msg-status-sent" />;
  };

  // --- System Messages (Call Logs) ---
  if (message.messageType === 'system') {
    const callAction = message.callAction || 'ended';
    const callType = message.callType || 'voice';
    const displayText = message.plaintext || getSystemMessageText(message.ciphertext, callType);

    const getCallIcon = () => {
      if (callAction === 'declined') return <PhoneOff size={16} />;
      if (callAction === 'missed') return <PhoneMissed size={16} />;
      if (callType === 'video') return <Video size={16} />;
      return <Phone size={16} />;
    };

    return (
      <div className="message-system-row animate-fade-in">
        <div className="message-system-bubble">
          <span className="message-system-icon">{getCallIcon()}</span>
          <span className="message-system-text">{displayText}</span>
          <span className="message-system-time">{formattedTime}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-bubble-row ${isOwn ? 'msg-row-own' : 'msg-row-partner'}`}>
      <div className={`message-bubble ${isOwn ? 'msg-bubble-own' : 'msg-bubble-partner'} animate-scale-in`}>
        {/* Text Content */}
        {decrypting ? (
          <span className="msg-decrypting">Decrypting message...</span>
        ) : message.messageType === 'file' ? (
          <div className="msg-file-attachment">
            <FileText size={24} className="text-accent" />
            <div className="msg-file-info">
              <span className="msg-file-name">{message.fileMetadata?.fileName || 'Attachment'}</span>
              <span className="msg-file-size">
                {message.fileMetadata?.fileSize ? `${(message.fileMetadata.fileSize / 1024).toFixed(1)} KB` : 'File'}
              </span>
            </div>
            {message.fileMetadata?.fileUrl && (
              <a
                href={message.fileMetadata.fileUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="msg-file-download-btn"
                aria-label="Download attachment"
              >
                <Download size={16} />
              </a>
            )}
          </div>
        ) : message.messageType === 'voice' ? (
          <div className="msg-voice-attachment">
            <button
              type="button"
              className="msg-voice-play-btn"
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            >
              {isPlayingAudio ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="msg-voice-waveform">
              <span className="waveform-bar" style={{ height: '60%' }} />
              <span className="waveform-bar" style={{ height: '90%' }} />
              <span className="waveform-bar" style={{ height: '40%' }} />
              <span className="waveform-bar" style={{ height: '70%' }} />
              <span className="waveform-bar" style={{ height: '100%' }} />
              <span className="waveform-bar" style={{ height: '50%' }} />
            </div>
            <span className="msg-voice-duration">0:15</span>
          </div>
        ) : (
          <p className="msg-text">{decryptedText}</p>
        )}

        {/* Timestamp & Delivery status */}
        <div className="msg-meta-row">
          <span className="msg-time">{formattedTime}</span>
          {renderStatus()}
        </div>
      </div>
    </div>
  );
}

/**
 * Derive display text from system ciphertext placeholders
 */
function getSystemMessageText(ciphertext, callType) {
  const icon = callType === 'video' ? '📹 Video' : '📞 Voice';
  switch (ciphertext) {
    case '__CALL_STARTED__': return `${icon} call started`;
    case '__CALL_ENDED__': return `${icon} call ended`;
    case '__CALL_DECLINED__': return `📞 Call declined`;
    case '__CALL_MISSED__': return `📞 Missed call`;
    default: return '📞 Call event';
  }
}
