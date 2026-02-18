//App/dashboard/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, CreditCard, TrendingUp, Activity,
  DollarSign, UserCheck, ArrowRight, LayoutDashboard,
  ChevronRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalRevenue: number;
  newUsersThisMonth: number;
  activeUsersToday: number;
}

// ─── Per-card theme config ─────────────────────────────────────────────────────
const THEMES = {
  users: {
    bg:        '#1e3a8a',   // deep blue
    bgLight:   '#dbeafe',
    accent:    '#3b82f6',
    accentDark:'#1d4ed8',
    border:    '#93c5fd',
    text:      '#1e3a8a',
    label:     'Users',
  },
  subscriptions: {
    bg:        '#14532d',
    bgLight:   '#dcfce7',
    accent:    '#22c55e',
    accentDark:'#16a34a',
    border:    '#86efac',
    text:      '#14532d',
    label:     'Subscriptions',
  },
  revenue: {
    bg:        '#581c87',
    bgLight:   '#f3e8ff',
    accent:    '#a855f7',
    accentDark:'#7e22ce',
    border:    '#d8b4fe',
    text:      '#581c87',
    label:     'Revenue',
  },
  trials: {
    bg:        '#7c2d12',
    bgLight:   '#ffedd5',
    accent:    '#f97316',
    accentDark:'#ea580c',
    border:    '#fdba74',
    text:      '#7c2d12',
    label:     'Trials',
  },
  active: {
    bg:        '#831843',
    bgLight:   '#fce7f3',
    accent:    '#ec4899',
    accentDark:'#be185d',
    border:    '#f9a8d4',
    text:      '#831843',
    label:     'Active Today',
  },
  newUsers: {
    bg:        '#1e3a5f',
    bgLight:   '#e0e7ff',
    accent:    '#6366f1',
    accentDark:'#4338ca',
    border:    '#a5b4fc',
    text:      '#1e3a5f',
    label:     'New Users',
  },
} as const;

