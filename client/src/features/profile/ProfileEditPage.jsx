import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Award, BookOpen, Calendar, Shield, Save, ArrowLeft,
  Camera, MapPin, Globe, Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Toggle from '../../components/ui/Toggle';
import Tabs from '../../components/ui/Tabs';
import SkillPicker from '../skills/SkillPicker';
import AvailabilityPicker from './AvailabilityPicker';
import { PageLoader } from '../../components/ui/Spinner';
import './ProfileEditPage.css';

const languageOptions = [
  'English', 'Spanish', 'French', 'German', 'Japanese',
  'Mandarin Chinese', 'Portuguese', 'Hindi', 'Arabic', 'Russian', 'Italian', 'Korean'
];

export default function ProfileEditPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('intermediate');
  const [languages, setLanguages] = useState([]);

  const [teachSkills, setTeachSkills] = useState([]);
  const [learnSkills, setLearnSkills] = useState([]);

  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [timezone, setTimezone] = useState('UTC');

  const [privacySettings, setPrivacySettings] = useState({
    showEmail: false,
    showLocation: true,
    showOnlineStatus: true,
    allowDiscovery: true,
  });

  useEffect(() => {
    async function loadFullProfile() {
      if (!user?._id) return;
      try {
        setLoading(true);
        const { data } = await userAPI.getProfile(user._id);
        const u = data.user;
        setName(u.name || '');
        setBio(u.bio || '');
        setLocation(u.location || '');
        setAvatar(u.avatar || '');
        setExperienceLevel(u.experienceLevel || 'intermediate');
        setLanguages(u.languages || ['English']);
        setPrivacySettings(u.privacySettings || {
          showEmail: false, showLocation: true, showOnlineStatus: true, allowDiscovery: true
        });

        setTeachSkills(data.teachSkills || []);
        setLearnSkills(data.learnSkills || []);
        setAvailabilitySlots(data.availability || []);
        if (data.availability?.[0]?.timezone) {
          setTimezone(data.availability[0].timezone);
        }
      } catch (err) {
        console.error(err);
        toast.error('Load failed', 'Could not load your profile details.');
      } finally {
        setLoading(false);
      }
    }
    loadFullProfile();
  }, [user?._id, toast]);

  const toggleLanguage = (lang) => {
    if (languages.includes(lang)) {
      if (languages.length > 1) setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. Update basic profile
      await userAPI.updateProfile({
        name,
        bio,
        location,
        avatar,
        experienceLevel,
        languages,
        privacySettings,
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
      toast.success('Profile updated', 'Your changes have been saved successfully.');
      navigate('/app/profile');
    } catch (err) {
      console.error(err);
      toast.error('Save failed', err.response?.data?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const tabs = [
    {
      id: 'basic',
      label: 'Basic Info',
      icon: User,
      content: (
        <div className="edit-tab-panel animate-fade-in">
          <div className="edit-avatar-section">
            <Avatar src={avatar} name={name} size="xl" />
            <div className="edit-avatar-inputs">
              <Input
                label="Avatar Image URL"
                placeholder="https://example.com/avatar.jpg"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                hint="Paste an image link or leave empty to use your initials"
              />
            </div>
          </div>

          <div className="edit-form-grid">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />

            <Input
              label="Location"
              icon={MapPin}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
            />

            <div className="input-group">
              <label className="input-label">Bio</label>
              <textarea
                className="setup-textarea"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community about yourself and your learning goals..."
              />
            </div>

            <div className="input-group">
              <label className="input-label">Experience Level</label>
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

            <div className="input-group" style={{ marginTop: 'var(--space-2)' }}>
              <label className="input-label">Languages Spoken</label>
              <div className="lang-tags-grid">
                {languageOptions.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    className={`lang-pill ${languages.includes(lang) ? 'lang-pill-active' : ''}`}
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'teach',
      label: 'Skills to Teach',
      icon: Award,
      content: (
        <div className="edit-tab-panel animate-fade-in">
          <SkillPicker
            title="Skills You Can Teach & Mentor"
            type="teach"
            selectedSkills={teachSkills}
            onChange={setTeachSkills}
            maxSkills={10}
          />
        </div>
      ),
    },
    {
      id: 'learn',
      label: 'Skills to Learn',
      icon: BookOpen,
      content: (
        <div className="edit-tab-panel animate-fade-in">
          <SkillPicker
            title="Skills You Want to Master"
            type="learn"
            selectedSkills={learnSkills}
            onChange={setLearnSkills}
            maxSkills={10}
          />
        </div>
      ),
    },
    {
      id: 'schedule',
      label: 'Availability',
      icon: Calendar,
      content: (
        <div className="edit-tab-panel animate-fade-in">
          <AvailabilityPicker
            slots={availabilitySlots}
            onChange={setAvailabilitySlots}
            timezone={timezone}
            onTimezoneChange={setTimezone}
          />
        </div>
      ),
    },
    {
      id: 'privacy',
      label: 'Privacy Settings',
      icon: Shield,
      content: (
        <div className="edit-tab-panel animate-fade-in">
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
        </div>
      ),
    },
  ];

  return (
    <div className="profile-edit-page">
      <div className="edit-header-row">
        <div className="edit-header-left">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/app/profile')}>
            Back to Profile
          </Button>
          <h1 className="edit-page-title">Edit Profile</h1>
        </div>
        <Button icon={Save} onClick={handleSaveAll} loading={saving}>
          Save Changes
        </Button>
      </div>

      <Card variant="surface" padding="none" className="edit-card-wrapper">
        <Tabs tabs={tabs} defaultTab="basic" />
      </Card>
    </div>
  );
}
