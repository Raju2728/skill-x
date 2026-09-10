import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Phone, Video, Calendar, MoreVertical, ShieldCheck,
  Sparkles, Lock, ArrowLeft, User
} from 'lucide-react';
import { conversationAPI, fileAPI } from '../../services/api';
import e2eeService from '../../lib/crypto/e2eeService';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import SecurityIndicator from './SecurityIndicator';
import VoiceCallUI from '../calls/VoiceCallUI';
import VideoCallUI from '../calls/VideoCallUI';
import { PageLoader } from '../../components/ui/Spinner';
import './ChatWindow.css';

export default function ChatWindow({
  conversation,
  onBack,
}) {
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [activeCall, setActiveCall] = useState(location.state?.activeCall || null);
  const messagesEndRef = useRef(null);

  const partner = conversation.partner;
  const isOnline = isUserOnline(partner?._id);

  // Sync activeCall from navigation state if accepted from modal
  useEffect(() => {
    if (location.state?.activeCall) {
      setActiveCall(location.state.activeCall);
    }
  }, [location.state?.activeCall]);

  // Listen for remote call termination
  useEffect(() => {
    if (!socket) return;

    const handleCallEnded = () => {
      setActiveCall(null);
    };

    const handleCallRejected = () => {
      setActiveCall(null);
    };

    socket.on('call:ended', handleCallEnded);
    socket.on('call:rejected', handleCallRejected);

    return () => {
      socket.off('call:ended', handleCallEnded);
      socket.off('call:rejected', handleCallRejected);
    };
  }, [socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load message history
  useEffect(() => {
    async function loadMessages() {
      if (!conversation?._id) return;
      try {
        setLoading(true);
        const { data } = await conversationAPI.getMessages(conversation._id);
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
  }, [conversation?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleReceiveMessage = (data) => {
      if (data.conversationId === conversation._id) {
        setMessages(prev => {
          const msgId = data.message._id;
          if (msgId && prev.some(m => m._id === msgId)) return prev;
          return [...prev, data.message];
        });
      }
    };

    const handleTypingStart = (data) => {
      if (data.conversationId === conversation._id && data.senderId === partner?._id) {
        setIsPartnerTyping(true);
      }
    };

    const handleTypingStop = (data) => {
      if (data.conversationId === conversation._id && data.senderId === partner?._id) {
        setIsPartnerTyping(false);
      }
    };

    socket.on('message:receive', handleReceiveMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:receive', handleReceiveMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, conversation?._id, partner?._id]);

  const handleSendMessage = async ({ text, file, messageType: initialType }) => {
    if (!partner?._id) return;

    let payloadText = text;
    let messageType = initialType || 'text';
    let fileMetadata = null;

    if (file) {
      try {
        const { data: uploadData } = await fileAPI.upload(file, {
          conversationId: conversation._id,
          recipientId: partner._id,
        });
        const fileDoc = uploadData.file || {};
        const filePath = fileDoc.path || fileDoc.filename;
        const resolvedUrl = uploadData.url || (filePath ? `/uploads/${filePath}` : '');
        const originalName = fileDoc.name || file.name || 'attachment';

        fileMetadata = {
          fileId: fileDoc._id,
          filename: filePath,
          originalName,
          fileName: originalName,
          mimeType: fileDoc.mimeType || file.type,
          size: fileDoc.size || file.size,
          fileSize: fileDoc.size || file.size,
          url: resolvedUrl,
          fileUrl: resolvedUrl,
        };
        messageType = file.type.startsWith('image/') ? 'image' : 'file';
        payloadText = originalName;
      } catch (uploadErr) {
        console.error('File upload failed:', uploadErr);
        alert('File upload failed. Please try again.');
        return;
      }
    }

    let ciphertext = payloadText;
    let nonce = '';
    try {
      const encrypted = await e2eeService.encryptMessage(
        conversation._id,
        user._id,
        partner._id,
        payloadText
      );
      ciphertext = encrypted.ciphertext;
      nonce = encrypted.nonce;
    } catch (encryptErr) {
      console.error('Failed to encrypt message:', encryptErr);
      alert('Could not encrypt message using End-to-End Encryption. Please ensure recipient public keys are active.');
      return;
    }

    const tempTimestamp = new Date().toISOString();

    const messageObj = {
      conversationId: conversation._id,
      senderId: user._id,
      recipientId: partner._id,
      ciphertext,
      nonce,
      messageType,
      fileMetadata,
      timestamp: tempTimestamp,
      _tempTimestamp: tempTimestamp,
      deliveryStatus: 'sent',
      plaintext: payloadText,
    };

    setMessages(prev => [...prev, messageObj]);

    if (socket?.connected) {
      socket.emit('message:send', {
        conversationId: conversation._id,
        recipientId: partner._id,
        message: messageObj,
      });
    } else {
      try {
        const { data } = await conversationAPI.sendMessage(conversation._id, {
          ciphertext,
          nonce,
          messageType,
          fileMetadata,
        });
        if (data.message) {
          setMessages(prev => prev.map(m =>
            m._tempTimestamp === tempTimestamp ? { ...data.message, plaintext: payloadText } : m
          ));
        }
      } catch (err) {
        console.error('Failed to persist message via API:', err);
      }
    }
  };

  const handleTypingStart = () => {
    socket?.emit('typing:start', {
      conversationId: conversation._id,
      recipientId: partner._id,
    });
  };

  const handleTypingStop = () => {
    socket?.emit('typing:stop', {
      conversationId: conversation._id,
      recipientId: partner._id,
    });
  };

  const startCall = (callType) => {
    const callId = `call_${Date.now()}`;
    setActiveCall({
      callId,
      callType,
      isIncoming: false,
      partner,
    });
    socket?.emit('call:request', {
      callId,
      recipientId: partner._id,
      callType,
      conversationId: conversation._id,
    });
  };

  return (
    <div className="chat-window-panel">
      {/* Redesigned Profile Information Header */}
      <div className="chat-window-header">
        <div className="chat-header-partner">
          {onBack && (
            <button className="chat-back-btn md-show" onClick={onBack} aria-label="Back to conversations">
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="chat-partner-avatar-wrap">
            <Avatar
              src={partner?.avatar}
              name={partner?.name}
              size="md"
              online={partner?.privacySettings?.showOnlineStatus ? isOnline : undefined}
            />
          </div>

          <div className="chat-partner-info">
            <div className="chat-partner-primary-row">
              <Link to={`/app/profile/${partner?._id}`} className="chat-partner-name">
                {partner?.name || 'Peer Exchanger'}
              </Link>
              {partner?.username && (
                <span className="chat-partner-handle">@{partner.username}</span>
              )}
              <span className={`chat-presence-pill ${isOnline ? 'is-online' : 'is-offline'}`}>
                <span className="presence-dot" />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="chat-partner-secondary-row">
              {partner?.teachSkills?.length > 0 ? (
                <span className="chat-skills-chip" title="Skills this peer teaches">
                  <Sparkles size={11} /> Teaches: {partner.teachSkills.slice(0, 2).map(s => s.name || s.skillId?.name || s).join(', ')}
                </span>
              ) : partner?.headline ? (
                <span className="chat-partner-headline">{partner.headline}</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="chat-header-actions">
          <button
            type="button"
            className="chat-action-btn chat-action-call"
            onClick={() => startCall('voice')}
            title="Start Encrypted Voice Call"
            aria-label="Start Voice Call"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            className="chat-action-btn chat-action-video"
            onClick={() => startCall('video')}
            title="Start HD Video Meeting"
            aria-label="Start Video Meeting"
          >
            <Video size={18} />
          </button>
          <button
            type="button"
            className="chat-action-btn chat-action-session"
            onClick={() => navigate('/app/sessions', { state: { openScheduler: true, selectedPartner: partner } })}
            title="Schedule Skill Exchange Session"
            aria-label="Schedule Session"
          >
            <Calendar size={18} />
          </button>
          <Link
            to={`/app/profile/${partner?._id}`}
            className="chat-action-btn chat-action-profile"
            title="View Full Profile"
            aria-label="View Profile"
          >
            <User size={18} />
          </Link>
        </div>
      </div>

      {/* Message Feed */}
      <div className="chat-messages-area">
        {loading ? (
          <PageLoader />
        ) : messages.length === 0 ? (
          <div className="chat-empty-feed">
            <div className="chat-encryption-banner">
              <Lock size={16} className="text-success" />
              <span>
                Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
              </span>
            </div>
            <p className="mt-4 text-xs text-tertiary">
              Send a greeting to start your learning exchange with {partner?.name}!
            </p>
          </div>
        ) : (
          <div className="chat-messages-list">
            <div className="chat-encryption-banner">
              <Lock size={14} className="text-success" />
              <span>End-to-end encrypted chat</span>
            </div>

            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg._id || `temp-${idx}`}
                message={msg}
                isOwn={String(msg.senderId?._id || msg.senderId) === String(user?._id)}
                conversationId={conversation._id}
                currentUserId={user?._id}
                partnerUserId={partner?._id}
              />
            ))}

            {isPartnerTyping && (
              <div className="typing-indicator-row animate-fade-in">
                <div className="typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="typing-text">{partner?.name?.split(' ')[0]} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
      />

      {/* 1-on-1 Voice Call UI */}
      {activeCall && activeCall.callType === 'voice' && (
        <VoiceCallUI
          partner={partner}
          isIncoming={activeCall.isIncoming}
          callId={activeCall.callId}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      {/* 1-on-1 Video Call UI */}
      {activeCall && activeCall.callType === 'video' && (
        <VideoCallUI
          partner={partner}
          isIncoming={activeCall.isIncoming}
          callId={activeCall.callId}
          onEndCall={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
