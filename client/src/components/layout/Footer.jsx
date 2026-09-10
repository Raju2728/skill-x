import { Globe, Share2, MessageCircle, Phone, Video, FileText, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import './Footer.css';

const featureIcons = [
  { icon: MessageCircle, label: 'Chat', desc: 'Connect instantly' },
  { icon: Phone, label: 'Voice Call', desc: 'Crystal clear audio' },
  { icon: Video, label: 'Video Meet', desc: 'Face to face' },
  { icon: FileText, label: 'Notes', desc: 'Capture your ideas' },
  { icon: Shield, label: 'Secure', desc: 'End-to-End Encrypted' },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        {/* Feature Icons Row */}
        <div className="footer-features-row">
          {featureIcons.map((f) => (
            <div key={f.label} className="footer-feature-item">
              <div className="footer-feature-icon">
                <f.icon size={22} />
              </div>
              <span className="footer-feature-label">{f.label}</span>
              <span className="footer-feature-desc">{f.desc}</span>
            </div>
          ))}
        </div>

        <div className="footer-cta-banner">
          <div className="footer-cta-content">
            <h3 className="footer-cta-title">Start your journey with Skill X</h3>
            <p className="footer-cta-subtitle">Different Skills, Same goal → Better You</p>
          </div>
          <Link to="/register">
            <Button size="lg" iconRight={ArrowRight}>Let's Get Started</Button>
          </Link>
        </div>

        <div className="footer-main">
          <div className="footer-brand">
            <Logo size="md" />
            <p className="footer-tagline">
              Exchange Skills · Learn · Grow
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4 className="footer-col-title">Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="footer-col">
              <h4 className="footer-col-title">Company</h4>
              <a href="#about">About</a>
              <a href="#blog">Blog</a>
              <a href="#careers">Careers</a>
            </div>
            <div className="footer-col">
              <h4 className="footer-col-title">Support</h4>
              <a href="#help">Help Center</a>
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Skill X. Crafted with passion for peer learning.</p>
          <div className="footer-social">
            <a href="#" aria-label="Website"><Globe size={18} /></a>
            <a href="#" aria-label="Community"><Share2 size={18} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
