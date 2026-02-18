'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Search,
  Filter,
  TrendingUp,
  Users,
  Zap,
  Crown,
  MoreVertical,
  Mail,
  FileText,
  BarChart3,
  X,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import StatDrillDownModal from '@/components/StatDrillDownModal';

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

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openDrillDown, setOpenDrillDown] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, [search, tierFilter]);

  const fetchSubscriptions = async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        ...(search && { search }),
        ...(tierFilter && { tier: tierFilter }),
      });

      const res = await fetch(`/api/subscriptions?${params}`);
      const data = await res.json();

      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/subscriptions/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getTierIcon = (tier: string | null) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise':
        return <Crown className="w-5 h-5 text-purple-600" />;
      case 'professional':
        return <Zap className="w-5 h-5 text-blue-600" />;
      case 'basic':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      default:
        return <Users className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTierColor = (tier: string | null) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'professional':
        return 'bg-blue-100 text-blue-800';
      case 'basic':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getTierPrice = (tier: string | null) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise':
        return 'Custom Pricing';
      case 'professional':
        return '$299/mo';
      case 'basic':
        return '$99/mo';
      default:
        return 'Free Trial';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded" />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Subscriptions</h1>
        <p className="text-slate-600">Manage and monitor subscription tiers and billing</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Subscriptions */}
            <button
              onClick={() => setOpenDrillDown('totalSubscriptions')}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition cursor-pointer hover:scale-105 transform duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Total</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalSubscriptions}</p>
              <p className="text-xs text-slate-500 mt-1">Active subscriptions</p>
              <p className="text-xs text-slate-400 mt-2">Click to see details</p>
            </button>

            {/* MRR */}
            <button
              onClick={() => setOpenDrillDown('mrr')}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-green-300 transition cursor-pointer hover:scale-105 transform duration-200 relative group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">MRR</span>
                  <span className="text-xs text-green-600 font-semibold">(Monthly)</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(stats.monthlyRecurringRevenue)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Recurring Monthly Revenue</p>
              <p className="text-xs text-slate-400 mt-2">Click for breakdown</p>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 text-white text-xs rounded-lg p-2 whitespace-normal z-40 shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none">
                Total predictable revenue from all active subscriptions per month
              </div>
            </button>

            {/* ARR */}
            <button
              onClick={() => setOpenDrillDown('arr')}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition cursor-pointer hover:scale-105 transform duration-200 relative group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">ARR</span>
                  <span className="text-xs text-blue-600 font-semibold">(Annual)</span>
                </div>
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(stats.annualRecurringRevenue)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Recurring Annual Revenue</p>
              <p className="text-xs text-slate-400 mt-2">Click for breakdown</p>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 text-white text-xs rounded-lg p-2 whitespace-normal z-40 shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none">
                Total predictable annual revenue (MRR × 12)
              </div>
            </button>

            {/* ARPU */}
            <button
              onClick={() => setOpenDrillDown('arpu')}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-orange-300 transition cursor-pointer hover:scale-105 transform duration-200 relative group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">ARPU</span>
                  <span className="text-xs text-orange-600 font-semibold">(Per User)</span>
                </div>
                <CreditCard className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(stats.averageRevenuPerSubscription)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Avg Revenue Per User</p>
              <p className="text-xs text-slate-400 mt-2">Click for tier breakdown</p>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 text-white text-xs rounded-lg p-2 whitespace-normal z-40 shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none">
                Average revenue per paying subscriber (Total Revenue ÷ Active Subscriptions)
              </div>
            </button>
          </div>

          {/* Drill-Down Modals */}
          <StatDrillDownModal
            isOpen={openDrillDown === 'totalSubscriptions'}
            title="Subscription Details"
            subtitle="By subscription tier"
            items={[
              {
                label: 'Enterprise',
                value: stats.enterpriseCount,
                color: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
                icon: <Crown className="w-4 h-4 text-purple-600" />,
              },
              {
                label: 'Professional',
                value: stats.professionalCount,
                color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
                icon: <Zap className="w-4 h-4 text-blue-600" />,
              },
              {
                label: 'Basic',
                value: stats.basicCount,
                color: 'border-green-300 bg-green-50 hover:bg-green-100',
                icon: <CreditCard className="w-4 h-4 text-green-600" />,
              },
              {
                label: 'Trial',
                value: stats.trialCount,
                color: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
                icon: <Users className="w-4 h-4 text-orange-600" />,
              },
            ]}
            onFilterClick={(tier) => {
              setTierFilter(tier.toLowerCase());
              setOpenDrillDown(null);
            }}
            onClose={() => setOpenDrillDown(null)}
          />

          <StatDrillDownModal
            isOpen={openDrillDown === 'mrr'}
            title="Monthly Recurring Revenue"
            subtitle="Current MRR across all tiers"
            items={[
              {
                label: 'Total MRR',
                value: Math.round(stats.monthlyRecurringRevenue / 100),
                color: 'border-green-300 bg-green-50 hover:bg-green-100',
                icon: <TrendingUp className="w-4 h-4 text-green-600" />,
              },
            ]}
            onClose={() => setOpenDrillDown(null)}
          />

          <StatDrillDownModal
            isOpen={openDrillDown === 'arr'}
            title="Annual Recurring Revenue"
            subtitle="Current ARR across all tiers"
            items={[
              {
                label: 'Total ARR',
                value: Math.round(stats.annualRecurringRevenue / 100),
                color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
                icon: <BarChart3 className="w-4 h-4 text-blue-600" />,
              },
            ]}
            onClose={() => setOpenDrillDown(null)}
          />

          <StatDrillDownModal
            isOpen={openDrillDown === 'arpu'}
            title="Average Revenue Per User"
            subtitle="ARPU by subscription tier"
            items={[
              {
                label: 'Overall ARPU',
                value: Math.round(stats.averageRevenuPerSubscription / 100),
                color: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
                icon: <CreditCard className="w-4 h-4 text-orange-600" />,
              },
            ]}
            onClose={() => setOpenDrillDown(null)}
          />
        </>
      )}

      {/* Tier Breakdown Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Enterprise */}
          <div className={`bg-gradient-to-br from-purple-50 to-white rounded-lg border-2 p-6 transition ${tierFilter === 'enterprise' ? 'border-purple-600 shadow-lg' : 'border-purple-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Enterprise</h3>
              <Crown className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600 mb-1">{stats.enterpriseCount}</p>
            <p className="text-sm text-slate-600 mb-3">subscribers</p>
            <button
              onClick={() => {
                setSearch('');
                setTierFilter('enterprise');
              }}
              className={`w-full px-3 py-2 text-white text-sm font-medium rounded-lg transition ${tierFilter === 'enterprise' ? 'bg-purple-700 ring-2 ring-purple-300' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {tierFilter === 'enterprise' ? '✓ Filtering' : 'View All'}
            </button>
          </div>

          {/* Professional */}
          <div className={`bg-gradient-to-br from-blue-50 to-white rounded-lg border-2 p-6 transition ${tierFilter === 'professional' ? 'border-blue-600 shadow-lg' : 'border-blue-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Professional</h3>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-1">{stats.professionalCount}</p>
            <p className="text-sm text-slate-600 mb-3">subscribers</p>
            <button
              onClick={() => {
                setSearch('');
                setTierFilter('professional');
              }}
              className={`w-full px-3 py-2 text-white text-sm font-medium rounded-lg transition ${tierFilter === 'professional' ? 'bg-blue-700 ring-2 ring-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {tierFilter === 'professional' ? '✓ Filtering' : 'View All'}
            </button>
          </div>

          {/* Basic */}
          <div className={`bg-gradient-to-br from-green-50 to-white rounded-lg border-2 p-6 transition ${tierFilter === 'basic' ? 'border-green-600 shadow-lg' : 'border-green-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Basic</h3>
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600 mb-1">{stats.basicCount}</p>
            <p className="text-sm text-slate-600 mb-3">subscribers</p>
            <button
              onClick={() => {
                setSearch('');
                setTierFilter('basic');
              }}
              className={`w-full px-3 py-2 text-white text-sm font-medium rounded-lg transition ${tierFilter === 'basic' ? 'bg-green-700 ring-2 ring-green-300' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {tierFilter === 'basic' ? '✓ Filtering' : 'View All'}
            </button>
          </div>

          {/* Trial */}
          <div className={`bg-gradient-to-br from-orange-50 to-white rounded-lg border-2 p-6 transition ${tierFilter === 'trial' ? 'border-orange-600 shadow-lg' : 'border-orange-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Trials</h3>
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600 mb-1">{stats.trialCount}</p>
            <p className="text-sm text-slate-600 mb-3">active trials</p>
            <button
              onClick={() => {
                setSearch('');
                setTierFilter('trial');
              }}
              className={`w-full px-3 py-2 text-white text-sm font-medium rounded-lg transition ${tierFilter === 'trial' ? 'bg-orange-700 ring-2 ring-orange-300' : 'bg-orange-600 hover:bg-orange-700'}`}
            >
              {tierFilter === 'trial' ? '✓ Filtering' : 'View All'}
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email, company, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {tierFilter && (
            <button
              onClick={() => setTierFilter('')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg font-medium transition"
            >
              <Filter className="w-4 h-4" />
              Filtering: {tierFilter.toUpperCase()}
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => router.push('/dashboard/outreach')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition"
          >
            <Mail className="w-4 h-4" />
            Contractor Outreach
          </button>
        </div>
      </div>

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 text-lg">No subscriptions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition cursor-pointer"
              onClick={() => router.push(`/dashboard/subscriptions/${sub.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">
                      {sub.name || 'Unnamed'}
                    </h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTierColor(
                        sub.plan_tier
                      )}`}
                    >
                      {sub.plan_tier?.toUpperCase() || 'TRIAL'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        sub.plan_status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {sub.plan_status?.toUpperCase() || 'INACTIVE'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{sub.email}</p>
                  {sub.company && (
                    <p className="text-sm text-slate-500 mt-1">{sub.company}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {getTierPrice(sub.plan_tier)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Since {formatDate(sub.created_at)}
                    </p>
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === sub.id ? null : sub.id);
                      }}
                      className="p-2 hover:bg-slate-50 rounded-lg transition text-slate-400 hover:text-slate-600"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === sub.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-10 min-w-48">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/subscriptions/${sub.id}`);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium border-b border-slate-100 text-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Email functionality
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 text-sm"
                        >
                          <Mail className="w-3.5 h-3.5 inline mr-2" />
                          Send Email
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Export functionality
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-green-50 text-green-600 text-sm"
                        >
                          <FileText className="w-3.5 h-3.5 inline mr-2" />
                          Export
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
