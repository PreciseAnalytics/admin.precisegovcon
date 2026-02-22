'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, CreditCard, FileText,
  Settings, LogOut, Menu, X, BarChart3, Mail,
  ChevronDown, User, KeyRound, Bell, Shield,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard',           href: '/dashboard',               icon: LayoutDashboard },
  { name: 'Users',               href: '/dashboard/users',         icon: Users },
  { name: 'Subscriptions',       href: '/dashboard/subscriptions', icon: CreditCard },
  { name: 'Contractor Outreach', href: '/dashboard/outreach',      icon: Mail },
  { name: 'Audit Logs',          href: '/dashboard/audit-logs',    icon: FileText },
  { name: 'Analytics',           href: '/dashboard/analytics',     icon: BarChart3 },
  { name: 'Settings',            href: '/dashboard/settings',      icon: Settings },
];

const currentYear = new Date().getFullYear();

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [loading,      setLoading]      = useState(true);
  const [admin,        setAdmin]        = useState<any>(null);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [accountOpen,  setAccountOpen]  = useState(false);
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => { checkAuth(); }, []);

  // Load avatar + listen for updates from Settings page
  useEffect(() => {
    const saved = localStorage.getItem('admin_avatar');
    if (saved) setAvatarUrl(saved);
    const handler = () => setAvatarUrl(localStorage.getItem('admin_avatar'));
    window.addEventListener('avatar_updated', handler);
    return () => window.removeEventListener('avatar_updated', handler);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) { router.push('/'); return; }
      const data = await res.json();
      setAdmin(data.admin);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out successfully');
      router.push('/');
    } catch {
      toast.error('Logout failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading portal…</p>
        </div>
      </div>
    );
  }

  const initials = admin?.name
    ? admin.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href + '/') || pathname === href;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER — solid #0f172a, 72px height, orange bottom border             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center"
        style={{ height: 72, background: '#0f172a', borderBottom: '3px solid #ea580c' }}
      >
        <div className="flex items-center justify-between w-full px-5 lg:px-8">

          {/* Left: hamburger (mobile) + logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Menu className="w-5 h-5 text-slate-300" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <img src="/logo.png" alt="PreciseGovCon" className="h-9 w-auto object-contain rounded" />
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-white leading-tight tracking-tight group-hover:text-orange-400 transition-colors">
                  PreciseGovCon
                </p>
                <p className="text-[11px] font-semibold leading-tight" style={{ color: '#64748b' }}>Admin Portal</p>
              </div>
            </Link>
          </div>

          {/* Center: nav links (desktop) */}
          <nav className="hidden lg:flex items-center gap-0.5 mx-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap"
                  style={
                    active
                      ? { color: '#fb923c', background: 'rgba(251,146,60,0.15)' }
                      : { color: '#e2e8f0' }
                  }
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color = '#fb923c';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.color = '#e2e8f0';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: bell + account */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="relative p-2 rounded-lg hover:bg-white/10 transition">
              <Bell className="w-5 h-5 text-slate-400" />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: '#ea580c', boxShadow: '0 0 0 2px #0f172a' }}
              />
            </button>

            {/* Account dropdown */}
            <div ref={accountRef} className="relative">
              <button
                onClick={() => setAccountOpen(p => !p)}
                className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl transition"
                style={{ background: accountOpen ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                    boxShadow: '0 0 0 2px rgba(234,88,12,0.4)',
                  }}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt={admin?.name || 'Admin'} className="w-full h-full object-cover" />
                    : <span className="text-sm font-black text-white">{initials}</span>
                  }
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-white leading-tight truncate max-w-[120px]">
                    {admin?.name || 'Admin'}
                  </p>
                  <p className="text-[10px] leading-tight truncate max-w-[120px]" style={{ color: '#64748b' }}>
                    {admin?.email || ''}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 hidden sm:block transition-transform ${accountOpen ? 'rotate-180' : ''}`}
                  style={{ color: '#64748b' }}
                />
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  {/* Dropdown header */}
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                          boxShadow: '0 0 0 2px rgba(234,88,12,0.4)',
                        }}
                      >
                        {avatarUrl
                          ? <img src={avatarUrl} alt={admin?.name || 'Admin'} className="w-full h-full object-cover" />
                          : <span className="text-base font-black text-white">{initials}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{admin?.name || 'Admin'}</p>
                        <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>{admin?.email || ''}</p>
                        {admin?.role && (
                          <span
                            className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide"
                            style={{ background: 'rgba(234,88,12,0.2)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.3)' }}
                          >
                            {admin.role.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    <Link href="/dashboard/settings" onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-semibold">My Profile</p>
                        <p className="text-[10px] text-slate-400">Update name, phone, title</p>
                      </div>
                    </Link>
                    <Link href="/dashboard/settings#password" onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <KeyRound className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-semibold">Change Password</p>
                        <p className="text-[10px] text-slate-400">Update your credentials</p>
                      </div>
                    </Link>
                    <Link href="/dashboard/settings#security" onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-semibold">Security & 2FA</p>
                        <p className="text-[10px] text-slate-400">IP whitelist, sessions</p>
                      </div>
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 py-2">
                    <button
                      onClick={() => { setAccountOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                        <LogOut className="w-4 h-4 text-red-500" />
                      </div>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE SIDEBAR BACKDROP ──────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── MOBILE SIDEBAR — dark ────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 shadow-2xl
        transform transition-transform duration-300 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: '#0f172a' }}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4" style={{ height: 72, borderBottom: '3px solid #ea580c' }}>
            <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
              <img src="/logo.png" alt="PreciseGovCon" className="h-8 w-auto object-contain rounded" />
              <span className="font-bold text-white text-sm">PreciseGovCon</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-semibold"
                  style={active ? { color: '#fb923c', background: 'rgba(251,146,60,0.15)' } : { color: '#cbd5e1' }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile account footer */}
          <div className="p-3" style={{ borderTop: '1px solid #1e293b' }}>
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt={admin?.name || 'Admin'} className="w-full h-full object-cover" />
                  : <span className="text-white text-xs font-bold">{initials}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{admin?.name}</p>
                <p className="text-xs truncate" style={{ color: '#64748b' }}>{admin?.email}</p>
              </div>
            </div>
            <Link href="/dashboard/settings" onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg transition mb-1"
              style={{ color: '#cbd5e1' }}>
              <Settings className="w-4 h-4" />
              <span>Account Settings</span>
            </Link>
            <button
              onClick={() => { setSidebarOpen(false); handleLogout(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1" style={{ paddingTop: 75 }}>
        {children}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER — solid #0f172a, orange top border                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <footer className="mt-auto" style={{ background: '#0f172a', borderTop: '3px solid #ea580c' }}>
        <div className="px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

            {/* Brand */}
            <div className="space-y-4">
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <img src="/logo.png" alt="PreciseGovCon" className="h-8 w-auto object-contain rounded" />
                <div>
                  <p className="text-sm font-bold text-white leading-tight group-hover:text-orange-400 transition-colors">PreciseGovCon</p>
                  <p className="text-[11px] font-medium" style={{ color: '#64748b' }}>Admin Portal</p>
                </div>
              </Link>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                Enterprise platform for managing government contracting subscriptions and contractor outreach.
              </p>
            </div>

            {/* Platform */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Platform</h4>
              <ul className="space-y-2.5">
                {[
                  { href: '/dashboard',               label: 'Dashboard' },
                  { href: '/dashboard/users',         label: 'Users' },
                  { href: '/dashboard/subscriptions', label: 'Subscriptions' },
                  { href: '/dashboard/outreach',      label: 'Contractor Outreach' },
                  { href: '/dashboard/analytics',     label: 'Analytics' },
                ].map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm font-medium transition-colors"
                      style={{ color: '#94a3b8' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Account</h4>
              <ul className="space-y-2.5">
                {[
                  { href: '/dashboard/settings',           label: 'My Profile' },
                  { href: '/dashboard/settings#password',  label: 'Change Password' },
                  { href: '/dashboard/settings#security',  label: 'Security & 2FA' },
                  { href: '/dashboard/audit-logs',         label: 'Audit Logs' },
                  { href: '/dashboard/settings',           label: 'Settings' },
                ].map(link => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm font-medium transition-colors"
                      style={{ color: '#94a3b8' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Support</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="https://precisegovcon.com" target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium transition-colors" style={{ color: '#94a3b8' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                    Main Website ↗
                  </a>
                </li>
                <li>
                  <a href="mailto:support@precisegovcon.com"
                    className="text-sm font-medium transition-colors" style={{ color: '#94a3b8' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                    support@precisegovcon.com
                  </a>
                </li>
                <li>
                  <Link href="#" className="text-sm font-medium transition-colors" style={{ color: '#94a3b8' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm font-medium transition-colors" style={{ color: '#94a3b8' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6" style={{ borderTop: '1px solid #1e293b' }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm font-medium" style={{ color: '#64748b' }}>
                © {currentYear} PreciseGovCon. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-sm font-medium" style={{ color: '#475569' }}>
                <span>v1.0.0</span>
                <span className="w-1 h-1 rounded-full" style={{ background: '#334155' }} />
                <span>Admin Portal</span>
                <span className="w-1 h-1 rounded-full" style={{ background: '#334155' }} />
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
                  <span style={{ color: '#22c55e' }}>System Online</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}