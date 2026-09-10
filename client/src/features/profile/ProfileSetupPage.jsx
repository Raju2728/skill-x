import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, BookOpen, Sparkles, Calendar, ShieldCheck, CheckCircle2,
  ArrowRight, ArrowLeft, Globe, MapPin, Award
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Toggle from '../../components/ui/Toggle';
import SkillPicker from '../skills/SkillPicker';
import AvailabilityPicker from './AvailabilityPicker';
import './ProfileSetupPage.css';

const steps = [
  { id: 1, title: 'Basic Info', icon: User, desc: 'Tell us a bit about yourself' },
  { id: 2, title: 'Teach Skills', icon: Award, desc: 'What skills can you share?' },
  { id: 3, title: 'Learn Skills', icon: BookOpen, desc: 'What do you want to learn?' },
  { id: 4, title: 'Availability', icon: Calendar, desc: 'When are you free to meet?' },
  { id: 5, title: 'Privacy & Done', icon: ShieldCheck, desc: 'Preferences and review' },
];

const languageOptions = [
  'English', 'Tamil', 'Spanish', 'French', 'German', 'Japanese',
  'Mandarin Chinese', 'Portuguese', 'Hindi', 'Arabic', 'Russian', 'Italian', 'Korean'
];

export default function ProfileSetupPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [selectedLanguages, setSelectedLanguages] = useState(user?.languages || ['English']);
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || 'intermediate');

  const [teachSkills, setTeachSkills] = useState([]);
  const [learnSkills, setLearnSkills] = useState([]);

  const [availabilitySlots, setAvailabilitySlots] = useState([
    { dayOfWeek: 1, startTime: '18:00', endTime: '21:00' },
    { dayOfWeek: 3, startTime: '18:00', endTime: '21:00' },
  ]);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const [privacySettings, setPrivacySettings] = useState({
    showEmail: false,
    showLocation: true,
    showOnlineStatus: true,
    allowDiscovery: true,
  });

  const toggleLanguage = (lang) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!bio.trim()) {
        toast.warning('Bio recommended', 'Adding a short bio helps others know your background.');
      }
    }
    if (currentStep === 2 && teachSkills.length === 0) {
      toast.warning('Add a skill to teach', 'Please select at least 1 skill you can teach.');
      return;
    }
    if (currentStep === 3 && learnSkills.length === 0) {
      toast.warning('Add a skill to learn', 'Please select at least 1 skill you want to learn.');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    try {
      // 1. Update basic profile
      await userAPI.updateProfile({
        bio,
        location,
        languages: selectedLanguages,
        experienceLevel,
        privacySettings,
        profileCompleted: true,
      });

      // 2. Sync skills
      await api.put('/users/skills/sync', {
        teachSkills,
        learnSkills,
      });

      // 3. Sync availability
      await api.put('/users/availability/sync', {
        slots: availabilitySlots,
        timezone,
      });

      await refreshUser();
      toast.success('Welcome to Skill X!', 'Your profile has been set up successfully.');
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Setup failed', err.response?.data?.message || 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-page">
      <div className="setup-container animate-fade-in-up">
        {/* Progress Bar & Header */}
        <div className="setup-header">
          <div className="setup-badge">
            <Sparkles size={16} />
            <span>Profile Onboarding</span>
          </div>
          <h1 className="setup-title">Let's set up your profile</h1>
          <p className="setup-subtitle">
            Configure your skills and schedule so our matching algorithm can connect you with compatible partners.
          </p>

          <div className="setup-stepper">
            {steps.map(step => {
              const isDone = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`stepper-item ${isCurrent ? 'stepper-active' : ''} ${isDone ? 'stepper-done' : ''}`}
                >
                  <div className="stepper-circle">
                    {isDone ? <CheckCircle2 size={16} /> : step.id}
                  </div>
                  <span className="stepper-label">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Contents */}
        <div className="setup-body">
          {currentStep === 1 && (
            <div className="setup-step-content animate-fade-in">
              <h3 className="step-heading">Tell us about yourself</h3>
              <p className="step-desc">Help your future skill exchange partners get to know you.</p>

              <div className="step-form-grid">
                <div className="input-group">
                  <label className="input-label">Short Bio</label>
                  <textarea
                    className="setup-textarea"
                    rows={4}
                    placeholder="e.g. Full-stack developer passionate about building web apps. Looking to learn Spanish and piano in exchange for coding mentorship."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>

                <Input
                  label="Location (City, Country)"
                  icon={MapPin}
                  placeholder="e.g. San Francisco, CA or London, UK"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />

                <div className="input-group">
                  <label className="input-label">General Experience Level</label>
                  <div className="experience-options">
                    {['beginner', 'intermediate', 'advanced', 'expert'].map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        className={`exp-btn ${experienceLevel === lvl ? 'exp-btn-active' : ''}`}
                        onClick={() => setExperienceLevel(lvl)}
                      >
                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Languages Spoken</label>
                  <div className="lang-tags-grid">
                    {languageOptions.map(lang => (
                      <button
                        key={lang}
                        type="button"
                        className={`lang-pill ${selectedLanguages.includes(lang) ? 'lang-pill-active' : ''}`}
                        onClick={() => toggleLanguage(lang)}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="setup-step-content animate-fade-in">
              <h3 className="step-heading">What can you teach or mentor?</h3>
              <p className="step-desc">Pick 1 to 5 skills you are comfortable sharing with others.</p>
              <SkillPicker
                title="Skills to Teach"
                type="teach"
                selectedSkills={teachSkills}
                onChange={setTeachSkills}
                maxSkills={6}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="setup-step-content animate-fade-in">
              <h3 className="step-heading">What do you want to learn?</h3>
              <p className="step-desc">Pick the skills, instruments, or languages you want to master.</p>
              <SkillPicker
                title="Skills to Learn"
                type="learn"
                selectedSkills={learnSkills}
                onChange={setLearnSkills}
                maxSkills={6}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="setup-step-content animate-fade-in">
              <h3 className="step-heading">When are you available for sessions?</h3>
              <p className="step-desc">Set your preferred days and time slots for live voice, video, or chat exchanges.</p>
              <AvailabilityPicker
                slots={availabilitySlots}
                onChange={setAvailabilitySlots}
                timezone={timezone}
                onTimezoneChange={setTimezone}
              />
            </div>
          )}

          {currentStep === 5 && (
            <div className="setup-step-content animate-fade-in">
              <h3 className="step-heading">Privacy & Review</h3>
              <p className="step-desc">Control your visibility and finish setup.</p>

              <div className="privacy-settings-box">
                <div className="privacy-item">
                  <div>
                    <h4 className="privacy-title">Public Discovery</h4>
                    <p className="privacy-desc">Allow compatible partners to discover your profile</p>
                  </div>
                  <Toggle
                    checked={privacySettings.allowDiscovery}
                    onChange={(val) => setPrivacySettings(prev => ({ ...prev, allowDiscovery: val }))}
                  />
                </div>

                <div className="privacy-item">
                  <div>
                    <h4 className="privacy-title">Show Online Status</h4>
                    <p className="privacy-desc">Display when you are active on the platform</p>
                  </div>
                  <Toggle
                    checked={privacySettings.showOnlineStatus}
                    onChange={(val) => setPrivacySettings(prev => ({ ...prev, showOnlineStatus: val }))}
                  />
                </div>

                <div className="privacy-item">
                  <div>
                    <h4 className="privacy-title">Display Location</h4>
                    <p className="privacy-desc">Show your city/country on your public profile</p>
                  </div>
                  <Toggle
                    checked={privacySettings.showLocation}
                    onChange={(val) => setPrivacySettings(prev => ({ ...prev, showLocation: val }))}
                  />
                </div>
              </div>

              {/* Summary overview */}
              <div className="setup-summary-card">
                <h4>Profile Overview</h4>
                <div className="summary-row">
                  <span>Skills to Teach:</span>
                  <strong>{teachSkills.map(s => s.name || s.skillId?.name).join(', ') || 'None selected'}</strong>
                </div>
                <div className="summary-row">
                  <span>Skills to Learn:</span>
                  <strong>{learnSkills.map(s => s.name || s.skillId?.name).join(', ') || 'None selected'}</strong>
                </div>
                <div className="summary-row">
                  <span>Active Time Slots:</span>
                  <strong>{availabilitySlots.length} slots configured</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="setup-footer">
          {currentStep > 1 && (
            <Button variant="secondary" icon={ArrowLeft} onClick={handleBack}>
              Back
            </Button>
          )}

          <div style={{ marginLeft: 'auto' }}>
            {currentStep < steps.length ? (
              <Button iconRight={ArrowRight} onClick={handleNext}>
                Continue
              </Button>
            ) : (
              <Button iconRight={Sparkles} onClick={handleCompleteSetup} loading={loading}>
                Finish & Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
