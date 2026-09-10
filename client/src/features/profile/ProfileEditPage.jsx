import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Award, BookOpen, Calendar, Shield, Save, ArrowLeft,
  Camera, MapPin, Globe, Check, Trash2, Upload
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ImageCropModal } from '../../components/ui';
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
  'English', 'Tamil', 'Spanish', 'French', 'German', 'Japanese',
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

  // Avatar upload & cropper states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropRawSrc, setCropRawSrc] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please select an image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', 'Image size must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropRawSrc(reader.result);
      setCropModalOpen(true);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob) => {
    setUploadingAvatar(true);
    try {
      const { data } = await userAPI.uploadAvatar(croppedBlob);
      setAvatar(data.avatarUrl);
      await refreshUser();
      setCropModalOpen(false);
      toast.success('Avatar updated', 'Your new profile photo has been cropped and saved.');
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      toast.error('Upload failed', err.response?.data?.message || 'Could not upload avatar image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    toast.info('Avatar removed', 'Initials will be shown as your profile avatar.');
  };

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
            <div className="edit-avatar-preview-wrap">
              <Avatar src={avatar} name={name} size="xl" />
              {avatar && (
                <button
                  type="button"
                  className="edit-avatar-remove-btn"
                  onClick={handleRemoveAvatar}
                  title="Remove custom photo"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="edit-avatar-controls">
              <h4 className="edit-avatar-title">Profile Photo</h4>
              <p className="edit-avatar-desc">
                Upload a photo to help exchange partners recognize you. You can crop, zoom, and reposition your photo before saving.
              </p>
              <div className="edit-avatar-btn-group">
                <Button
                  type="button"
                  icon={Camera}
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploadingAvatar}
                  size="sm"
                >
                  Upload Photo
                </Button>
                {avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={handleRemoveAvatar}
                  >
                    Remove Photo
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
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
        <div className="edit-bottom-actions">
          <Button variant="secondary" onClick={() => navigate('/app/profile')}>
            Cancel
          </Button>
          <Button icon={Save} onClick={handleSaveAll} loading={saving}>
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropRawSrc}
        onCropComplete={handleCropComplete}
        onClose={() => setCropModalOpen(false)}
        cropShape="round"
        title="Crop Profile Photo"
        loading={uploadingAvatar}
      />
    </div>
  );
}
