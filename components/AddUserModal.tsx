// components/AddUserModal.tsx  
// Changes vs original:
//  • Default planStatus changed from 'TRIALING' → 'INACTIVE'
//    (the API always sets INACTIVE; trialing only happens after the user activates)
//  • Status dropdown re-ordered; INACTIVE first to match actual flow
//  • After success, shows a confirmation card with "Resend Activation" button
//  • Audit notice updated to reflect actual flow
'use client';

import { useState } from 'react';
import { X, User, Mail, Building, CreditCard, Tag, CheckCircle, RefreshCw } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TIERS = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'] as const;
type Tier = typeof TIERS[number];

const TIER_META: Record<Tier, { color: string; bg: string; border: string; description: string }> = {
  BASIC:        { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   description: 'Core search & alerts' },
  PROFESSIONAL: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', description: 'Advanced analytics & exports' },
  ENTERPRISE:   { color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  description: 'Full platform + priority support' },
};

// ── Trial days presets ─────────────────────────────────────────────────────────
const TRIAL_PRESETS = [
  { label: '7 days',  value: 'TRIAL7',   days: 7  },
  { label: '14 days', value: 'TRIAL14',  days: 14 },
  { label: '30 days', value: 'TRIAL30',  days: 30 },
  { label: 'Custom',  value: 'custom',   days: 0  },
];

