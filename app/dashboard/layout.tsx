// app/dashboard/layout.tsx
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, CreditCard, FileText,
  Settings, LogOut, Menu, X, BarChart3, Mail,
  ChevronDown, User, KeyRound, Bell, Shield,
} from 'lucide-react';
import '@/app/globals.css';

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

const HEADER_HEIGHT = 84;
const HEADER_BG = '#142945';
const HEADER_BORDER = '#ea580c';

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

  useEffect(() => {
    const saved = localStorage.getItem('admin_avatar');
    if (saved) setAvatarUrl(saved);
    const handler = () => setAvatarUrl(localStorage.getItem('admin_avatar'));
    window.addEventListener('avatar_updated', handler);
    return () => window.removeEventListener('avatar_updated', handler);
  }, []);

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

      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center"
        style={{
          height: HEADER_HEIGHT,
          background: HEADER_BG,
          borderBottom: `3px solid ${HEADER_BORDER}`,
        }}
      >
        <div className="flex items-center justify-between w-full px-5 lg:px-8">

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl hover:bg-white/10 transition"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-slate-100" />
            </button>

            <Link href="/dashboard" className="flex items-center gap-3 group">
              <img src="/logo.png" alt="PreciseGovCon" className="h-10 w-auto object-contain rounded" />
              <div className="hidden sm:block">
                <p className="text-[16px] font-black text-white leading-tight tracking-tight group-hover:text-orange-400 transition-colors">
                  PreciseGovCon
                </p>
                <p className="text-[12px] font-semibold leading-tight" style={{ color: '#cbd5e1' }}>
                  Admin Portal
                </p>
              </div>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-1 mx-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[16px] font-bold transition-all whitespace-nowrap"
                  style={
                    active
                      ? { color: '#fb923c', background: 'rgba(251,146,60,0.18)' }
                      : { color: '#f1f5f9', background: 'transparent' }
                  }
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color = '#fb923c';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.color = '#f1f5f9';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="relative p-2.5 rounded-xl hover:bg-white/10 transition" aria-label="Notifications">
              <Bell className="w-6 h-6 text-slate-100" />
              <span
                className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
                style={{ background: HEADER_BORDER, boxShadow: `0 0 0 2px ${HEADER_BG}` }}
              />
            </button>

            <div ref={accountRef} className="relative">
              <button
                onClick={() => setAccountOpen(p => !p)}
                className="flex items-center gap-3 py-2 px-3 rounded-2xl transition"
                style={{ background: accountOpen ? 'rgba(255,255,255,0.10)' : 'transparent' }}
                aria-label="Account menu"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                    boxShadow: '0 0 0 2px rgba(234,88,12,0.45)',
                  }}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt={admin?.name || 'Admin'} className="w-full h-full object-cover" />
                    : <span className="text-[13px] font-black text-white">{initials}</span>
                  }
                </div>

                <div className="hidden sm:block text-left">
                  <p className="text-[15px] font-bold text-white leading-tight truncate max-w-[180px]">
                    {admin?.name || 'Admin'}
                  </p>
                  <p className="text-[12px] leading-tight truncate max-w-[180px]" style={{ color: '#cbd5e1' }}>
                    {admin?.email || ''}
                  </p>
                </div>

                <ChevronDown
                  className={`w-5 h-5 hidden sm:block transition-transform ${accountOpen ? 'rotate-180' : ''}`}
                  style={{ color: '#cbd5e1' }}
                />
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${HEADER_BG}, #1f3a5f)` }}>
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
                        <p className="text-[11px] truncate" style={{ color: '#e2e8f0' }}>{admin?.email || ''}</p>
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

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 shadow-2xl
        transform transition-transform duration-300 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: HEADER_BG }}>
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between px-4"
            style={{ height: HEADER_HEIGHT, borderBottom: `3px solid ${HEADER_BORDER}` }}
          >
            <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
              <img src="/logo.png" alt="PreciseGovCon" className="h-9 w-auto object-contain rounded" />
              <span className="font-black text-white text-[15px]">PreciseGovCon</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="p-2.5 rounded-xl hover:bg-white/10 transition" aria-label="Close menu">
              <X className="w-6 h-6 text-slate-100" />
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
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-[16px] font-bold"
                  style={active ? { color: '#fb923c', background: 'rgba(251,146,60,0.18)' } : { color: '#f1f5f9' }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt={admin?.name || 'Admin'} className="w-full h-full object-cover" />
                  : <span className="text-white text-[12px] font-black">{initials}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white truncate">{admin?.name}</p>
                <p className="text-[12px] truncate" style={{ color: '#cbd5e1' }}>{admin?.email}</p>
              </div>
            </div>

            <Link href="/dashboard/settings" onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-[15px] font-bold rounded-xl transition mb-1"
              style={{ color: '#f1f5f9' }}>
              <Settings className="w-5 h-5" />
              <span>Account Settings</span>
            </Link>

            <button
              onClick={() => { setSidebarOpen(false); handleLogout(); }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-[15px] font-black text-red-300 hover:bg-red-500/10 rounded-xl transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1" style={{ paddingTop: HEADER_HEIGHT + 3 }}>
        {children}
      </main>

      <footer className="mt-auto" style={{ background: HEADER_BG, borderTop: `3px solid ${HEADER_BORDER}` }}>
        <div className="px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

            <div className="space-y-4">
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <img src="/logo.png" alt="PreciseGovCon" className="h-9 w-auto object-contain rounded" />
                <div>
                  <p className="text-[16px] font-black text-white leading-tight group-hover:text-orange-400 transition-colors">
                    PreciseGovCon
                  </p>
                  <p className="text-[12px] font-semibold" style={{ color: '#cbd5e1' }}>Admin Portal</p>
                </div>
              </Link>
              <p className="text-[15px] leading-relaxed" style={{ color: '#e2e8f0' }}>
                Enterprise platform for managing government contracting subscriptions and contractor outreach.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-[13px] font-black text-white uppercase tracking-wider">Platform</h4>
              <ul className="space-y-3">
                {[
                  { href: '/dashboard',               label: 'Dashboard' },
                  { href: '/dashboard/users',         label: 'Users' },
                  { href: '/dashboard/subscriptions', label: 'Subscriptions' },
                  { href: '/dashboard/outreach',      label: 'Contractor Outreach' },
                  { href: '/dashboard/analytics',     label: 'Analytics' },
                ].map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[15px] font-bold transition-colors"
                      style={{ color: '#e2e8f0' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#e2e8f0')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-[13px] font-black text-white uppercase tracking-wider">Account</h4>
              <ul className="space-y-3">
                {[
                  { href: '/dashboard/settings',          label: 'My Profile' },
                  { href: '/dashboard/settings#password', label: 'Change Password' },
                  { href: '/dashboard/settings#security', label: 'Security & 2FA' },
                  { href: '/dashboard/audit-logs',        label: 'Audit Logs' },
                  { href: '/dashboard/settings',          label: 'Settings' },
                ].map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[15px] font-bold transition-colors"
                      style={{ color: '#e2e8f0' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#e2e8f0')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-[13px] font-black text-white uppercase tracking-wider">Support</h4>
              <ul className="space-y-3">
                <li>
                  <a href="https://precisegovcon.com" target="_blank" rel="noopener noreferrer"
                    className="text-[15px] font-bold transition-colors"
                    style={{ color: '#e2e8f0' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#e2e8f0')}
                  >
                    Main Website ↗
                  </a>
                </li>
                <li>
                  <a href="mailto:support@precisegovcon.com"
                    className="text-[15px] font-bold transition-colors"
                    style={{ color: '#e2e8f0' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#e2e8f0')}
                  >
                    support@precisegovcon.com
                  </a>
                </li>
                <li>
                  <Link href="#"
                    className="text-[15px] font-bold transition-colors"
                    style={{ color: '#e2e8f0' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#e2e8f0')}
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#"
                    className="text-[15px] font-bold transition-colors"
                    style={{ color: '#e2e8f0' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#e2e8f0')}
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[14px] font-bold" style={{ color: '#cbd5e1' }}>
                © {currentYear} PreciseGovCon. All rights reserved.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-[14px] font-bold" style={{ color: '#cbd5e1' }}>
                <span>v1.0.0</span>
                <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
                <span>Admin Portal</span>
                <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />
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
