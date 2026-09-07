import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Phone, Video, Calendar, MoreVertical, ShieldCheck,
  Sparkles, Lock, ArrowLeft
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
import { PageLoader } from '../../components/ui/Spinner';
import './ChatWindow.css';

export default function ChatWindow({
  conversation,
  onBack,
}) {
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocket();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const partner = conversation.partner;
  const isOnline = isUserOnline(partner?._id);

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
        // Deduplicate: avoid adding if we already have this message by _id
        setMessages(prev => {
          const msgId = data.message._id;
          if (msgId && prev.some(m => m._id === msgId)) {
            return prev;
          }
          return [...prev, data.message];
        });

        // Send read confirmation for partner's messages
        if (data.message.senderId !== user?._id) {
          socket.emit('message:read', {
            conversationId: conversation._id,
            senderId: data.message.senderId || partner._id,
          });
        }
      }
    };

    // Handle server confirmation of our sent message (replace optimistic entry)
    const handleMessagePersisted = (data) => {
      if (data.conversationId === conversation._id) {
        setMessages(prev => {
          // Replace the optimistic message (matched by temp timestamp) with the persisted one
          const updated = prev.map(m => {
            if (m._tempTimestamp === data.tempTimestamp && !m._id) {
              return data.message;
            }
            return m;
          });
          return updated;
        });
      }
    };

    const handleTypingStart = (data) => {
      if (data.conversationId === conversation._id) {
        setIsPartnerTyping(true);
      }
    };

    const handleTypingStop = (data) => {
      if (data.conversationId === conversation._id) {
        setIsPartnerTyping(false);
      }
    };

    const handleMessageDelivered = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deliveryStatus: 'delivered' } : m));
    };

    const handleMessageRead = ({ conversationId }) => {
      if (conversationId === conversation._id) {
        setMessages(prev => prev.map(m => ({ ...m, deliveryStatus: 'read' })));
      }
    };

    socket.on('message:receive', handleReceiveMessage);
    socket.on('message:persisted', handleMessagePersisted);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:read', handleMessageRead);

    return () => {
      socket.off('message:receive', handleReceiveMessage);
      socket.off('message:persisted', handleMessagePersisted);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:read', handleMessageRead);
    };
  }, [socket, conversation?._id, partner?._id, user?._id]);

  const handleSendMessage = async ({ text, file }) => {
    if (!text && !file) return;

    let fileMetadata = null;
    let messageType = 'text';

    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const fileRes = await fileAPI.upload(file);
        fileMetadata = {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileUrl: fileRes.data?.url || URL.createObjectURL(file),
        };
        messageType = 'file';
      } catch (err) {
        console.error('File upload failed:', err);
      }
    }

    const payloadText = text || (file ? `Sent file: ${file.name}` : '');

    // 1. Encrypt payload client-side using E2EE
    const { ciphertext, nonce } = await e2eeService.encryptMessage(
      conversation._id,
      user._id,
      partner._id,
      payloadText
    );

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
      plaintext: payloadText, // Local preview immediately
    };

    // Optimistic UI update
    setMessages(prev => [...prev, messageObj]);

    // 2. Broadcast via Socket.IO (server will persist and relay)
    if (socket?.connected) {
      socket.emit('message:send', {
        conversationId: conversation._id,
        recipientId: partner._id,
        message: messageObj,
      });
    } else {
      // 3. Fallback: Persist via REST API if socket is disconnected
      try {
        const { data } = await conversationAPI.sendMessage(conversation._id, {
          ciphertext,
          nonce,
          messageType,
          fileMetadata,
        });
        // Replace optimistic message with persisted one
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
    socket?.emit('call:request', {
      recipientId: partner._id,
      callType,
      conversationId: conversation._id,
    });
  };

  return (
    <div className="chat-window-panel">
      {/* Header */}
      <div className="chat-window-header">
        <div className="chat-header-partner">
          {onBack && (
            <button className="chat-back-btn md-show" onClick={onBack} aria-label="Back to conversations">
              <ArrowLeft size={18} />
            </button>
          )}
          <Avatar
            src={partner?.avatar}
            name={partner?.name}
            size="md"
            online={partner?.privacySettings?.showOnlineStatus ? isOnline : undefined}
          />
          <div className="chat-partner-info">
            <Link to={`/app/profile/${partner?._id}`} className="chat-partner-name">
              {partner?.name}
            </Link>
            <div className="flex items-center gap-2">
              <span className="chat-partner-status">
                {isOnline ? 'Online' : 'Offline'}
              </span>
              <SecurityIndicator partner={partner} />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="chat-header-actions">
          <button
            type="button"
            className="chat-action-btn"
            onClick={() => startCall('voice')}
            title="Start Voice Call"
            aria-label="Start Voice Call"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            className="chat-action-btn"
            onClick={() => startCall('video')}
            title="Start Video Meeting"
            aria-label="Start Video Meeting"
          >
            <Video size={18} />
          </button>
          <button
            type="button"
            className="chat-action-btn"
            onClick={() => navigate('/app/sessions', { state: { openScheduler: true, selectedPartner: partner } })}
            title="Schedule Learning Session"
            aria-label="Schedule Session"
          >
            <Calendar size={18} />
          </button>
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
                isOwn={msg.senderId === user?._id}
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
    </div>
  );
}
