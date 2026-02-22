//code app/dashboard/analytics/page.tsx

'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Users, CreditCard, DollarSign, TrendingUp, Activity, UserCheck, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatDrillDownModal from '@/components/StatDrillDownModal';

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalRevenue: number;
  newUsersThisMonth: number;
  activeUsersToday: number;
}

interface TierDistribution {
  tier: string;
  count: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tierDistribution, setTierDistribution] = useState<TierDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDrillDown, setOpenDrillDown] = useState<string | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setStats(data.stats);
      setTierDistribution(data.tierDistribution || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-slate-200 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    {
      name: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500',
      change: `+${stats.newUsersThisMonth} this month`,
    },
    {
      name: 'Active Subscriptions',
      value: stats.activeSubscriptions.toLocaleString(),
      icon: CreditCard,
      color: 'bg-green-500',
      change: 'Paying customers',
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'bg-purple-500',
      change: 'All-time',
    },
    {
      name: 'Trial Users',
      value: stats.trialUsers.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: 'Active trials',
    },
    {
      name: 'Active Today',
      value: stats.activeUsersToday.toLocaleString(),
      icon: Activity,
      color: 'bg-pink-500',
      change: 'Daily active users',
    },
    {
      name: 'New This Month',
      value: stats.newUsersThisMonth.toLocaleString(),
      icon: UserCheck,
      color: 'bg-indigo-500',
      change: 'New signups',
    },
  ] : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics</h1>
        <p className="text-slate-600">
          Comprehensive platform metrics and insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const tooltipText = {
            'Total Users': 'Total number of registered users on the platform',
            'Active Subscriptions': 'Number of users with active paid subscriptions',
            'Total Revenue': 'Cumulative revenue from all subscriptions and transactions',
            'Trial Users': 'Users currently on trial plans',
            'Active Today': 'Users who logged in or were active today',
            'New This Month': 'New user signups during the current month',
          };

          return (
            <button
              key={stat.name}
              onClick={() => setOpenDrillDown(stat.name)}
              onMouseEnter={() => setHoveredTooltip(stat.name)}
              onMouseLeave={() => setHoveredTooltip(null)}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer hover:scale-105 transform duration-200 relative text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredTooltip(hoveredTooltip === stat.name ? null : stat.name);
                  }}
                  className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 transition"
                  title={tooltipText[stat.name as keyof typeof tooltipText] || ''}
                >
                  <Info className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">{stat.name}</h3>
              <p className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</p>
              <p className="text-sm text-slate-500 mb-2">{stat.change}</p>
              <p className="text-xs text-slate-400">Click to view details</p>

              {/* Tooltip */}
              {hoveredTooltip === stat.name && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 text-white text-xs rounded-lg p-2 whitespace-normal z-20 shadow-lg">
                  {tooltipText[stat.name as keyof typeof tooltipText]}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Drill-Down Modals for Analytics */}
      <StatDrillDownModal
        isOpen={openDrillDown === 'Total Users'}
        title="Total Users"
        subtitle="Platform user metrics"
        items={[
          {
            label: 'Total Registered',
            value: stats?.totalUsers || 0,
            color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
            icon: <Users className="w-4 h-4 text-blue-600" />,
          },
          {
            label: 'New This Month',
            value: stats?.newUsersThisMonth || 0,
            color: 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100',
            icon: <UserCheck className="w-4 h-4 text-indigo-600" />,
          },
          {
            label: 'Active Today',
            value: stats?.activeUsersToday || 0,
            color: 'border-pink-300 bg-pink-50 hover:bg-pink-100',
            icon: <Activity className="w-4 h-4 text-pink-600" />,
          },
        ]}
        onClose={() => setOpenDrillDown(null)}
      />

      <StatDrillDownModal
        isOpen={openDrillDown === 'Active Subscriptions'}
        title="Active Subscriptions"
        subtitle="Users with active paid plans"
        items={[
          {
            label: 'Paying Users',
            value: stats?.activeSubscriptions || 0,
            color: 'border-green-300 bg-green-50 hover:bg-green-100',
            icon: <CreditCard className="w-4 h-4 text-green-600" />,
          },
        ]}
        onClose={() => setOpenDrillDown(null)}
      />

      <StatDrillDownModal
        isOpen={openDrillDown === 'Total Revenue'}
        title="Total Revenue (All-Time)"
        subtitle="Cumulative platform revenue"
        items={[
          {
            label: 'Revenue',
            value: Math.round((stats?.totalRevenue || 0) / 100),
            color: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
            icon: <DollarSign className="w-4 h-4 text-purple-600" />,
          },
        ]}
        onClose={() => setOpenDrillDown(null)}
      />

      <StatDrillDownModal
        isOpen={openDrillDown === 'Trial Users'}
        title="Trial Users"
        subtitle="Users on active trial plans"
        items={[
          {
            label: 'Active Trials',
            value: stats?.trialUsers || 0,
            color: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
            icon: <TrendingUp className="w-4 h-4 text-orange-600" />,
          },
        ]}
        onClose={() => setOpenDrillDown(null)}
      />

      <StatDrillDownModal
        isOpen={openDrillDown === 'Active Today'}
        title="Daily Active Users"
        subtitle="Users active in the last 24 hours"
        items={[
          {
            label: 'Active Today',
            value: stats?.activeUsersToday || 0,
            color: 'border-pink-300 bg-pink-50 hover:bg-pink-100',
            icon: <Activity className="w-4 h-4 text-pink-600" />,
          },
        ]}
        onClose={() => setOpenDrillDown(null)}
      />

      <StatDrillDownModal
        isOpen={openDrillDown === 'New This Month'}
        title="New Signups"
        subtitle="Users registered this month"
        items={[
          {
            label: 'This Month',
            value: stats?.newUsersThisMonth || 0,
            color: 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100',
            icon: <UserCheck className="w-4 h-4 text-indigo-600" />,
          },
        ]}
        onClose={() => setOpenDrillDown(null)}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Subscription Distribution</h2>
          {tierDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.tier}: ${entry.count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {tierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              No distribution data available
            </div>
          )}
        </div>

        {/* User Growth (Placeholder) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">User Growth Trends</h2>
          <div className="h-[300px] flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Growth chart coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Key Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setOpenDrillDown('conversionRate')}
            className="border-l-4 border-blue-500 pl-4 text-left hover:bg-blue-50 p-3 rounded-r-lg transition cursor-pointer"
          >
            <p className="text-sm text-slate-600 mb-1">Conversion Rate (Free to Paid)</p>
            <p className="text-2xl font-bold text-slate-900">
              {stats && stats.totalUsers > 0
                ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Percentage of users with paid subscriptions</p>
          </button>
          <button
            onClick={() => setOpenDrillDown('arpu')}
            className="border-l-4 border-green-500 pl-4 text-left hover:bg-green-50 p-3 rounded-r-lg transition cursor-pointer"
          >
            <p className="text-sm text-slate-600 mb-1">ARPU (Avg Revenue Per User)</p>
            <p className="text-2xl font-bold text-slate-900">
              {stats && stats.activeSubscriptions > 0
                ? formatCurrency(Math.floor(stats.totalRevenue / stats.activeSubscriptions))
                : '$0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Average revenue per paying subscriber</p>
          </button>
          <button
            onClick={() => setOpenDrillDown('engagementRate')}
            className="border-l-4 border-purple-500 pl-4 text-left hover:bg-purple-50 p-3 rounded-r-lg transition cursor-pointer"
          >
            <p className="text-sm text-slate-600 mb-1">Engagement Rate (Daily Active)</p>
            <p className="text-2xl font-bold text-slate-900">
              {stats && stats.totalUsers > 0
                ? ((stats.activeUsersToday / stats.totalUsers) * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Percentage of users active today</p>
          </button>
        </div>
      </div>

      {/* Additional Insight Modals */}
      <StatDrillDownModal
        isOpen={openDrillDown === 'conversionRate'}
        title="Conversion Rate (Free to Paid)"
        subtitle="Percentage of users who converted to paid subscriptions"
        items={[
          {
            label: 'Conversion Rate',
            value: stats && stats.totalUsers > 0
              ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100)
              : 0,
            color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
            icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
          },
        ]}
        onClose={() => setOpenDrillDown(null)}
      />

      <StatDrillDownModal
        isOpen={openDrillDown === 'engagementRate'}
        title="Engagement Rate (Daily Active)"
        subtitle="Percentage of total users active today"
        items={[
          {
            label: 'Engagement',
            value: stats && stats.totalUsers > 0
              ? Math.round((stats.activeUsersToday / stats.totalUsers) * 100)
              : 0,
            color: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
            icon: <Activity className="w-4 h-4 text-purple-600" />,
          },
        ]}
        onClose={() => setOpenDrillDown(null)}
      />
    </div>
  );
}