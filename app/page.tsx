'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, ArrowLeft, Loader2, Shield, Lock, Lightbulb } from 'lucide-react';
import LoginSidebar from '@/components/LoginSidebar';

function validateEmail(e: string) {
  if (!e) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Enter a valid email address';
  return '';
}
function validatePassword(p: string) {
  if (!p) return 'Password is required';
  if (p.length < 6) return 'Password must be at least 6 characters';
  return '';
}

// ─── Daily Inspiration (inline, for left panel) ────────────────────────────
const QUOTES = [
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The best revenge is massive success.", author: "Frank Sinatra" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Success is not how high you climbed, but how you make a difference.", author: "Roy T. Bennett" },
];
function getDailyQuote() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const day = Math.floor((Date.now() - start.getTime()) / 86400000);
  return QUOTES[day % QUOTES.length];
}

function DailyInspiration() {
  const q = getDailyQuote();
  return (
    <div className="rounded-xl p-4 border-2 border-amber-400 flex gap-3" style={{ background:'#fef3c7' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'#f59e0b' }}>
        <Lightbulb className="w-5 h-5 text-white"/>
      </div>
      <div>
        <p className="text-base font-black text-slate-900 italic leading-snug">&ldquo;{q.text}&rdquo;</p>
        <p className="text-sm font-black text-orange-700 mt-2">&mdash; {q.author}</p>
      </div>
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────
function LoginHeader() {
  return (
    <header style={{ minHeight:80, background:'#0f172a', borderBottom:'3px solid #ea580c' }}
      className="w-full px-8 sticky top-0 z-30 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="PreciseGovCon" className="h-10 w-auto object-contain rounded"/>
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-white tracking-tight">Welcome to Precise Govcon</span>
            <span className="text-sm font-black text-orange-400 px-3 py-1 rounded-full" style={{ background:'rgba(234,88,12,0.15)', border:'2px solid rgba(234,88,12,0.4)' }}>Admin Portal</span>
          </div>
          <p className="text-xs font-black text-slate-400 mt-0.5">Government Contracting Management Platform</p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background:'rgba(21,128,61,0.2)', border:'2px solid rgba(21,128,61,0.4)' }}>
        <Lock className="w-4 h-4 text-green-400"/>
        <span className="text-sm font-black text-green-300 hidden sm:inline">Secure Admin Access</span>
      </div>
    </header>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────
function LoginFooter() {
  return (
    <footer style={{ minHeight:72, background:'#0f172a', borderTop:'3px solid #ea580c' }}
      className="w-full px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="PreciseGovCon" className="h-7 w-auto object-contain rounded opacity-80"/>
        <span className="text-sm font-black text-slate-300">&copy; {new Date().getFullYear()} Precise Govcon. All rights reserved.</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="https://precisegovcon.com" target="_blank" rel="noopener noreferrer" className="text-sm font-black text-slate-400 hover:text-orange-400 transition-colors">Website</a>
        <a href="mailto:support@precisegovcon.com" className="text-sm font-black text-slate-400 hover:text-orange-400 transition-colors">Support</a>
        <span className="text-xs font-black text-slate-500 px-2 py-1 rounded" style={{ background:'#1e293b', border:'1px solid #334155' }}>v1.0.0</span>
      </div>
    </footer>
  );
}

// ─── Login Form ─────────────────────────────────────────────────────────────
function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const router = useRouter();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [touched, setTouched]     = useState({ email: false, password: false });
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const emailError    = touched.email    ? validateEmail(email)       : '';
  const passwordError = touched.password ? validatePassword(password) : '';

  const handleBlur = useCallback((f: 'email'|'password') => setTouched(p=>({...p,[f]:true})), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (validateEmail(email) || validatePassword(password)) return;
    setServerError(''); setIsLoading(true);
    try {
      const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email, password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Login failed');
      router.push('/dashboard'); router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {serverError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background:'#dc2626' }}>
          <span className="text-white font-black text-base">⚠ {serverError}</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-xl font-black text-slate-900">Email Address</label>
        <input id="email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} onBlur={() => handleBlur('email')} disabled={isLoading}
          className="w-full px-5 py-4 rounded-xl text-lg font-bold text-slate-900 placeholder-slate-400 focus:outline-none transition-all disabled:opacity-60"
          style={{ border: emailError ? '2px solid #dc2626' : '2px solid #cbd5e1', background: emailError ? '#fef2f2' : '#ffffff' }}
          placeholder="admin@precisegovcon.com" autoComplete="email"
        />
        {emailError && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background:'#dc2626' }}>
            <span className="text-white font-black text-base">⚠ {emailError}</span>
          </div>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-xl font-black text-slate-900">Password</label>
        <div className="relative">
          <input id="password" type={showPw ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} onBlur={() => handleBlur('password')} disabled={isLoading}
            className="w-full px-5 py-4 pr-14 rounded-xl text-lg font-bold text-slate-900 placeholder-slate-400 focus:outline-none transition-all disabled:opacity-60"
            style={{ border: passwordError ? '2px solid #dc2626' : '2px solid #cbd5e1', background: passwordError ? '#fef2f2' : '#ffffff' }}
            placeholder="••••••••" autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPw(!showPw)} disabled={isLoading}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors">
            {showPw ? <EyeOff className="w-6 h-6"/> : <Eye className="w-6 h-6"/>}
          </button>
        </div>
        {passwordError && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background:'#dc2626' }}>
            <span className="text-white font-black text-base">⚠ {passwordError}</span>
          </div>
        )}
      </div>

      {/* Submit */}
      <button type="submit" disabled={isLoading}
        className="w-full py-5 rounded-xl text-xl font-black text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.99] shadow-lg"
        style={{ background:'linear-gradient(135deg,#ea580c,#c2410c)' }}>
        {isLoading ? <><Loader2 className="w-6 h-6 animate-spin"/> Signing in…</> : 'Sign In'}
      </button>

      <div className="text-center">
        <button type="button" onClick={onForgotPassword} disabled={isLoading}
          className="text-lg font-black text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50">
          Forgot Password?
        </button>
      </div>
    </form>
  );
}

