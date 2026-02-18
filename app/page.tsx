'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, ArrowLeft, Loader2, Shield, Lock } from 'lucide-react';
import LoginSidebar from '@/components/LoginSidebar';

// ─── Validation helpers ───────────────────────────────────────────────────────
function validateEmail(email: string): string {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return '';
}

function validatePassword(password: string): string {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
}

// ─── Slim Login Header ────────────────────────────────────────────────────────
function LoginHeader() {
  return (
    <header className="w-full bg-slate-900 border-b border-slate-700 px-6 py-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="PreciseGovCon" className="h-7 w-auto object-contain rounded" />
        <div className="hidden sm:block">
          <span className="text-sm font-bold text-white">Precise Govcon</span>
          <span className="ml-2 text-xs font-bold text-orange-400 bg-orange-400/10 border border-orange-400/30 px-2 py-0.5 rounded-full">
            Admin Portal
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
        <Lock className="w-3 h-3 text-orange-400" />
        <span className="hidden sm:inline">Secure Admin Access</span>
      </div>
    </header>
  );
}

// ─── Slim Login Footer ────────────────────────────────────────────────────────
function LoginFooter() {
  return (
    <footer className="w-full bg-slate-900 border-t border-slate-700 px-6 py-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-300 font-bold">
        <span>&copy; {new Date().getFullYear()} Precise Govcon. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a href="https://precisegovcon.com" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors font-bold">Website</a>
          <a href="mailto:support@precisegovcon.com" className="hover:text-orange-400 transition-colors font-bold">Support</a>
          <span className="text-slate-400 font-bold">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Shared Login Form ────────────────────────────────────────────────────────
interface LoginFormProps {
  onForgotPassword: () => void;
}

function LoginForm({ onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const emailError = touched.email ? validateEmail(email) : '';
  const passwordError = touched.password ? validatePassword(password) : '';
  const canSubmit = !isLoading && !validateEmail(email) && !validatePassword(password);

  const handleBlur = useCallback((field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Touch both fields to show all errors
    setTouched({ email: true, password: true });
    if (validateEmail(email) || validatePassword(password)) return;

    setServerError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'An error occurred during login');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {serverError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-in slide-in-from-top-2 duration-200">
          <p className="text-red-700 dark:text-red-300 text-sm font-medium">{serverError}</p>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-semibold text-slate-900 dark:text-white">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => handleBlur('email')}
          disabled={isLoading}
          className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-base disabled:opacity-60 ${
            emailError ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
          }`}
          placeholder="admin@precisegovcon.com"
          autoComplete="email"
        />
        {emailError && (
          <p className="text-xs text-red-600 dark:text-red-400 animate-in slide-in-from-top-1 duration-150">
            {emailError}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-semibold text-slate-900 dark:text-white">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur('password')}
            disabled={isLoading}
            className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-12 transition-all text-base disabled:opacity-60 ${
              passwordError ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
            }`}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {passwordError && (
          <p className="text-xs text-red-600 dark:text-red-400 animate-in slide-in-from-top-1 duration-150">
            {passwordError}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.01] active:scale-[0.99] text-base flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={onForgotPassword}
          disabled={isLoading}
          className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Forgot Password?
        </button>
      </div>
    </form>
  );
}

// ─── Forgot Password Form ─────────────────────────────────────────────────────
interface ForgotPasswordFormProps {
  onBack: () => void;
}

function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) { setMessage('Please enter your email address'); return; }

    setMessage('');
    setRecoveryLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to send recovery email. Please try again.');
        setIsSuccess(false);
        return;
      }

      setIsSuccess(true);
      setMessage('Password reset instructions have been sent to your email.');
      setRecoveryEmail('');
      setTimeout(() => onBack(), 3500);
    } catch {
      setMessage('Failed to send recovery email. Please try again.');
      setIsSuccess(false);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition"
          aria-label="Back to login"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h2>
      </div>

      <p className="text-slate-600 dark:text-slate-300 text-sm">
        Enter your email address and we'll send you instructions to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="recovery-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <input
            id="recovery-email"
            type="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            required
            disabled={recoveryLoading || isSuccess}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-60"
            placeholder="admin@precisegovcon.com"
          />
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm ${
            isSuccess
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={recoveryLoading || isSuccess}
          className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
        >
          {recoveryLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
          ) : isSuccess ? (
            'Email Sent!'
          ) : (
            <><Mail className="w-4 h-4" /> Send Recovery Email</>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const formContent = showForgotPassword ? (
    <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
  ) : (
    <>
      {/* Title */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="PreciseGovCon Logo" className="h-12 w-auto object-contain rounded" />
        </div>
        <h1 className="text-4xl font-black mb-1 text-slate-900 dark:text-white tracking-tight">
          Precise Govcon
        </h1>
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">Admin Portal</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Enterprise Management Platform</p>
      </div>

      <LoginForm onForgotPassword={() => setShowForgotPassword(true)} />

      {/* Security note */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5 text-orange-500" />
          Protected by IP whitelisting and JWT authentication
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <LoginHeader />

      <main className="flex-1 flex items-center">
        {/* Desktop: two-column */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-0 w-full h-full min-h-0 self-stretch">
          {/* Left — Form */}
          <div className="flex items-center justify-center px-8 py-4">
            <div className="w-full max-w-md">
              {formContent}
            </div>
          </div>

          {/* Right — Sidebar */}
          <div className="flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 px-8 py-4 border-l border-slate-200 dark:border-slate-700">
            <div className="w-full max-w-md">
              <LoginSidebar />
            </div>
          </div>
        </div>

        {/* Mobile: single column */}
        <div className="lg:hidden w-full flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {formContent}
          </div>
        </div>
      </main>

      <LoginFooter />
    </div>
  );
}