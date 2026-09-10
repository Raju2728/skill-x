import { Link } from 'react-router-dom';
import {
  ArrowRight, Users, MessageCircle, Shield, Video, BookOpen, Calendar,
  Sparkles, Zap, Globe, Star, ChevronRight, CheckCircle, Play,
  Repeat, Phone, Lock,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import './LandingPage.css';

const features = [
  {
    icon: Users,
    title: 'Smart Matching',
    description: 'AI-powered matching engine finds your perfect skill exchange partners based on complementary skills, schedules, and more.',
  },
  {
    icon: Shield,
    title: 'End-to-End Encrypted',
    description: 'All messages are encrypted with Signal-inspired E2EE protocol. Only you and your partner can read them.',
  },
  {
    icon: Video,
    title: 'HD Video Meetings',
    description: 'Built-in WebRTC video calls with screen sharing, collaborative notes, and file sharing — all in one place.',
  },
  {
    icon: Calendar,
    title: 'Session Scheduling',
    description: 'Schedule learning sessions with built-in calendar, reminders, and availability matching.',
  },
  {
    icon: MessageCircle,
    title: 'Real-Time Chat',
    description: 'Instant messaging with typing indicators, read receipts, file sharing, and voice messages.',
  },
  {
    icon: BookOpen,
    title: 'Track Progress',
    description: 'Set learning goals, track your progress, earn badges, and build your reputation through reviews.',
  },
];

const heroChips = [
  { icon: Repeat, label: 'Skill Exchange', desc: 'Share what you know, learn what you need' },
  { icon: Phone, label: 'Voice & Video Calls', desc: 'Connect with crystal clear voice and video' },
  { icon: Calendar, label: 'Scheduled Meetings', desc: 'Plan your sessions at your convenience' },
  { icon: Lock, label: 'End-to-End Encryption', desc: 'Your data and conversations stay private' },
];

const steps = [
  { num: '01', title: 'Create Your Profile', desc: 'Share what you know and what you want to learn.' },
  { num: '02', title: 'Get Matched', desc: 'Our engine finds compatible exchange partners.' },
  { num: '03', title: 'Connect & Learn', desc: 'Chat, call, and schedule sessions together.' },
  { num: '04', title: 'Grow Together', desc: 'Track progress, review sessions, and level up.' },
];

const stats = [
  { value: '50K+', label: 'Active Learners' },
  { value: '200+', label: 'Skills Available' },
  { value: '100K+', label: 'Sessions Completed' },
  { value: '4.9', label: 'Average Rating', icon: Star },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-glow hero-glow-1" />
          <div className="hero-glow hero-glow-2" />
          <div className="hero-grid" />
        </div>

        <div className="hero-inner">
          <div className="hero-content animate-fade-in-up">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>The future of peer-to-peer learning</span>
            </div>

            <h1 className="hero-title">
              Share Skills<br />
              Learn Together<br />
              <span className="hero-title-gradient">Grow Faster</span>
            </h1>

            <p className="hero-subtitle">
              Skill X is a modern platform where people exchange skills, learn from each other
              and build a better future — together.
            </p>

            <div className="hero-actions">
              <Link to="/register">
                <Button size="lg" iconRight={ArrowRight}>Get Started</Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" icon={Play}>Watch Video</Button>
              </a>
            </div>
          </div>

          <div className="hero-illustration animate-fade-in-right">
            <img
              src="/hero-illustration.jpg"
              alt="People collaborating and exchanging skills"
              className="hero-illustration-img"
            />
          </div>
        </div>

        {/* Hero Feature Chips */}
        <div className="hero-chips animate-fade-in-up">
          {heroChips.map((chip) => (
            <div key={chip.label} className="hero-chip">
              <div className="hero-chip-icon">
                <chip.icon size={20} />
              </div>
              <div className="hero-chip-text">
                <span className="hero-chip-label">{chip.label}</span>
                <span className="hero-chip-desc">{chip.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-badge">
              <Zap size={14} />
              <span>Features</span>
            </div>
            <h2 className="section-title">Everything you need to<br /><span className="text-accent">learn and teach</span></h2>
            <p className="section-subtitle">
              A complete platform for skill exchange with security, real-time communication, and intelligent tools.
            </p>
          </div>

          <div className="features-grid stagger-children">
            {features.map((feature) => (
              <div key={feature.title} className="feature-card">
                <div className="feature-icon">
                  <feature.icon size={24} />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section section-alt" id="how-it-works">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-badge">
              <Globe size={14} />
              <span>How It Works</span>
            </div>
            <h2 className="section-title">Four simple steps to<br /><span className="text-accent">start exchanging</span></h2>
          </div>

          <div className="steps-grid stagger-children">
            {steps.map((step) => (
              <div key={step.num} className="step-card">
                <span className="step-num">{step.num}</span>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section">
        <div className="section-inner">
          <div className="stats-grid stagger-children">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-block">
                <span className="stat-block-value">
                  {stat.icon && <stat.icon size={20} className="text-warning" />}
                  {stat.value}
                </span>
                <span className="stat-block-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="section-inner">
          <div className="cta-card">
            <div className="cta-glow" />
            <h2 className="cta-title">Ready to start your skill exchange journey?</h2>
            <p className="cta-subtitle">
              Join thousands of learners exchanging skills, growing together, and building meaningful connections.
            </p>
            <div className="cta-features">
              <span><CheckCircle size={16} /> Free to start</span>
              <span><CheckCircle size={16} /> No credit card required</span>
              <span><CheckCircle size={16} /> End-to-end encrypted</span>
            </div>
            <Link to="/register">
              <Button size="lg" iconRight={ChevronRight}>Create Free Account</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
