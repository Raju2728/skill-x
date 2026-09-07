import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Users, Inbox, Send, Archive, Plus, Sparkles, RefreshCw, UserCheck
} from 'lucide-react';
import { connectionAPI, exchangeAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import ConnectionCard from './ConnectionCard';
import RequestCard from './RequestCard';
import ExchangeRequestModal from './ExchangeRequestModal';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import './ConnectionsPage.css';

export default function ConnectionsPage() {
  const location = useLocation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'incoming' | 'outgoing' | 'archived'
  const [connections, setConnections] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Proposal modal state
  const [partnerToPropose, setPartnerToPropose] = useState(null);
  const [showProposeModal, setShowProposeModal] = useState(false);

  useEffect(() => {
    if (location.state?.requestPartner) {
      setPartnerToPropose(location.state.requestPartner);
      setShowProposeModal(true);
    }
  }, [location.state]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [connRes, incomingRes, outgoingRes] = await Promise.all([
        connectionAPI.getConnections({ status: activeTab === 'archived' ? 'archived' : 'active' }),
        exchangeAPI.getRequests({ type: 'incoming', status: 'pending' }),
        exchangeAPI.getRequests({ type: 'outgoing', status: 'pending' }),
      ]);

      setConnections(connRes.data?.connections || []);
      setIncomingRequests(incomingRes.data?.requests || []);
      setOutgoingRequests(outgoingRes.data?.requests || []);
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleAcceptRequest = async (id) => {
    try {
      await exchangeAPI.respond(id, 'accept');
      toast.success('Accepted!', 'Skill exchange partnership created.');
      loadData();
    } catch (err) {
      toast.error('Error', err.response?.data?.message || 'Failed to accept');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await exchangeAPI.respond(id, 'reject');
      toast.info('Declined', 'Exchange proposal declined.');
      loadData();
    } catch (err) {
      toast.error('Error', err.response?.data?.message || 'Failed to decline');
    }
  };

  const handleCancelRequest = async (id) => {
    try {
      await exchangeAPI.respond(id, 'cancel');
      toast.info('Cancelled', 'Proposal cancelled.');
      loadData();
    } catch (err) {
      toast.error('Error', err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleConnectionStatusChange = async (id, status) => {
    try {
      await connectionAPI.archive(id, status);
      toast.success('Updated', `Connection status set to ${status}.`);
      loadData();
    } catch (err) {
      toast.error('Error', 'Failed to update connection status');
    }
  };

  return (
    <div className="connections-page animate-fade-in">
      <div className="connections-header">
        <div>
          <h1 className="connections-title">Connections & Exchanges</h1>
          <p className="connections-subtitle">
            Manage your active learning partnerships and exchange requests.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/app/discover">
            <Button icon={Plus}>Find New Partners</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="connections-tabs">
        <button
          type="button"
          className={`conn-tab ${activeTab === 'active' ? 'conn-tab-active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <Users size={16} />
          <span>Active Connections</span>
          <span className="conn-tab-count">{connections.length}</span>
        </button>

        <button
          type="button"
          className={`conn-tab ${activeTab === 'incoming' ? 'conn-tab-active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          <Inbox size={16} />
          <span>Incoming Requests</span>
          {incomingRequests.length > 0 && (
            <span className="conn-tab-badge">{incomingRequests.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`conn-tab ${activeTab === 'outgoing' ? 'conn-tab-active' : ''}`}
          onClick={() => setActiveTab('outgoing')}
        >
          <Send size={16} />
          <span>Sent Proposals</span>
          <span className="conn-tab-count">{outgoingRequests.length}</span>
        </button>

        <button
          type="button"
          className={`conn-tab ${activeTab === 'archived' ? 'conn-tab-active' : ''}`}
          onClick={() => setActiveTab('archived')}
        >
          <Archive size={16} />
          <span>Archived</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <PageLoader />
      ) : (
        <div className="connections-content">
          {activeTab === 'active' && (
            connections.length === 0 ? (
              <div className="connections-empty">
                <Users size={48} className="text-tertiary mb-3" />
                <h3>No active connections yet</h3>
                <p>Propose a skill exchange or check your incoming requests to start learning together.</p>
                <Link to="/app/matches">
                  <Button icon={Sparkles} className="mt-4">View Intelligent Matches</Button>
                </Link>
              </div>
            ) : (
              <div className="connections-grid stagger-children">
                {connections.map(conn => (
                  <ConnectionCard
                    key={conn._id}
                    connection={conn}
                    onStatusChange={handleConnectionStatusChange}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'incoming' && (
            incomingRequests.length === 0 ? (
              <div className="connections-empty">
                <Inbox size={48} className="text-tertiary mb-3" />
                <h3>No pending incoming proposals</h3>
                <p>When peers want to exchange skills with you, their proposals will appear here.</p>
              </div>
            ) : (
              <div className="connections-grid stagger-children">
                {incomingRequests.map(req => (
                  <RequestCard
                    key={req._id}
                    request={req}
                    isIncoming={true}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'outgoing' && (
            outgoingRequests.length === 0 ? (
              <div className="connections-empty">
                <Send size={48} className="text-tertiary mb-3" />
                <h3>No pending proposals sent</h3>
                <p>Explore community members and propose an exchange.</p>
                <Link to="/app/discover">
                  <Button className="mt-4">Discover Peers</Button>
                </Link>
              </div>
            ) : (
              <div className="connections-grid stagger-children">
                {outgoingRequests.map(req => (
                  <RequestCard
                    key={req._id}
                    request={req}
                    isIncoming={false}
                    onCancel={handleCancelRequest}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'archived' && (
            connections.length === 0 ? (
              <div className="connections-empty">
                <Archive size={48} className="text-tertiary mb-3" />
                <h3>No archived partnerships</h3>
              </div>
            ) : (
              <div className="connections-grid stagger-children">
                {connections.map(conn => (
                  <ConnectionCard
                    key={conn._id}
                    connection={conn}
                    onStatusChange={handleConnectionStatusChange}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Propose Modal */}
      {showProposeModal && (
        <ExchangeRequestModal
          isOpen={showProposeModal}
          onClose={() => {
            setShowProposeModal(false);
            setPartnerToPropose(null);
          }}
          partner={partnerToPropose}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
