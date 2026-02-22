//app/dashboard/settings/page.tsx

'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import {
  User, KeyRound, Shield, Bell, Globe, ChevronRight, Save, Edit3,
  Lock, Smartphone, Clock, Activity, CheckCircle, AlertCircle,
  Camera, Trash2, Eye, EyeOff, Upload, X, Loader2,
} from 'lucide-react';

type Tab = 'profile' | 'password' | 'security' | 'notifications';

const tabs: { id: Tab; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { id: 'profile',       label: 'My Profile',       icon: User,     desc: 'Name, photo, title', color: 'orange' },
  { id: 'password',      label: 'Password',          icon: KeyRound, desc: 'Change credentials',  color: 'violet' },
  { id: 'security',      label: 'Security & 2FA',    icon: Shield,   desc: 'Sessions, IP, 2FA',   color: 'blue' },
  { id: 'notifications', label: 'Notifications',     icon: Bell,     desc: 'Alert preferences',   color: 'emerald' },
];

// ─── Profile Tab with Photo Upload ────────────────────────────────────────────
function ProfileTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Admin',
    email: 'admin@precisegovcon.com',
    phone: '',
    title: 'System Administrator',
    company: 'Precise Analytics LLC',
    timezone: 'America/New_York',
  });

  // Load avatar on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin_avatar');
    if (saved) setAvatarUrl(saved);
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarUrl(dataUrl);
      localStorage.setItem('admin_avatar', dataUrl);
      // Dispatch event so Header picks it up immediately
      window.dispatchEvent(new Event('avatar_updated'));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setAvatarUrl(null);
    localStorage.removeItem('admin_avatar');
    window.dispatchEvent(new Event('avatar_updated'));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call — replace with real endpoint
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold">
          <CheckCircle className="w-4 h-4" /> Profile saved successfully
        </div>
      )}

      {/* Photo Upload Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center gap-3">
          <Camera className="w-5 h-5 text-white" />
          <h3 className="font-bold text-white">Profile Photo</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-6">
            {/* Avatar Preview */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center overflow-hidden ring-4 ring-orange-100 shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              {/* Hover overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 w-24 h-24 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Upload Controls */}
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Upload a profile photo</p>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG or GIF. Max 5MB. Square images work best.</p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </button>
                {avatarUrl && (
                  <button
                    onClick={removePhoto}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Personal Information</h3>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 rounded-lg transition"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: 'Full Name',  key: 'name',     placeholder: 'Your full name' },
              { label: 'Email',      key: 'email',    placeholder: 'admin@example.com', disabled: true },
              { label: 'Phone',      key: 'phone',    placeholder: '+1 (555) 123-4567' },
              { label: 'Job Title',  key: 'title',    placeholder: 'System Administrator' },
              { label: 'Company',    key: 'company',  placeholder: 'Your company' },
              { label: 'Timezone',   key: 'timezone', placeholder: 'America/New_York' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{field.label}</label>
                <input
                  type="text"
                  value={(profile as any)[field.key]}
                  onChange={e => setProfile({ ...profile, [field.key]: e.target.value })}
                  disabled={!isEditing || field.disabled}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Password Tab ──────────────────────────────────────────────────────────────
function PasswordTab() {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSave = async () => {
    if (!current || !newPw || !confirm) { setMessage({ type: 'err', text: 'All fields are required' }); return; }
    if (newPw.length < 6) { setMessage({ type: 'err', text: 'New password must be at least 6 characters' }); return; }
    if (newPw !== confirm) { setMessage({ type: 'err', text: 'Passwords do not match' }); return; }

    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setMessage({ type: 'ok', text: 'Password changed successfully' });
      setCurrent(''); setNewPw(''); setConfirm('');
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const pwField = (label: string, value: string, onChange: (v: string) => void, key: 'current' | 'new' | 'confirm') => (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={show[key] ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-2.5 pr-12 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
          placeholder="••••••••"
        />
        <button type="button" onClick={() => setShow({ ...show, [key]: !show[key] })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden max-w-2xl">
      <div className="bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-4 flex items-center gap-3">
        <Lock className="w-5 h-5 text-white" />
        <h3 className="font-bold text-white">Change Password</h3>
      </div>
      <div className="p-6 space-y-5">
        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
            message.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}
        {pwField('Current Password', current, setCurrent, 'current')}
        {pwField('New Password', newPw, setNewPw, 'new')}
        {pwField('Confirm New Password', confirm, setConfirm, 'confirm')}

        {newPw && confirm && (
          <div className={`flex items-center gap-2 text-sm font-semibold ${newPw === confirm ? 'text-emerald-600' : 'text-red-500'}`}>
            {newPw === confirm ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {newPw === confirm ? 'Passwords match' : 'Passwords do not match'}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}

// ─── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab() {
  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'IP Whitelisting', status: 'Enabled', gradient: 'from-emerald-500 to-emerald-600', icon: Globe },
          { label: 'Session Timeout', status: '7 days',  gradient: 'from-blue-500 to-blue-600',      icon: Clock },
          { label: 'Audit Logging',   status: 'Active',  gradient: 'from-violet-500 to-violet-600',   icon: Activity },
        ].map(({ label, status, gradient, icon: Icon }) => (
          <div key={label} className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium text-white/80">{label}</p>
            <p className="text-xl font-black">{status}</p>
          </div>
        ))}
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-white" />
          <h3 className="font-bold text-white">Two-Factor Authentication (2FA)</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">2FA is not yet enabled</p>
              <p className="text-xs text-amber-700 mt-1">Add an extra layer of security via authenticator app or SMS.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group">
              <Smartphone className="w-8 h-8 text-slate-300 group-hover:text-blue-500 mx-auto mb-2 transition-colors" />
              <p className="text-sm font-semibold text-slate-700">Authenticator App</p>
              <p className="text-xs text-slate-400 mt-1">Google Authenticator, Authy</p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">Coming Soon</span>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group">
              <Bell className="w-8 h-8 text-slate-300 group-hover:text-blue-500 mx-auto mb-2 transition-colors" />
              <p className="text-sm font-semibold text-slate-700">SMS / Phone</p>
              <p className="text-xs text-slate-400 mt-1">Verify via text message</p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Lock className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Active Sessions</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Current Session</p>
                <p className="text-xs text-slate-500">Chrome · Windows · Richmond, VA</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active Now</span>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
            Sessions expire after 7 days of inactivity.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    newUser: true,
    subscription: true,
    auditAlert: false,
    campaignComplete: true,
    systemAlert: true,
  });

  const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const items = [
    { key: 'newUser' as const,          label: 'New User Registrations',  desc: 'Alert when a new user signs up' },
    { key: 'subscription' as const,     label: 'Subscription Changes',    desc: 'Upgrades, downgrades, cancellations' },
    { key: 'auditAlert' as const,       label: 'Audit Log Alerts',        desc: 'Suspicious admin activity' },
    { key: 'campaignComplete' as const, label: 'Campaign Completed',      desc: 'Email campaign send finished' },
    { key: 'systemAlert' as const,      label: 'System Alerts',           desc: 'Errors and downtime notices' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 flex items-center gap-3">
        <Bell className="w-5 h-5 text-white" />
        <h3 className="font-bold text-white">Notification Preferences</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                prefs[key] ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                prefs[key] ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition">
          <Save className="w-4 h-4" />
          Save Preferences
        </button>
      </div>
    </div>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Support hash-based navigation
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as Tab;
    if (hash && tabs.find(t => t.id === hash)) setActiveTab(hash);
  }, []);

  const tabColors: Record<string, { bg: string; text: string; border: string }> = {
    orange:  { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-4 border-orange-500 px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <span>Admin Portal</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white font-medium">Settings</span>
        </div>
        <h1 className="text-3xl font-black text-white">Account Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your profile, security, and preferences</p>
      </div>

      <div className="px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar tabs */}
          <aside className="lg:w-60 flex-shrink-0">
            <nav className="space-y-1.5 bg-white rounded-2xl border border-slate-200 p-3 lg:sticky lg:top-20 shadow-sm">
              {tabs.map(({ id, label, icon: Icon, desc, color }) => {
                const active = activeTab === id;
                const c = tabColors[color];
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      window.history.replaceState(null, '', `#${id}`);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      active ? `${c.bg} ${c.text}` : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      active ? `${c.bg} ${c.text}` : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{label}</p>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile'       && <ProfileTab />}
            {activeTab === 'password'      && <PasswordTab />}
            {activeTab === 'security'      && <SecurityTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}