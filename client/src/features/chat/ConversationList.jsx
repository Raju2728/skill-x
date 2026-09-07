import { useState } from 'react';
import { Search, MessageSquare, Plus, Lock } from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import { useSocket } from '../../contexts/SocketContext';
import './ConversationList.css';

export default function ConversationList({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
}) {
  const [search, setSearch] = useState('');
  const { isUserOnline } = useSocket();

  const filtered = conversations.filter(conv => {
    const name = conv.partner?.name || '';
    const username = conv.partner?.username || '';
    return name.toLowerCase().includes(search.toLowerCase()) ||
      username.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="conversation-list-panel">
      {/* Header */}
      <div className="conv-list-header">
        <div className="flex items-center justify-between">
          <h2 className="conv-list-title">Messages</h2>
          <button
            type="button"
            className="new-chat-btn"
            onClick={onNewChat}
            title="Start new conversation"
            aria-label="Start new conversation"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="conv-search-bar">
          <Search size={14} className="text-tertiary" />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations scroll area */}
      <div className="conv-items-container">
        {filtered.length === 0 ? (
          <div className="conv-empty">
            <MessageSquare size={32} className="text-tertiary mb-2" />
            <p>No conversations found</p>
          </div>
        ) : (
          filtered.map(conv => {
            const isActive = conv._id === activeConversationId;
            const partner = conv.partner;
            const online = isUserOnline(partner?._id);

            return (
              <button
                key={conv._id}
                type="button"
                className={`conv-item ${isActive ? 'conv-item-active' : ''}`}
                onClick={() => onSelectConversation(conv._id)}
              >
                <Avatar
                  src={partner?.avatar}
                  name={partner?.name}
                  size="md"
                  online={partner?.privacySettings?.showOnlineStatus ? online : undefined}
                />

                <div className="conv-item-info">
                  <div className="conv-item-top">
                    <span className="conv-item-name">{partner?.name || 'Partner'}</span>
                    <span className="conv-item-time">
                      {conv.lastActivity ? new Date(conv.lastActivity).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>

                  <div className="conv-item-bottom">
                    <span className="conv-last-msg">
                      <Lock size={10} className="text-success inline-icon" />
                      {conv.lastMessage?.ciphertext ? 'Encrypted message' : 'Started conversation'}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="conv-unread-pill">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
