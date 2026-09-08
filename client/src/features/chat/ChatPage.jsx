import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Calendar, Users } from 'lucide-react';
import { conversationAPI } from '../../services/api';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import './ChatPage.css';

const MOBILE_BREAKPOINT = 768;

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  // 'list' | 'chat' — only meaningful on mobile
  const [mobilePanel, setMobilePanel] = useState('list');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load conversations
  useEffect(() => {
    async function loadConversations() {
      try {
        setLoading(true);
        const { data } = await conversationAPI.getConversations();
        const convs = data.conversations || [];
        setConversations(convs);

        // If navigated with a partnerId, find or create conversation
        if (location.state?.partnerId) {
          const targetPartnerId = location.state.partnerId;
          let found = convs.find(c => c.partner?._id === targetPartnerId);
          if (!found) {
            const createdRes = await conversationAPI.createConversation(targetPartnerId);
            found = createdRes.data?.conversation;
            if (found) {
              setConversations(prev => [found, ...prev]);
            }
          }
          if (found) {
            setActiveConversationId(found._id);
            setMobilePanel('chat');
          }
        } else if (convs.length > 0 && !activeConversationId) {
          // On desktop auto-select first conversation
          if (window.innerWidth > MOBILE_BREAKPOINT) {
            setActiveConversationId(convs[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConversations();
  }, [location.state?.partnerId]);

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    if (isMobile) setMobilePanel('chat');
  };

  const handleBack = () => {
    setMobilePanel('list');
    if (isMobile) setActiveConversationId(null);
  };

  const activeConversation = conversations.find(c => c._id === activeConversationId);

  // On mobile show only one panel at a time
  const showList = !isMobile || mobilePanel === 'list';
  const showChat = !isMobile || mobilePanel === 'chat';

  return (
    <div className={`chat-page-layout ${isMobile ? 'chat-mobile' : ''}`}>
      {/* 1. Left: Conversation list */}
      {showList && (
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={() => navigate('/app/discover')}
        />
      )}

      {/* 2. Middle: Active chat window */}
      {showChat && (
        activeConversation ? (
          <ChatWindow
            key={activeConversation._id}
            conversation={activeConversation}
            onBack={handleBack}
            isMobile={isMobile}
          />
        ) : !isMobile ? (
          <div className="chat-no-selection">
            <MessageSquare size={48} className="text-tertiary mb-3" />
            <h3>Select a conversation</h3>
            <p>Choose an ongoing skill exchange chat from the list or find a new partner.</p>
            <Button onClick={() => navigate('/app/discover')} className="mt-4">
              Discover Partners
            </Button>
          </div>
        ) : null
      )}

      {/* 3. Right: Partner quick info — desktop only */}
      {!isMobile && activeConversation && (
        <aside className="chat-partner-sidebar">
          <div className="chat-sidebar-profile">
            <Avatar
              src={activeConversation.partner?.avatar}
              name={activeConversation.partner?.name}
              size="xl"
            />
            <h4 className="chat-sidebar-name">{activeConversation.partner?.name}</h4>
            <span className="text-xs text-secondary">@{activeConversation.partner?.username}</span>
          </div>

          <div className="chat-sidebar-section">
            <h5 className="chat-sidebar-heading">About</h5>
            <p className="chat-sidebar-bio">
              {activeConversation.partner?.bio || 'No bio provided.'}
            </p>
          </div>

          <div className="chat-sidebar-section">
            <h5 className="chat-sidebar-heading">Actions</h5>
            <div className="chat-sidebar-actions">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                icon={Calendar}
                onClick={() => navigate('/app/sessions', { state: { openScheduler: true, selectedPartner: activeConversation.partner } })}
              >
                Schedule Session
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                icon={Users}
                onClick={() => navigate(`/app/profile/${activeConversation.partner?._id}`)}
              >
                View Full Profile
              </Button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
