// components/AddUserModal.tsx  
// Changes vs original:
//  • Default planStatus changed from 'TRIALING' → 'INACTIVE'
//    (the API always sets INACTIVE; trialing only happens after the user activates)
//  • Status dropdown re-ordered; INACTIVE first to match actual flow
//  • After success, shows a confirmation card with "Resend Activation" button
//  • Audit notice updated to reflect actual flow
'use client';

import { useState } from 'react';
import {
  X, User, Mail, Building, CreditCard, Key, ChevronDown,
  CheckCircle, Send, RefreshCw, AlertCircle,
} from 'lucide-react';

interface AddUserModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  onSuccess:  () => void;
}

type ModalStage = 'form' | 'success';

interface CreatedUser {
  id:    string;
  email: string;
  name:  string | null;
}

export default function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [firstName,       setFirstName]       = useState('');
  const [lastName,        setLastName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [company,         setCompany]         = useState('');
  const [planTier,        setPlanTier]        = useState('PROFESSIONAL');
  const [activationCode,  setActivationCode]  = useState('');
  const [error,           setError]           = useState('');
  const [isLoading,       setIsLoading]       = useState(false);
  const [stage,           setStage]           = useState<ModalStage>('form');
  const [createdUser,     setCreatedUser]     = useState<CreatedUser | null>(null);
  const [resendLoading,   setResendLoading]   = useState(false);
  const [resendMsg,       setResendMsg]       = useState('');

  function resetForm() {
    setFirstName(''); setLastName(''); setEmail('');
    setCompany(''); setPlanTier('PROFESSIONAL'); setActivationCode('');
    setError(''); setStage('form'); setCreatedUser(null);
    setResendMsg('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          company:         company || undefined,
          plan_tier:       planTier,
          // plan_status is intentionally omitted — API always creates as INACTIVE
          activation_code: activationCode || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setCreatedUser(data.user);
      setStage('success');
      onSuccess(); // refresh user list in background
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!createdUser) return;
    setResendLoading(true);
    setResendMsg('');

    try {
      const res = await fetch('/api/emails/resend-activation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: createdUser.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend');
      setResendMsg(`✓ Activation email resent to ${createdUser.email}`);
    } catch (err) {
      setResendMsg(`✗ ${err instanceof Error ? err.message : 'Resend failed'}`);
    } finally {
      setResendLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all disabled:opacity-50";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  const TIERS = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'];

  const TIER_COLORS: Record<string, string> = {
    FREE:         'bg-slate-100 text-slate-600',
    BASIC:        'bg-blue-100 text-blue-700',
    PROFESSIONAL: 'bg-purple-100 text-purple-700',
    ENTERPRISE:   'bg-amber-100 text-amber-700',
  };

  // ── SUCCESS STATE ────────────────────────────────────────────────────────────
  if (stage === 'success' && createdUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">

          {/* Green header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-7 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
            </div>
            <h2 className="text-xl font-black text-white">User Created!</h2>
            <p className="text-emerald-100 text-sm mt-1">Activation email sent automatically</p>
          </div>

          <div className="px-8 py-6">

            {/* What happens next */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Activation Flow</p>
              <ol className="space-y-2">
                {[
                  `Email sent to ${createdUser.email}`,
                  'User clicks link → taken to /activate on PreciseGovCon',
                  'User sets their password (verifies email simultaneously)',
                  'Account switches to TRIALING · 7-day trial begins',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Resend button */}
            <p className="text-xs text-slate-500 mb-2">Didn't receive it? Resend the activation link:</p>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 text-orange-600 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 mb-3"
            >
              {resendLoading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Resend Activation Email</>
              }
            </button>

            {resendMsg && (
              <p className={`text-xs text-center mb-3 font-medium ${resendMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
                {resendMsg}
              </p>
            )}

            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-700 text-white font-bold text-sm rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM STATE ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border border-slate-200">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add New User</h2>
            <p className="text-xs text-slate-500 mt-0.5">User receives an activation email to set their password</p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Identity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identity</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First Name <span className="text-red-400 normal-case font-normal">*</span></label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} required disabled={isLoading}
                  className={inputClass} placeholder="Jane" />
              </div>
              <div>
                <label className={labelClass}>Last Name <span className="text-red-400 normal-case font-normal">*</span></label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} required disabled={isLoading}
                  className={inputClass} placeholder="Smith" />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Email Address <span className="text-red-400 normal-case font-normal">*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading}
                  className={inputClass} placeholder="jane@company.com" />
              </div>
              <div>
                <label className={labelClass}>Company Name</label>
                <input value={company} onChange={e => setCompany(e.target.value)} disabled={isLoading}
                  className={inputClass} placeholder="Acme Corporation" />
              </div>
            </div>
          </div>

          {/* Plan Tier */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Tier</span>
            </div>
            <div className="relative">
              <select value={planTier} onChange={e => setPlanTier(e.target.value)} disabled={isLoading}
                className={inputClass + " appearance-none pr-8 cursor-pointer"}>
                {TIERS.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {planTier && (
              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-semibold ${TIER_COLORS[planTier] || 'bg-slate-100 text-slate-600'}`}>
                {planTier}
              </span>
            )}
            {/* Status note — read-only, no longer editable since API controls it */}
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              Account starts as <strong className="text-slate-500">INACTIVE</strong> · switches to <strong className="text-slate-500">TRIALING</strong> when user activates
            </p>
          </div>

          {/* Activation Code */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trial / Promo Code</span>
              <span className="text-xs text-slate-400">(optional)</span>
            </div>
            <input
              value={activationCode}
              onChange={e => setActivationCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              className={inputClass + " font-mono tracking-widest"}
              placeholder="e.g. TRIAL30 or PROMO2026"
              maxLength={32}
            />
            <p className="text-xs text-slate-400 mt-1.5">
              If provided, the code is embedded in the activation link and shown to the user during activation. Recorded in the audit log.
            </p>
          </div>

          {/* Activation flow info box */}
          <div className="flex items-start gap-2.5 p-3.5 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-[9px] font-bold">!</span>
            </div>
            <div className="text-xs text-orange-700 space-y-0.5">
              <p className="font-bold">What happens after you click "Create User":</p>
              <p>1. Account created with <strong>INACTIVE</strong> status (no password yet)</p>
              <p>2. Activation email sent to <strong>{email || 'the user'}</strong> with a 72-hour link</p>
              <p>3. User clicks link → sets password → email verified → trial starts</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isLoading || !email || !firstName || !lastName}
              className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="animate-spin w-4 h-4" />
                  Creating…
                </span>
              ) : 'Create User & Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}