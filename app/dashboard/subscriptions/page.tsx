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
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Subscriptions */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalSubscriptions}</p>
            <p className="text-xs text-slate-500 mt-1">Active subscriptions</p>
          </div>

          {/* MRR */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">MRR</span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.monthlyRecurringRevenue)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Monthly recurring</p>
          </div>

          {/* ARR */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">ARR</span>
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.annualRecurringRevenue)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Annual recurring</p>
          </div>

          {/* ARPU */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">ARPU</span>
              <CreditCard className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.averageRevenuPerSubscription)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Per user average</p>
          </div>
        </div>
      )}

      {/* Tier Breakdown Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Enterprise */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Enterprise</h3>
              <Crown className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600 mb-1">{stats.enterpriseCount}</p>
            <p className="text-sm text-slate-600 mb-3">subscribers</p>
            <button
              onClick={() => setTierFilter('enterprise')}
              className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
            >
              View All
            </button>
          </div>

          {/* Professional */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Professional</h3>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-1">{stats.professionalCount}</p>
            <p className="text-sm text-slate-600 mb-3">subscribers</p>
            <button
              onClick={() => setTierFilter('professional')}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              View All
            </button>
          </div>

          {/* Basic */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Basic</h3>
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600 mb-1">{stats.basicCount}</p>
            <p className="text-sm text-slate-600 mb-3">subscribers</p>
            <button
              onClick={() => setTierFilter('basic')}
              className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
            >
              View All
            </button>
          </div>

          {/* Trial */}
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Trials</h3>
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600 mb-1">{stats.trialCount}</p>
            <p className="text-sm text-slate-600 mb-3">active trials</p>
            <button
              onClick={() => setTierFilter('trial')}
              className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition"
            >
              View All
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
