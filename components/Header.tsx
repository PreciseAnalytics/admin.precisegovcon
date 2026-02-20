//app/components/header.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu, X, LogOut, Settings, Bell, User, LayoutDashboard, Users,
  CreditCard, Mail, BarChart3, FileText, Shield, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  title?: string;
  showMobileMenu?: boolean;
}

const NAV_ITEMS = [
  { href: '/dashboard',               label: 'Dashboard',            icon: LayoutDashboard },
  { href: '/dashboard/users',         label: 'Users',                icon: Users },
  { href: '/dashboard/subscriptions', label: 'Subscriptions',        icon: CreditCard },
  { href: '/dashboard/outreach',      label: 'Contractor Outreach',  icon: Mail },
  { href: '/dashboard/audit-logs',    label: 'Audit Logs',           icon: FileText },
  { href: '/dashboard/analytics',     label: 'Analytics',            icon: BarChart3 },
  { href: '/dashboard/settings',      label: 'Settings',             icon: Settings },
];

export default function Header({ title = 'Dashboard', showMobileMenu = true }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname() || '/dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('admin_avatar');
    if (saved) setAvatarUrl(saved);
    const handler = () => setAvatarUrl(localStorage.getItem('admin_avatar'));
    window.addEventListener('avatar_updated', handler);
    return () => window.removeEventListener('avatar_updated', handler);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    try {
      const r = await fetch('/api/auth/logout', { method: 'POST' });
      if (r.ok) { router.push('/'); router.refresh(); }
    } catch (e) { console.error('Logout failed:', e); }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER — solid dark bg, 72px, orange bottom border                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-40"
        style={{ background: '#0f172a', borderBottom: '3px solid #ea580c', minHeight: 72 }}
      >
        <div className="px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between" style={{ height: 72 }}>

            {/* ── Left: Logo ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {showMobileMenu && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen
                    ? <X className="w-5 h-5 text-slate-300" />
                    : <Menu className="w-5 h-5 text-slate-300" />
                  }
                </button>
              )}
              <Link href="/dashboard" className="flex items-center gap-3">
                <img src="/logo.png" alt="PreciseGovCon" className="h-9 w-auto object-contain rounded" />
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-white leading-tight tracking-tight">PreciseGovCon</p>
                  <p className="text-[11px] font-semibold leading-tight" style={{ color: '#64748b' }}>Admin Portal</p>
                </div>
              </Link>
            </div>

            {/* ── Center: Navigation ──────────────────────────────────────── */}
            <nav className="hidden lg:flex items-center gap-0.5 mx-4">
              {NAV_ITEMS.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap"
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
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* ── Right: Bell + Avatar ─────────────────────────────────────── */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                className="p-2 rounded-lg hover:bg-white/10 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-400" />
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ background: '#ea580c', boxShadow: '0 0 0 2px #0f172a' }}
                />
              </button>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl transition-colors"
                  style={{ background: userMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                  aria-label="User menu"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                      boxShadow: '0 0 0 2px rgba(234,88,12,0.4)',
                    }}
                  >
                    {avatarUrl
                      ? <img src={avatarUrl} alt="Admin" className="w-full h-full object-cover" />
                      : <span className="text-sm font-black text-white">AD</span>
                    }
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-white leading-tight">Admin</p>
                    <p className="text-[10px] leading-tight truncate max-w-[110px]" style={{ color: '#64748b' }}>
                      contact@preciseanalyti…
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 hidden sm:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                    style={{ color: '#64748b' }}
                  />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
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
                            ? <img src={avatarUrl} alt="Admin" className="w-full h-full object-cover" />
                            : <span className="text-base font-black text-white">AD</span>
                          }
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Admin</p>
                          <p className="text-[11px]" style={{ color: '#94a3b8' }}>contact@preciseanalytics…</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Settings className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-semibold">Settings</p>
                          <p className="text-[10px] text-slate-400">Profile & preferences</p>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/settings#security"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-semibold">Security</p>
                          <p className="text-[10px] text-slate-400">2FA & sessions</p>
                        </div>
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-slate-100 py-2">
                      <button
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                          <LogOut className="w-4 h-4 text-red-500" />
                        </div>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MOBILE NAV — same dark bg                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div
            className="fixed left-0 right-0 z-30 lg:hidden max-h-[75vh] overflow-y-auto shadow-2xl"
            style={{ top: 75, background: '#0f172a', borderBottom: '3px solid #ea580c' }}
          >
            <nav className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={
                      active
                        ? { color: '#fb923c', background: 'rgba(251,146,60,0.15)' }
                        : { color: '#e2e8f0' }
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}