import { useState } from 'react';
import { Lock, ShieldCheck, QrCode, Copy, Check } from 'lucide-react';
import e2eeService from '../../lib/crypto/e2eeService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import './SecurityIndicator.css';

export default function SecurityIndicator({ partner }) {
  const { user } = useAuth();
  const toast = useToast();
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [safetyNumber, setSafetyNumber] = useState('');
  const [copied, setCopied] = useState(false);

  const handleOpenVerify = async () => {
    if (!partner?._id || !user?._id) return;
    try {
      const sn = await e2eeService.getSafetyNumber(user._id, partner._id);
      setSafetyNumber(sn);
      setShowVerifyModal(true);
    } catch (err) {
      console.error('Failed to get safety number:', err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    toast.success('Copied!', 'Safety number copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        className="security-badge-btn"
        onClick={handleOpenVerify}
        title="Messages are end-to-end encrypted. Click to verify safety numbers."
      >
        <Lock size={12} className="text-success" />
        <span>End-to-End Encrypted</span>
      </button>

      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Verify Safety Number"
        size="md"
        footer={<Button onClick={() => setShowVerifyModal(false)}>Done</Button>}
      >
        <div className="security-modal-content">
          <div className="security-modal-header">
            <div className="security-shield-icon">
              <ShieldCheck size={32} />
            </div>
            <h4>End-to-End Encryption Verification</h4>
            <p className="security-desc">
              Compare this safety number with <strong>{partner?.name}</strong> over a secure channel
              to confirm that your conversation is fully encrypted and not intercepted.
            </p>
          </div>

          <div className="safety-number-box">
            <span className="safety-number-digits">{safetyNumber}</span>
            <button
              type="button"
              className="safety-copy-btn"
              onClick={handleCopy}
              aria-label="Copy safety number"
            >
              {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="security-callout">
            <Lock size={14} className="text-success" />
            <span>
              Skill X uses client-side ECDH P-256 and AES-256-GCM encryption. The server only sees ciphertext.
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
}