export default function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [firstName,      setFirstName]      = useState('');
  const [lastName,       setLastName]       = useState('');
  const [email,          setEmail]          = useState('');
  const [company,        setCompany]        = useState('');
  const [planTier,       setPlanTier]       = useState<Tier>('PROFESSIONAL');
  const [trialPreset,    setTrialPreset]    = useState('TRIAL7');
  const [customCode,     setCustomCode]     = useState('');
  const [customDays,     setCustomDays]     = useState('');
  const [error,          setError]          = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [successData,    setSuccessData]    = useState<{ email: string; name: string; tier: string; trialDays: number } | null>(null);
  const [resending,      setResending]      = useState(false);
  const [resendSuccess,  setResendSuccess]  = useState(false);

  const isCustom    = trialPreset === 'custom';
  const activeCode  = isCustom ? customCode.toUpperCase() : trialPreset;
  const activeDays  = isCustom
    ? parseInt(customDays || '0', 10)
    : TRIAL_PRESETS.find(p => p.value === trialPreset)?.days ?? 7;

  function resetForm() {
    setFirstName(''); setLastName(''); setEmail(''); setCompany('');
    setPlanTier('PROFESSIONAL'); setTrialPreset('TRIAL7');
    setCustomCode(''); setCustomDays(''); setError('');
    setSuccessData(null); setResendSuccess(false);
  }

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name:            `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          company:         company || undefined,
          plan_tier:       planTier,
          plan_status:     'INACTIVE',
          activation_code: activeCode || undefined,
          trial_days:      activeDays || 7,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setSuccessData({
        email,
        name:      `${firstName} ${lastName}`.trim(),
        tier:      planTier,
        trialDays: activeDays || 7,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!successData) return;
    setResending(true);
    try {
      const res = await fetch('/api/emails/resend-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: successData.email }),
      });
      if (res.ok) setResendSuccess(true);
    } catch { /* silent */ } finally {
      setResending(false);
    }
  };

  if (!isOpen) return null;

  const meta = TIER_META[planTier];

  // ── SUCCESS STATE ─────────────────────────────────────────────────────────
  if (successData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100">

          {/* Green header */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-10 py-10 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-11 h-11 text-white" strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">User Created!</h2>
            <p className="text-green-100 text-lg font-semibold mt-2">Activation email sent to {successData.email}</p>
          </div>

          {/* Body */}
          <div className="px-10 py-8">

            {/* User summary */}
            <div className="flex items-center gap-4 bg-slate-50 rounded-2xl px-6 py-5 mb-8 border border-slate-200">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-600 font-black text-xl">{successData.name[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900">{successData.name}</p>
                <p className="text-base text-slate-500 font-medium">{successData.email}</p>
              </div>
              <div className={`ml-auto px-4 py-2 rounded-xl text-sm font-black ${TIER_META[successData.tier as Tier]?.bg} ${TIER_META[successData.tier as Tier]?.color} ${TIER_META[successData.tier as Tier]?.border} border`}>
                {successData.tier}
              </div>
            </div>

            {/* Activation flow steps */}
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">What happens next</p>
            <div className="space-y-4 mb-8">
              {[
                { n: '1', text: `Activation email delivered to ${successData.email}`, sub: 'Link is valid for 72 hours' },
                { n: '2', text: 'User clicks "Set Password & Activate Account"', sub: 'Takes them to precisegovcon.com/activate' },
                { n: '3', text: 'User sets a secure password', sub: 'Email verified automatically at this step' },
                { n: '4', text: `Account switches to TRIALING — ${successData.trialDays}-day free trial begins`, sub: `${successData.tier} plan features unlocked immediately` },
              ].map(({ n, text, sub }) => (
                <div key={n} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-base flex-shrink-0 mt-0.5">
                    {n}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-800">{text}</p>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Resend + Done */}
            <div className="flex gap-4">
              <button
                onClick={handleResend}
                disabled={resending || resendSuccess}
                className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-slate-200 rounded-2xl text-base font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {resending
                  ? <><RefreshCw className="w-5 h-5 animate-spin" /> Sending…</>
                  : resendSuccess
                  ? <><CheckCircle className="w-5 h-5 text-emerald-500" /> Email Resent!</>
                  : <><RefreshCw className="w-5 h-5" /> Resend Activation</>
                }
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white text-base font-black rounded-2xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM STATE ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto border border-slate-100">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-8 py-5 border-b border-slate-100 rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Add New User</h2>
            <p className="text-sm font-semibold text-slate-400 mt-0.5">User receives an activation email to set their password</p>
          </div>
          <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-7">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-base font-semibold text-red-700">{error}</p>
            </div>
          )}

          {/* ── IDENTITY ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Identity</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">First Name <span className="text-red-500">*</span></label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} required disabled={isLoading}
                  placeholder="Jane"
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Last Name <span className="text-red-500">*</span></label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} required disabled={isLoading}
                  placeholder="Smith"
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all" />
              </div>
            </div>
          </div>

          {/* ── CONTACT ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading}
                  placeholder="jane@company.com"
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Company Name</label>
                <input value={company} onChange={e => setCompany(e.target.value)} disabled={isLoading}
                  placeholder="Acme Federal Solutions"
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all" />
              </div>
            </div>
          </div>

          {/* ── PLAN TIER ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan Tier</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {TIERS.map(tier => {
                const m       = TIER_META[tier];
                const active  = planTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPlanTier(tier)}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                      active
                        ? `${m.bg} ${m.border} ${m.color} shadow-sm`
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {active && (
                      <CheckCircle className={`absolute top-3 right-3 w-4 h-4 ${m.color}`} />
                    )}
                    <p className="text-base font-black mb-1">{tier.charAt(0) + tier.slice(1).toLowerCase()}</p>
                    <p className={`text-xs font-semibold leading-snug ${active ? m.color : 'text-slate-400'}`}>{m.description}</p>
                  </button>
                );
              })}
            </div>
            <p className={`mt-3 text-sm font-bold ${meta.color} ${meta.bg} ${meta.border} border px-4 py-2.5 rounded-xl`}>
              Account starts as <strong>INACTIVE</strong> — switches to <strong>TRIALING</strong> when user activates
            </p>
          </div>

          {/* ── TRIAL / CODE ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Trial Period</span>
              <span className="text-xs font-semibold text-slate-400">(optional)</span>
            </div>

            {/* Preset buttons */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {TRIAL_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setTrialPreset(p.value)}
                  className={`py-3 rounded-xl border-2 text-sm font-black transition-all ${
                    trialPreset === p.value
                      ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom code input */}
            {isCustom && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">Promo / Trial Code</label>
                  <input
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value.toUpperCase())}
                    disabled={isLoading}
                    placeholder="e.g. GOVCON30"
                    maxLength={32}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-black font-mono tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">Trial Days</label>
                  <input
                    type="number"
                    value={customDays}
                    onChange={e => setCustomDays(e.target.value)}
                    disabled={isLoading}
                    placeholder="e.g. 21"
                    min={1}
                    max={365}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            {!isCustom && (
              <p className="text-sm font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                Code <span className="font-black text-orange-600 font-mono">{activeCode}</span> will be embedded in the activation link and shown to the user in their email. Trial duration: <span className="font-black text-slate-700">{activeDays} days</span>.
              </p>
            )}
          </div>

          {/* ── WHAT HAPPENS ── */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl px-6 py-5">
            <p className="text-sm font-black text-orange-800 uppercase tracking-wider mb-4">
              What happens after you click "Create User"
            </p>
            <div className="space-y-3">
              {[
                `Account created with INACTIVE status (no password yet)`,
                `Activation email sent to ${email || 'the user'} with a 72-hour link`,
                `User clicks link → sets password → email verified → trial starts`,
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm font-semibold text-orange-900 leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={handleClose} disabled={isLoading}
              className="flex-1 h-13 py-4 border-2 border-slate-200 text-slate-700 text-base font-bold rounded-2xl hover:bg-slate-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white text-base font-black rounded-2xl transition-colors disabled:opacity-60 shadow-lg shadow-orange-500/25">
              {isLoading
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Creating User…
                  </span>
                : 'Create User & Send Email'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}