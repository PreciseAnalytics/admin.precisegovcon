// components/AdminProfileSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, User, Mail, Phone, Building2,
  Shield, Save, Loader2, CheckCircle, AlertCircle, KeyRound, Camera
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileData {
  name: string;
  email: string;
  phone: string;
  title: string;
  department: string;
  avatarInitials: string;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────
function Field({
  label, id, type = 'text', value, onChange, placeholder, disabled, icon: Icon, required
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; icon?: React.ElementType; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
            bg-white dark:bg-slate-700 text-slate-900 dark:text-white
            placeholder-slate-400 dark:placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
            disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm
            ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  );
}

// ─── Password Field ───────────────────────────────────────────────────────────
function PasswordField({
  label, id, value, onChange, placeholder, disabled, show, onToggle
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; show: boolean; onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-10 pr-12 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
            bg-white dark:bg-slate-700 text-slate-900 dark:text-white
            placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500
            focus:border-transparent disabled:opacity-60 transition-all text-sm"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────
function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const styles = type === 'success'
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${styles}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ─── Profile Info Section ─────────────────────────────────────────────────────
function ProfileInfoForm() {
  const [profile, setProfile] = useState<ProfileData>({
    name: '', email: '', phone: '', title: '', department: '', avatarInitials: 'AD',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const r = await fetch('/api/auth/profile');
        if (r.ok) {
          const d = await r.json();
          setProfile({
            name: d.name || '',
            email: d.email || '',
            phone: d.phone || '',
            title: d.title || '',
            department: d.department || '',
            avatarInitials: (d.name || 'AD').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          });
        }
      } catch { /* use defaults */ }
      finally { setIsLoading(false); }
    }
    loadProfile();
  }, []);

  const set = (field: keyof ProfileData) => (value: string) => {
    setProfile(p => ({ ...p, [field]: value }));
    setAlert(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim()) { setAlert({ type: 'error', message: 'Name is required.' }); return; }
    if (!profile.email.trim()) { setAlert({ type: 'error', message: 'Email is required.' }); return; }

    setIsSaving(true);
    setAlert(null);
    try {
      const r = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          title: profile.title,
          department: profile.department,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to save profile');
      setAlert({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = profile.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">{initials}</span>
          </div>
          <button
            type="button"
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 hover:bg-slate-600 transition-colors"
            title="Change avatar (coming soon)"
          >
            <Camera className="w-3 h-3 text-white" />
          </button>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{profile.name || 'Admin User'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{profile.email || 'admin@precisegovcon.com'}</p>
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-0.5">
            {profile.title || 'Administrator'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" id="name" value={profile.name} onChange={set('name')} placeholder="John Smith" icon={User} required disabled={isSaving} />
            <Field label="Email Address" id="email" value={profile.email} onChange={() => {}} placeholder="admin@precisegovcon.com" icon={Mail} disabled type="email" />
            <Field label="Phone Number" id="phone" value={profile.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" icon={Phone} type="tel" disabled={isSaving} />
            <Field label="Job Title" id="title" value={profile.title} onChange={set('title')} placeholder="Senior Administrator" icon={User} disabled={isSaving} />
            <Field label="Department" id="department" value={profile.department} onChange={set('department')} placeholder="Operations" icon={Building2} disabled={isSaving} />
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Mail className="w-3 h-3" /> Email address can only be changed by a super admin.
          </p>

          {alert && <Alert type={alert.type} message={alert.message} />}

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600
              text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg
              disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      )}
    </form>
  );
}

// ─── Change Password Section ──────────────────────────────────────────────────
function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent]     = useState('');
  const [newPw,   setNewPw]       = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showCur, setShowCur]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [showCon, setShowCon]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert]         = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password strength
  const strength = (() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 8)  s++;
    if (newPw.length >= 12) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength] || '';
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'][strength] || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (newPw !== confirm)       { setAlert({ type: 'error', message: "New passwords don't match." }); return; }
    if (newPw.length < 8)        { setAlert({ type: 'error', message: 'Password must be at least 8 characters.' }); return; }

    setIsLoading(true);
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw, confirmPassword: confirm }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to change password');

      setAlert({ type: 'success', message: 'Password changed! Logging you out for security…' });
      setCurrent(''); setNewPw(''); setConfirm('');

      setTimeout(async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
      }, 2500);
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordField label="Current Password" id="currentPw" value={current} onChange={setCurrent} placeholder="Enter your current password" disabled={isLoading} show={showCur} onToggle={() => setShowCur(p => !p)} />

      <PasswordField label="New Password" id="newPw" value={newPw} onChange={(v) => { setNewPw(v); setAlert(null); }} placeholder="At least 8 characters" disabled={isLoading} show={showNew} onToggle={() => setShowNew(p => !p)} />

      {/* Strength meter */}
      {newPw && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= strength ? strengthColor : '#e2e8f0' }} />
            ))}
          </div>
          <p className="text-xs font-medium" style={{ color: strengthColor }}>{strengthLabel}</p>
        </div>
      )}

      <PasswordField label="Confirm New Password" id="confirmPw" value={confirm} onChange={(v) => { setConfirm(v); setAlert(null); }} placeholder="Re-enter new password" disabled={isLoading} show={showCon} onToggle={() => setShowCon(p => !p)} />

      {/* Requirements */}
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
        <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">Password requirements:</p>
        {[
          { check: newPw.length >= 8, label: 'At least 8 characters' },
          { check: /[A-Z]/.test(newPw), label: 'One uppercase letter' },
          { check: /[0-9]/.test(newPw), label: 'One number' },
          { check: /[^A-Za-z0-9]/.test(newPw), label: 'One special character (recommended)' },
        ].map(({ check, label }) => (
          <p key={label} className={`flex items-center gap-1.5 ${check ? 'text-green-600 dark:text-green-400' : ''}`}>
            <span>{check ? '✓' : '○'}</span> {label}
          </p>
        ))}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} />}

      <button
        type="submit"
        disabled={isLoading}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600
          text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg
          disabled:opacity-60 disabled:cursor-not-allowed text-sm"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
        {isLoading ? 'Changing Password…' : 'Change Password'}
      </button>
    </form>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function AdminProfileSection() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Section title="Profile Information" icon={User}>
        <ProfileInfoForm />
      </Section>

      <Section title="Change Password" icon={KeyRound}>
        <ChangePasswordForm />
      </Section>
    </div>
  );
}