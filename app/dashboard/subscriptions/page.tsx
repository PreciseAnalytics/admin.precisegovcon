//app/dashboard/subscriptions/page.tsx
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Search, TrendingUp, Users, Zap, Crown,
  Mail, FileText, BarChart3, DollarSign, ArrowRight,
  ChevronRight, X, RefreshCw,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subscription {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  plan_tier: string | null;
  plan_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  trialCount: number;
  basicCount: number;
  professionalCount: number;
  enterpriseCount: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  conversionRate: number;
  averageRevenuPerSubscription: number;
}

// ─── Tier theme config ────────────────────────────────────────────────────────
const TIER_THEMES = {
  all: {
    bg: '#0f172a', bgLight: '#f1f5f9', accent: '#475569',
    accentDark: '#334155', border: '#cbd5e1',
    text: '#0f172a', label: 'All Subscriptions',
  },
  trial: {
    bg: '#7c2d12', bgLight: '#fff7ed', accent: '#f97316',
    accentDark: '#ea580c', border: '#fdba74',
    text: '#7c2d12', label: 'Trial Users',
  },
  basic: {
    bg: '#14532d', bgLight: '#f0fdf4', accent: '#22c55e',
    accentDark: '#16a34a', border: '#86efac',
    text: '#14532d', label: 'Basic',
  },
  professional: {
    bg: '#1e3a8a', bgLight: '#eff6ff', accent: '#3b82f6',
    accentDark: '#1d4ed8', border: '#93c5fd',
    text: '#1e3a8a', label: 'Professional',
  },
  enterprise: {
    bg: '#581c87', bgLight: '#faf5ff', accent: '#a855f7',
    accentDark: '#7e22ce', border: '#d8b4fe',
    text: '#581c87', label: 'Enterprise',
  },
  mrr: {
    bg: '#134e4a', bgLight: '#f0fdfa', accent: '#14b8a6',
    accentDark: '#0f766e', border: '#5eead4',
    text: '#134e4a', label: 'Revenue',
  },
  arr: {
    bg: '#1e1b4b', bgLight: '#eef2ff', accent: '#6366f1',
    accentDark: '#4338ca', border: '#a5b4fc',
    text: '#1e1b4b', label: 'Annual Revenue',
  },
} as const;

type TierKey = keyof typeof TIER_THEMES;

// ─── Tier helpers ─────────────────────────────────────────────────────────────
const getTierPrice = (tier: string | null) => {
  switch (tier?.toLowerCase()) {
    case 'enterprise':   return 'Custom Pricing';
    case 'professional': return '$299/mo';
    case 'basic':        return '$99/mo';
    default:             return 'Free Trial';
  }
};

const getTierKey = (tier: string | null): TierKey => {
  switch (tier?.toLowerCase()) {
    case 'enterprise':   return 'enterprise';
    case 'professional': return 'professional';
    case 'basic':        return 'basic';
    default:             return 'trial';
  }
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  themeKey, label, value, sub, icon: Icon,
  activeTheme, onClick,
}: {
  themeKey: TierKey; label: string; value: string; sub: string;
  icon: React.ElementType; activeTheme: TierKey; onClick: (k: TierKey) => void;
}) {
  const theme    = TIER_THEMES[themeKey];
  const isActive = activeTheme === themeKey;

  return (
    <button onClick={() => onClick(themeKey)} className="w-full text-left rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        background:  isActive ? theme.bg      : theme.bgLight,
        border:      `3px solid ${isActive ? theme.accent : theme.border}`,
        boxShadow:   isActive ? `0 8px 32px ${theme.accent}44` : '0 2px 8px rgba(0,0,0,0.06)',
        transform:   isActive ? 'translateY(-4px)' : undefined,
      }}>
      <div className="p-5">
        {/* Icon + label */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: isActive ? 'rgba(255,255,255,0.2)' : theme.bg }}>
            <Icon className="w-5 h-5 text-white"/>
          </div>
          <span className="text-sm font-black uppercase tracking-wide"
            style={{ color: isActive ? 'rgba(255,255,255,0.8)' : theme.accentDark }}>
            {label}
          </span>
        </div>

        {/* Value */}
        <p className="text-4xl font-black mb-1" style={{ color: isActive ? '#fff' : theme.text, lineHeight: 1 }}>
          {value}
        </p>
        <p className="text-sm font-bold mb-4" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : theme.accentDark }}>
          {sub}
        </p>

        {/* CTA button */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm"
          style={{
            background: isActive ? 'rgba(255,255,255,0.18)' : theme.bg,
            color: '#fff',
            border: `2px solid ${isActive ? 'rgba(255,255,255,0.35)' : theme.accentDark}`,
          }}>
          <span>{isActive ? `✓ Viewing ${theme.label}` : `View ${theme.label}`}</span>
          <ChevronRight className="w-4 h-4 ml-auto"/>
        </div>
      </div>
    </button>
  );
}