// ─── Forgot Password ────────────────────────────────────────────────────────
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState('');
  const [success, setSuccess]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setMessage('Please enter your email address'); return; }
    setMessage(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/forgot-password', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email }) });
      const d = await r.json();
      if (!r.ok) { setMessage(d.error || 'Failed to send recovery email.'); setSuccess(false); return; }
      setSuccess(true); setMessage('Password reset instructions sent to your email.');
      setEmail(''); setTimeout(() => onBack(), 3500);
    } catch { setMessage('Failed to send recovery email. Please try again.'); setSuccess(false); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-orange-600 hover:text-orange-700 transition"><ArrowLeft className="w-6 h-6"/></button>
        <h2 className="text-3xl font-black text-slate-900">Reset Password</h2>
      </div>
      <p className="text-lg font-bold text-slate-700">Enter your email and we'll send reset instructions.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xl font-black text-slate-900">Email Address</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={loading||success}
            className="w-full px-5 py-4 rounded-xl text-lg font-bold text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-60"
            style={{ border:'2px solid #cbd5e1', background:'#ffffff' }}
            placeholder="admin@precisegovcon.com"/>
        </div>
        {message && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: success ? '#166534' : '#dc2626' }}>
            <span className="text-white font-black text-base">{success ? '✓' : '⚠'} {message}</span>
          </div>
        )}
        <button type="submit" disabled={loading||success}
          className="w-full py-5 rounded-xl text-xl font-black text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 shadow-lg disabled:opacity-60"
          style={{ background:'linear-gradient(135deg,#ea580c,#c2410c)' }}>
          {loading ? <><Loader2 className="w-6 h-6 animate-spin"/> Sending…</> : success ? 'Email Sent!' : <><Mail className="w-5 h-5"/> Send Recovery Email</>}
        </button>
      </form>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [showForgot, setShowForgot] = useState(false);

  const leftContent = showForgot ? (
    <ForgotPasswordForm onBack={() => setShowForgot(false)}/>
  ) : (
    <>
      {/* Title */}
      <div className="text-center mb-7">
        <div className="flex justify-center mb-3">
          <img src="/logo.png" alt="PreciseGovCon Logo" className="h-14 w-auto object-contain rounded"/>
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-1">Precise Govcon</h1>
        <p className="text-xl font-black text-orange-600">Admin Portal</p>
        <p className="text-base font-bold text-slate-600 mt-1">Enterprise Management Platform</p>
      </div>

      <LoginForm onForgotPassword={() => setShowForgot(true)}/>

      {/* Daily Inspiration — below login form on left */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <div style={{ height:3, width:20, borderRadius:9, background:'#f97316' }}/>
          <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Daily Inspiration</p>
          <div style={{ height:3, flex:1, borderRadius:9, background:'#fed7aa' }}/>
        </div>
        <DailyInspiration/>
      </div>

      {/* Security note */}
      <div className="mt-5 pt-4" style={{ borderTop:'2px solid #e2e8f0' }}>
        <p className="text-sm font-black text-slate-600 text-center flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-orange-500"/>
          Protected by IP whitelisting and JWT authentication
        </p>
      </div>
    </>
  );

  return (
    // overflow-hidden + h-screen = NO SCROLL, everything fits
    <div className="h-screen overflow-hidden flex flex-col" style={{ background:'#e2e8f0' }}>
      <LoginHeader/>

      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Desktop: two equal columns ── */}
        <div className="hidden lg:flex w-full overflow-hidden">

          {/* Left — solid white, scrollable only if needed */}
          <div className="flex items-center justify-center flex-1 px-12 py-8 overflow-y-auto" style={{ background:'#ffffff', borderRight:'4px solid #ea580c' }}>
            <div className="w-full max-w-lg">
              {leftContent}
            </div>
          </div>

          {/* Right — solid warm cream, scrollable only if needed */}
          <div className="flex-1 px-12 py-8 overflow-y-auto" style={{ background:'#fffbf5' }}>
            <LoginSidebar/>
          </div>
        </div>

        {/* Mobile */}
        <div className="lg:hidden w-full flex items-center justify-center px-6 py-8 overflow-y-auto" style={{ background:'#ffffff' }}>
          <div className="w-full max-w-md">{leftContent}</div>
        </div>
      </main>

      <LoginFooter/>
    </div>
  );
}