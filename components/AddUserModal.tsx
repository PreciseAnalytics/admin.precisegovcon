// components/AddUserModal.tsx
'use client';

import { useState } from 'react';
import { X, User, Mail, Building, CreditCard, Key, ChevronDown } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [email, setEmail]             = useState('');
  const [company, setCompany]         = useState('');
  const [planTier, setPlanTier]       = useState('PROFESSIONAL');
  const [planStatus, setPlanStatus]   = useState('TRIALING');
  const [activationCode, setActivationCode] = useState('');
  const [error, setError]             = useState('');
  const [isLoading, setIsLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          company: company || undefined,
          plan_tier: planTier,
          plan_status: planStatus,
          activation_code: activationCode || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create user');

      // Reset
      setFirstName(''); setLastName(''); setEmail('');
      setCompany(''); setPlanTier('PROFESSIONAL');
      setPlanStatus('TRIALING'); setActivationCode('');

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  const TIERS = ['FREE','BASIC','PROFESSIONAL','ENTERPRISE'];
  const STATUSES = ['INACTIVE','ACTIVE','TRIALING','PAST_DUE','CANCELED','UNPAID'];

  const TIER_COLORS: Record<string, string> = {
    FREE: 'bg-slate-100 text-slate-600',
    BASIC: 'bg-blue-100 text-blue-700',
    PROFESSIONAL: 'bg-purple-100 text-purple-700',
    ENTERPRISE: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border border-slate-200">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add New User</h2>
            <p className="text-xs text-slate-500 mt-0.5">All actions are logged to the audit trail</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <X className="w-3 h-3 text-red-600" />
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Section: Identity */}
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

          {/* Section: Contact */}
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

          {/* Section: Subscription */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscription</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tier</label>
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
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <div className="relative">
                  <select value={planStatus} onChange={e => setPlanStatus(e.target.value)} disabled={isLoading}
                    className={inputClass + " appearance-none pr-8 cursor-pointer"}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Activation Code */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activation / Trial Code</span>
              <span className="text-xs text-slate-400">(optional)</span>
            </div>
            <input value={activationCode} onChange={e => setActivationCode(e.target.value.toUpperCase())} disabled={isLoading}
              className={inputClass + " font-mono tracking-widest"} placeholder="e.g. TRIAL30 or PROMO2026" maxLength={32} />
            <p className="text-xs text-slate-400 mt-1.5">If provided, this code will be recorded in the audit log alongside the subscription tier assignment.</p>
          </div>

          {/* Audit notice */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-[9px] font-bold">i</span>
            </div>
            <p className="text-xs text-blue-700">
              Creating this user will generate an <strong>ADD_USER</strong> audit log entry recording your admin identity, the assigned tier (<strong>{planTier}</strong>), status (<strong>{planStatus}</strong>){activationCode ? `, and activation code` : ''}.
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating...
                </span>
              ) : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}