// ─── Subscription Row ─────────────────────────────────────────────────────────
function SubRow({
  sub, pageTheme, onEmail, onExport, onClick,
}: {
  sub: Subscription;
  pageTheme: typeof TIER_THEMES[TierKey];
  onEmail: (s: Subscription) => void;
  onExport: (s: Subscription) => void;
  onClick: (s: Subscription) => void;
}) {
  const tierKey   = getTierKey(sub.plan_tier);
  const tierTheme = TIER_THEMES[tierKey];

  const isTrial =
    tierKey === 'trial' ||
    !sub.plan_tier ||
    sub.plan_tier?.toLowerCase() === 'trial' ||
    (!sub.stripe_subscription_id && !sub.stripe_customer_id);

  const normalizedStatus = sub.plan_status?.toLowerCase();

  const statusLabel =
    isTrial                          ? '◐ TRIAL'
    : normalizedStatus === 'active'   ? '● ACTIVE'
    : normalizedStatus === 'trialing' ? '◐ TRIALING'
    : normalizedStatus === 'pending'  ? '⏳ PENDING'
    : '○ INACTIVE';

  const statusBg =
    isTrial                          ? '#7c2d12'
    : normalizedStatus === 'active'   ? '#14532d'
    : normalizedStatus === 'trialing' ? '#1e3a8a'
    : normalizedStatus === 'pending'  ? '#b45309'
    : '#374151';

  return (
    <div
      className="rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
      style={{ background: '#ffffff', border: `2px solid ${pageTheme.border}` }}
      onClick={() => onClick(sub)}
    >
      <div className="flex items-center gap-5">

        {/* Tier icon badge */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: tierTheme.bg }}>
          {tierKey === 'enterprise'   && <Crown       className="w-7 h-7 text-white"/>}
          {tierKey === 'professional' && <Zap         className="w-7 h-7 text-white"/>}
          {tierKey === 'basic'        && <CreditCard  className="w-7 h-7 text-white"/>}
          {tierKey === 'trial'        && <Users       className="w-7 h-7 text-white"/>}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-lg font-black text-slate-900">{sub.name || 'Unnamed'}</h3>

            {/* Tier pill */}
            <span className="px-3 py-1 rounded-full text-xs font-black"
              style={{ background: tierTheme.bg, color: '#fff' }}>
              {sub.plan_tier?.toUpperCase() || 'TRIAL'}
            </span>

            {/* Status pill */}
            <span
              className="px-3 py-1 rounded-full text-xs font-black"
              style={{ background: statusBg, color: '#fff' }}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-600">{sub.email}</p>
          {sub.company && <p className="text-sm font-bold text-slate-500 mt-0.5">{sub.company}</p>}
        </div>

        {/* Price + date */}
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-black" style={{ color: pageTheme.text }}>
            {getTierPrice(sub.plan_tier)}
          </p>
          <p className="text-sm font-bold text-slate-500 mt-0.5">
            Since {formatDate(sub.created_at)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEmail(sub); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: '#1e3a8a', border: '2px solid #3b82f6' }}
            title="Send Email">
            <Mail className="w-4 h-4 text-white"/>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onExport(sub); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: '#14532d', border: '2px solid #22c55e' }}
            title="Export">
            <FileText className="w-4 h-4 text-white"/>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(sub); }}
            className="px-4 h-10 rounded-xl flex items-center gap-2 font-black text-sm transition-all hover:scale-105"
            style={{ background: pageTheme.bg, color: '#fff', border: `2px solid ${pageTheme.accentDark}` }}>
            View <ArrowRight className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats,         setStats]         = useState<SubscriptionStats | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [activeTheme,   setActiveTheme]   = useState<TierKey>('all');

  const tierFilterMap: Partial<Record<TierKey, string>> = {
    trial: 'trial', basic: 'basic', professional: 'professional', enterprise: 'enterprise',
  };
  const tierFilter = tierFilterMap[activeTheme] ?? '';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/subscriptions?limit=50${search ? `&search=${search}` : ''}${tierFilter ? `&tier=${tierFilter}` : ''}`).then(r => r.json()),
      fetch('/api/subscriptions/stats').then(r => r.json()),
    ]).then(([subData, statsData]) => {
      setSubscriptions(subData.subscriptions || []);
      setStats(statsData);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [search, activeTheme]);

  const handleCardClick = (key: TierKey) => {
    setActiveTheme(prev => prev === key ? 'all' : key);
  };

  const pageTheme = TIER_THEMES[activeTheme];

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: '#f1f5f9' }}>
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-slate-200 rounded-xl w-64"/>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-2xl"/>)}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl"/>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-500 p-4 sm:p-6 lg:p-8"
      style={{ background: pageTheme.bgLight }}>

      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: pageTheme.bg }}>
            <CreditCard className="w-5 h-5 text-white"/>
          </div>
          <h1 className="text-4xl font-black transition-colors duration-300"
            style={{ color: pageTheme.text }}>
            {activeTheme === 'all' ? 'Subscriptions' : `${pageTheme.label} Subscriptions`}
          </h1>
        </div>

        <p className="text-base font-bold ml-14" style={{ color: pageTheme.accentDark }}>
          {activeTheme === 'all'
            ? 'Click any tier card to filter — all changes happen inline, no popups'
            : `Showing ${pageTheme.label.toLowerCase()} subscribers — click the card again to clear`}
        </p>

        {/* Breadcrumb + actions */}
        <div className="flex items-center gap-3 mt-3 ml-14 flex-wrap">
          {activeTheme !== 'all' && (
            <>
              <button onClick={() => setActiveTheme('all')}
                className="text-sm font-black px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: pageTheme.bg, color: '#fff' }}>
                ← All Subscriptions
              </button>
              <ChevronRight className="w-4 h-4" style={{ color: pageTheme.accentDark }}/>
              <span className="text-sm font-black" style={{ color: pageTheme.text }}>{pageTheme.label}</span>
            </>
          )}
          <button onClick={() => router.push('/dashboard/outreach')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all hover:opacity-90 ml-auto"
            style={{ background: '#ea580c', color: '#fff', border: '2px solid #c2410c' }}>
            <Mail className="w-4 h-4"/> Contractor Outreach
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard themeKey="trial"        label="Trials"        value={String(stats.trialCount)}                          sub="Free trials"          icon={Users}       activeTheme={activeTheme} onClick={handleCardClick}/>
          <StatCard themeKey="basic"        label="Basic"         value={String(stats.basicCount)}                          sub="$99/mo each"          icon={CreditCard}  activeTheme={activeTheme} onClick={handleCardClick}/>
          <StatCard themeKey="professional" label="Professional"  value={String(stats.professionalCount)}                   sub="$299/mo each"         icon={Zap}         activeTheme={activeTheme} onClick={handleCardClick}/>
          <StatCard themeKey="enterprise"   label="Enterprise"    value={String(stats.enterpriseCount)}                     sub="Custom pricing"       icon={Crown}       activeTheme={activeTheme} onClick={handleCardClick}/>
          <StatCard themeKey="mrr"          label="MRR"           value={formatCurrency(stats.monthlyRecurringRevenue)}     sub="Monthly recurring"    icon={TrendingUp}  activeTheme={activeTheme} onClick={handleCardClick}/>
          <StatCard themeKey="arr"          label="ARR"           value={formatCurrency(stats.annualRecurringRevenue)}      sub="Annual recurring"     icon={BarChart3}   activeTheme={activeTheme} onClick={handleCardClick}/>
        </div>
      )}

      {/* ── Inline expanded detail panel ── */}
      {activeTheme !== 'all' && stats && (
        <div className="mb-8 rounded-2xl p-6 transition-all duration-300"
          style={{ background: pageTheme.bg, border: `3px solid ${pageTheme.accent}`, boxShadow: `0 8px 40px ${pageTheme.accent}33` }}>

          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-black text-white mb-1">{pageTheme.label} Overview</h2>
              <p className="text-base font-bold text-white/70">Inline breakdown — no navigation needed</p>
            </div>
            <button onClick={() => setActiveTheme('all')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '2px solid rgba(255,255,255,0.3)' }}>
              <X className="w-4 h-4"/> Clear Filter
            </button>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {activeTheme === 'mrr' || activeTheme === 'arr' ? (
              <>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Monthly Revenue</p>
                  <p className="text-3xl font-black text-white">{formatCurrency(stats.monthlyRecurringRevenue)}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">MRR</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Annual Revenue</p>
                  <p className="text-3xl font-black text-white">{formatCurrency(stats.annualRecurringRevenue)}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">ARR</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Avg. per Sub</p>
                  <p className="text-3xl font-black text-white">{formatCurrency(stats.averageRevenuPerSubscription)}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">ARPU</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Conversion Rate</p>
                  <p className="text-3xl font-black text-white">{stats.conversionRate.toFixed(1)}%</p>
                  <p className="text-sm font-bold text-white/60 mt-1">Trial → Paid</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">
                    {activeTheme === 'trial' ? 'Active Trials' : activeTheme === 'basic' ? 'Basic Users' : activeTheme === 'professional' ? 'Pro Users' : 'Enterprise Users'}
                  </p>
                  <p className="text-3xl font-black text-white">
                    {activeTheme === 'trial' ? stats.trialCount : activeTheme === 'basic' ? stats.basicCount : activeTheme === 'professional' ? stats.professionalCount : stats.enterpriseCount}
                  </p>
                  <p className="text-sm font-bold text-white/60 mt-1">Total on this tier</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Tier Revenue</p>
                  <p className="text-3xl font-black text-white">
                    {activeTheme === 'trial' ? '$0'
                      : activeTheme === 'basic' ? formatCurrency(stats.basicCount * 99)
                      : activeTheme === 'professional' ? formatCurrency(stats.professionalCount * 299)
                      : 'Custom'}
                  </p>
                  <p className="text-sm font-bold text-white/60 mt-1">Monthly from tier</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Total Subscribers</p>
                  <p className="text-3xl font-black text-white">{stats.totalSubscriptions}</p>
                  <p className="text-sm font-bold text-white/60 mt-1">All tiers</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}>
                  <p className="text-sm font-black text-white/70 mb-1">Conversion Rate</p>
                  <p className="text-3xl font-black text-white">{stats.conversionRate.toFixed(1)}%</p>
                  <p className="text-sm font-bold text-white/60 mt-1">Trial → Paid</p>
                </div>
              </>
            )}
          </div>

          {/* Tier price banner */}
          {activeTheme !== 'mrr' && activeTheme !== 'arr' && activeTheme !== 'trial' && (
            <div className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)' }}>
              <DollarSign className="w-8 h-8 text-white/60 flex-shrink-0"/>
              <div>
                <p className="text-sm font-black text-white/70 uppercase tracking-widest">Plan Price</p>
                <p className="text-2xl font-black text-white">{getTierPrice(activeTheme)}</p>
              </div>
              <div className="ml-auto">
                <p className="text-sm font-black text-white/70 uppercase tracking-widest">Showing</p>
                <p className="text-2xl font-black text-white">{subscriptions.length} subscribers</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search + active filter indicator ── */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: pageTheme.accentDark }}/>
          <input
            type="text"
            placeholder="Search by name, email, or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl text-base font-bold text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
            style={{
              background: '#ffffff',
              border: `2px solid ${pageTheme.border}`,
              boxShadow: `0 0 0 0px ${pageTheme.accent}`,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: pageTheme.bg }}>
              <X className="w-4 h-4 text-white"/>
            </button>
          )}
        </div>

        {/* Active filter pill */}
        {activeTheme !== 'all' && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl font-black text-base"
            style={{ background: pageTheme.bg, color: '#fff', border: `2px solid ${pageTheme.accentDark}` }}>
            <span>Filter: {pageTheme.label}</span>
            <button onClick={() => setActiveTheme('all')}
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <X className="w-3.5 h-3.5"/>
            </button>
          </div>
        )}

        <button onClick={() => { setSearch(''); setActiveTheme('all'); }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-base transition-all hover:opacity-90"
          style={{ background: '#ffffff', color: pageTheme.text, border: `2px solid ${pageTheme.border}` }}>
          <RefreshCw className="w-4 h-4"/> Reset
        </button>
      </div>

      {/* ── Subscription results count ── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-black" style={{ color: pageTheme.text }}>
          {subscriptions.length === 0 ? 'No results' : `${subscriptions.length} subscription${subscriptions.length !== 1 ? 's' : ''}`}
          {activeTheme !== 'all' ? ` · ${pageTheme.label}` : ''}
          {search ? ` matching "${search}"` : ''}
        </p>
        {subscriptions.length > 0 && (
          <p className="text-sm font-bold" style={{ color: pageTheme.accentDark }}>
            Click any row to open details
          </p>
        )}
      </div>

      {/* ── Subscription list ── */}
      {subscriptions.length === 0 ? (
        <div className="rounded-2xl py-20 text-center"
          style={{ background: '#ffffff', border: `3px solid ${pageTheme.border}` }}>
          <CreditCard className="w-16 h-16 mx-auto mb-4" style={{ color: pageTheme.border }}/>
          <p className="text-xl font-black mb-2" style={{ color: pageTheme.text }}>No subscriptions found</p>
          <p className="text-base font-bold" style={{ color: pageTheme.accentDark }}>
            {search ? `No results for "${search}"` : `No ${activeTheme !== 'all' ? pageTheme.label : ''} subscriptions yet`}
          </p>
          {(search || activeTheme !== 'all') && (
            <button onClick={() => { setSearch(''); setActiveTheme('all'); }}
              className="mt-6 px-6 py-3 rounded-xl font-black text-white"
              style={{ background: pageTheme.bg }}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map(sub => (
            <SubRow
              key={sub.id}
              sub={sub}
              pageTheme={pageTheme}
              onEmail={s  => { /* email logic */ }}
              onExport={s => { /* export logic */ }}
              onClick={s  => router.push(`/dashboard/subscriptions/${s.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}