type ThemeKey = keyof typeof THEMES | null;

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  name, value, icon: Icon, themeKey, trend, href,
  activeTheme, onClick,
}: {
  name: string; value: string; icon: React.ElementType;
  themeKey: ThemeKey extends null ? never : ThemeKey;
  trend: string; href: string;
  activeTheme: ThemeKey;
  onClick: (key: ThemeKey extends null ? never : ThemeKey) => void;
}) {
  const theme   = THEMES[themeKey as keyof typeof THEMES];
  const isActive = activeTheme === themeKey;

  return (
    <button
      onClick={() => onClick(themeKey as keyof typeof THEMES)}
      className="w-full text-left rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        background:   isActive ? theme.bg        : theme.bgLight,
        border:       `3px solid ${isActive ? theme.accent : theme.border}`,
        boxShadow:    isActive ? `0 8px 32px ${theme.accent}44` : '0 2px 8px rgba(0,0,0,0.08)',
        transform:    isActive ? 'translateY(-4px)' : undefined,
      }}
    >
      <div className="p-6">
        {/* Icon + name row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: isActive ? 'rgba(255,255,255,0.2)' : theme.bg }}>
            <Icon className="w-6 h-6" style={{ color: isActive ? '#fff' : '#fff' }}/>
          </div>
          <span className="text-base font-black" style={{ color: isActive ? '#fff' : theme.text }}>
            {name}
          </span>
        </div>

        {/* Big value */}
        <p className="text-5xl font-black mb-1" style={{ color: isActive ? '#fff' : theme.text, lineHeight:1 }}>
          {value}
        </p>

        {/* Trend */}
        <p className="text-sm font-bold mt-2 mb-4" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : theme.accentDark }}>
          {trend}
        </p>

        {/* Click to view button */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm"
          style={{
            background: isActive ? 'rgba(255,255,255,0.2)' : theme.bg,
            color:      '#ffffff',
            border:     `2px solid ${isActive ? 'rgba(255,255,255,0.4)' : theme.accentDark}`,
          }}>
          <span>{isActive ? `Viewing ${theme.label}` : `View ${theme.label}`}</span>
          <ChevronRight className="w-4 h-4 ml-auto"/>
        </div>
      </div>
    </button>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
function QuickAction({ href, icon: Icon, label, sub, themeKey }: {
  href: string; icon: React.ElementType; label: string; sub: string; themeKey: keyof typeof THEMES;
}) {
  const theme = THEMES[themeKey];
  return (
    <a href={href}
      className="flex items-center gap-4 p-5 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: theme.bgLight, border: `2px solid ${theme.border}`, textDecoration:'none' }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
        style={{ background: theme.bg }}>
        <Icon className="w-5 h-5 text-white"/>
      </div>
      <div>
        <p className="font-black text-base" style={{ color: theme.text }}>{label}</p>
        <p className="text-sm font-bold" style={{ color: theme.accentDark }}>{sub}</p>
      </div>
      <ArrowRight className="w-5 h-5 ml-auto" style={{ color: theme.accent }}/>
    </a>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router            = useRouter();
  const [stats,    setStats]   = useState<Stats | null>(null);
  const [loading,  setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => setStats(d.stats))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = (key: keyof typeof THEMES | null) => {
    // Toggle: clicking active card deactivates
    setActiveTheme(prev => prev === key ? null : key);
  };

  // Derive page accent from active theme
  const pageTheme = activeTheme ? THEMES[activeTheme] : null;

  // Page nav on double-click (or you can add a separate nav button)
  const handleNavigate = (href: string) => { if (href !== '#') router.push(href); };

  if (loading) {
    return (
      <div className="p-8 min-h-screen" style={{ background:'#f8fafc' }}>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-slate-200 rounded-xl w-64"/>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-slate-200 rounded-2xl"/>)}
          </div>
        </div>
      </div>
    );
  }

  const cards = stats ? [
    { name:'Total Users',         value:stats.totalUsers.toLocaleString(),         icon:Users,    themeKey:'users'         as const, trend:`+${stats.newUsersThisMonth} this month`,  href:'/dashboard/users' },
    { name:'Active Subscriptions',value:stats.activeSubscriptions.toLocaleString(),icon:CreditCard,themeKey:'subscriptions'as const, trend:'Paying customers',                       href:'/dashboard/subscriptions' },
    { name:'Total Revenue',       value:formatCurrency(stats.totalRevenue),         icon:DollarSign,themeKey:'revenue'      as const, trend:'All-time revenue',                        href:'/dashboard/analytics' },
    { name:'Trial Users',         value:stats.trialUsers.toLocaleString(),          icon:TrendingUp,themeKey:'trials'       as const, trend:'Active free trials',                      href:'/dashboard/subscriptions' },
    { name:'Active Today',        value:stats.activeUsersToday.toLocaleString(),    icon:Activity, themeKey:'active'        as const, trend:'Daily active users',                      href:'/dashboard/analytics' },
    { name:'New This Month',      value:stats.newUsersThisMonth.toLocaleString(),   icon:UserCheck,themeKey:'newUsers'      as const, trend:'New signups',                             href:'/dashboard/users' },
  ] : [];

  return (
    // Page background shifts to themed hue when a card is active
    <div className="min-h-screen transition-colors duration-500 p-4 sm:p-6 lg:p-8"
      style={{ background: pageTheme ? pageTheme.bgLight : '#f1f5f9' }}>

      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: pageTheme ? pageTheme.bg : '#0f172a' }}>
            <LayoutDashboard className="w-5 h-5 text-white"/>
          </div>
          <h1 className="text-4xl font-black" style={{ color: pageTheme ? pageTheme.text : '#0f172a' }}>
            {pageTheme ? `${pageTheme.label} Overview` : 'Dashboard'}
          </h1>
        </div>
        <p className="text-base font-bold ml-13"
          style={{ color: pageTheme ? pageTheme.accentDark : '#475569', marginLeft: 52 }}>
          {pageTheme
            ? `Viewing ${pageTheme.label.toLowerCase()} metrics — click the card again to return to overview`
            : 'Click any card below to explore its metrics'}
        </p>

        {/* Breadcrumb */}
        {activeTheme && (
          <div className="flex items-center gap-2 mt-3 ml-13" style={{ marginLeft:52 }}>
            <button onClick={() => setActiveTheme(null)}
              className="text-sm font-black px-3 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ background: pageTheme!.bg, color:'#fff' }}>
              ← All Metrics
            </button>
            <ChevronRight className="w-4 h-4" style={{ color: pageTheme!.accentDark }}/>
            <span className="text-sm font-black" style={{ color: pageTheme!.text }}>{pageTheme!.label}</span>
            <button
              onClick={() => handleNavigate(cards.find(c=>c.themeKey===activeTheme)?.href ?? '#')}
              className="ml-4 text-sm font-black px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:opacity-90"
              style={{ background: pageTheme!.bg, color:'#fff', border:`2px solid ${pageTheme!.accentDark}` }}>
              Open Full Page <ArrowRight className="w-3.5 h-3.5"/>
            </button>
          </div>
        )}
      </div>

      {/* ── Stat cards grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map(card => (
          <StatCard
            key={card.name}
            name={card.name}
            value={card.value}
            icon={card.icon}
            themeKey={card.themeKey}
            trend={card.trend}
            href={card.href}
            activeTheme={activeTheme}
            onClick={handleCardClick}
          />
        ))}
      </div>

      {/* ── Inline expanded detail — appears below cards when one is active ── */}
      {activeTheme && pageTheme && (
        <div className="mb-8 rounded-2xl p-6 transition-all duration-300"
          style={{ background: pageTheme.bg, border: `3px solid ${pageTheme.accent}`, boxShadow: `0 8px 40px ${pageTheme.accent}33` }}>

          {/* Detail header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black text-white mb-1">{pageTheme.label} Details</h2>
              <p className="text-base font-bold text-white/70">Inline summary — no page navigation required</p>
            </div>
            <button
              onClick={() => handleNavigate(cards.find(c=>c.themeKey===activeTheme)?.href ?? '#')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-base transition-all hover:opacity-90"
              style={{ background:'rgba(255,255,255,0.2)', color:'#fff', border:'2px solid rgba(255,255,255,0.4)' }}>
              Open Full {pageTheme.label} Page <ArrowRight className="w-5 h-5"/>
            </button>
          </div>

          {/* Inline metric highlight */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards
              .filter(c => c.themeKey === activeTheme)
              .map(c => (
                <div key={c.name} className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.25)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">{c.name}</p>
                  <p className="text-4xl font-black text-white">{c.value}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">{c.trend}</p>
                </div>
              ))
            }

            {/* Related metrics from other cards for context */}
            {activeTheme === 'users' && stats && (
              <>
                <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.25)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Active Today</p>
                  <p className="text-4xl font-black text-white">{stats.activeUsersToday}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">Online right now</p>
                </div>
                <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.25)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">On Trial</p>
                  <p className="text-4xl font-black text-white">{stats.trialUsers}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">Free trial users</p>
                </div>
                <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.25)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Subscribed</p>
                  <p className="text-4xl font-black text-white">{stats.activeSubscriptions}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">Paying customers</p>
                </div>
              </>
            )}
            {activeTheme === 'subscriptions' && stats && (
              <>
                <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.25)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Trial Users</p>
                  <p className="text-4xl font-black text-white">{stats.trialUsers}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">Conversion opportunities</p>
                </div>
                <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.25)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Total Revenue</p>
                  <p className="text-4xl font-black text-white">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">All-time</p>
                </div>
              </>
            )}
            {activeTheme === 'revenue' && stats && (
              <>
                <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.25)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Paying Users</p>
                  <p className="text-4xl font-black text-white">{stats.activeSubscriptions}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">Active subscriptions</p>
                </div>
                <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.25)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Avg. per User</p>
                  <p className="text-4xl font-black text-white">
                    {stats.activeSubscriptions > 0 ? formatCurrency(stats.totalRevenue / stats.activeSubscriptions) : '$0'}
                  </p>
                  <p className="text-sm font-bold text-white/60 mt-1">Revenue per subscriber</p>
                </div>
              </>
            )}
          </div>

          {/* Inline filter bar — no modal, expands right here */}
          <div className="mt-6 pt-5" style={{ borderTop:'2px solid rgba(255,255,255,0.2)' }}>
            <p className="text-sm font-black text-white/60 uppercase tracking-widest mb-3">Quick Filters</p>
            <div className="flex flex-wrap gap-3">
              {['All', 'Active', 'Trial', 'Expired', 'Last 30 Days', 'Last 90 Days'].map(f => (
                <button key={f}
                  className="px-4 py-2 rounded-xl font-black text-sm transition-all hover:opacity-90"
                  style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'2px solid rgba(255,255,255,0.3)' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="rounded-2xl p-6"
        style={{ background:'#ffffff', border:`3px solid ${pageTheme ? pageTheme.border : '#e2e8f0'}`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        <h2 className="text-2xl font-black mb-2" style={{ color: pageTheme ? pageTheme.text : '#0f172a' }}>
          Quick Actions
        </h2>
        <p className="text-sm font-bold mb-5" style={{ color: pageTheme ? pageTheme.accentDark : '#64748b' }}>
          Navigate directly to any section
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction href="/dashboard/users"         icon={Users}      label="Manage Users"    sub="View and edit accounts"   themeKey="users"/>
          <QuickAction href="/dashboard/subscriptions" icon={CreditCard} label="Subscriptions"   sub="Manage billing and plans" themeKey="subscriptions"/>
          <QuickAction href="/dashboard/audit-logs"    icon={Activity}   label="Audit Logs"      sub="Review system activity"   themeKey="active"/>
          <QuickAction href="/dashboard/analytics"     icon={TrendingUp} label="Analytics"       sub="View detailed reports"    themeKey="revenue"/>
        </div>
      </div>
    </div>
  );
}