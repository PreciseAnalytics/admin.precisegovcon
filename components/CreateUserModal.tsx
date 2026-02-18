'use client';

import { useState } from 'react';
import { X, Copy, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type InvitationType = 'direct' | 'email-code' | 'bulk-credential';

interface GeneratedCredentials {
  email: string;
  temporaryPassword?: string;
  activationCode?: string;
  expiresAt?: string;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [step, setStep] = useState<'form' | 'credentials'>('form');
  const [invitationType, setInvitationType] = useState<InvitationType>('direct');

  // Form fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [planTier, setPlanTier] = useState('BASIC');

  // Bulk credential fields
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkCompanyName, setBulkCompanyName] = useState('');

  // State
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredentials[]>([]);

  const handleCreateSingleUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate session first
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        throw new Error('Session expired. Please log in again.');
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          company: company || undefined,
          plan_tier: planTier,
          plan_status: invitationType === 'direct' ? 'active' : 'pending',
          invitation_type: invitationType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      // Show credentials if returned
      if (data.credentials) {
        setCredentials([data.credentials]);
        setStep('credentials');
        toast.success('User created! Share credentials with user.');
      } else {
        toast.success('User created successfully!');
        resetForm();
        onSuccess();
        onClose();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBulkCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate session first
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        throw new Error('Session expired. Please log in again.');
      }

      const count = parseInt(bulkCount);
      if (count < 1 || count > 100) {
        throw new Error('Bulk credential count must be between 1 and 100');
      }

      const response = await fetch('/api/users/bulk-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterpriseName: bulkCompanyName,
          planTier: planTier,
          count: count,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate credentials');
      }

      setCredentials(data.credentials);
      setStep('credentials');
      toast.success(`Generated ${count} credential sets!`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const downloadAsCSV = () => {
    const csv = generateCredentialsCSV(credentials);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentials-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Credentials downloaded as CSV!');
  };

  const resetForm = () => {
    setStep('form');
    setEmail('');
    setName('');
    setCompany('');
    setPlanTier('BASIC');
    setBulkCount('10');
    setBulkCompanyName('');
    setCredentials([]);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleContinueAfterCredentials = () => {
    resetForm();
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {step === 'form'
              ? invitationType === 'bulk-credential'
                ? 'Generate Bulk Credentials'
                : 'Create New User'
              : 'Share Credentials'}
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'form' ? (
          // Form Step
          <div className="p-6 space-y-6">
            {/* Invitation Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Invitation Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'direct', label: 'Direct', desc: 'Temp password' },
                  { id: 'email-code', label: 'Email Code', desc: 'Activation link' },
                  { id: 'bulk-credential', label: 'Bulk', desc: 'Enterprise' },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => {
                      setInvitationType(method.id as InvitationType);
                      setError('');
                    }}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      invitationType === method.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-900 dark:text-white">
                      {method.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {method.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {invitationType === 'bulk-credential' ? (
              // Bulk Credentials Form
              <form onSubmit={handleGenerateBulkCredentials} className="space-y-4">
                <div>
                  <label htmlFor="bulkCompany" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Enterprise Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bulkCompany"
                    type="text"
                    value={bulkCompanyName}
                    onChange={(e) => setBulkCompanyName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Acme Corporation"
                  />
                </div>

                <div>
                  <label htmlFor="bulkCount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Number of Credentials (1-100) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bulkCount"
                    type="number"
                    min="1"
                    max="100"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 Bulk credentials are perfect for enterprise tier teams. Each set includes a temporary email-based login.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Generating...' : 'Generate Credentials'}
                  </button>
                </div>
              </form>
            ) : (
              // Single User Form
              <form onSubmit={handleCreateSingleUser} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Company Name
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Acme Corporation"
                  />
                </div>

                <div>
                  <label htmlFor="planTier" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Subscription Tier <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="planTier"
                    value={planTier}
                    onChange={(e) => setPlanTier(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="FREE">Free Tier</option>
                    <option value="BASIC">Basic Tier</option>
                    <option value="PROFESSIONAL">Professional Tier</option>
                    <option value="ENTERPRISE">Enterprise Tier</option>
                  </select>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    {invitationType === 'direct'
                      ? '🔐 User will receive credentials directly to log in immediately'
                      : '📧 User will receive an activation email to set their own password'}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          // Credentials Display Step
          <div className="p-6 space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                ✅ {credentials.length} credential set{credentials.length !== 1 ? 's' : ''} generated successfully!
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {credentials.map((cred, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg space-y-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Email
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded text-sm text-slate-900 dark:text-white break-all">
                        {cred.email}
                      </code>
                      <button
                        onClick={() => copyToClipboard(cred.email)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                        title="Copy email"
                      >
                        <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </button>
                    </div>
                  </div>

                  {cred.temporaryPassword && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Temporary Password
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded text-sm text-slate-900 dark:text-white break-all font-mono">
                          {cred.temporaryPassword}
                        </code>
                        <button
                          onClick={() => copyToClipboard(cred.temporaryPassword!)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                          title="Copy password"
                        >
                          <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </button>
                      </div>
                    </div>
                  )}

                  {cred.activationCode && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Activation Link Expires
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        {cred.expiresAt ? new Date(cred.expiresAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={downloadAsCSV}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
              <button
                onClick={handleContinueAfterCredentials}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function generateCredentialsCSV(credentials: GeneratedCredentials[]): string {
  let csv = 'Email,Temporary Password,Activation Code,Expires At\n';

  credentials.forEach(cred => {
    const password = cred.temporaryPassword ? `"${cred.temporaryPassword}"` : '""';
    const code = cred.activationCode ? `"${cred.activationCode}"` : '""';
    const expires = cred.expiresAt || '';
    csv += `"${cred.email}",${password},${code},"${expires}"\n`;
  });

  return csv;
}
