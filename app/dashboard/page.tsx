'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, CreditCard, TrendingUp, Activity, DollarSign, UserCheck } from 'lucide-react';
import AddUserModal from '@/components/AddUserModal';
import { formatCurrency } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalRevenue: number;
  newUsersThisMonth: number;
  activeUsersToday: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    {
      name: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500',
      trend: `+${stats.newUsersThisMonth} this month`,
    },
    {
      name: 'Active Subscriptions',
      value: stats.activeSubscriptions.toLocaleString(),
      icon: CreditCard,
      color: 'bg-green-500',
      trend: 'Paying customers',
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'bg-purple-500',
      trend: 'All-time',
    },
    {
      name: 'Trial Users',
      value: stats.trialUsers.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-orange-500',
      trend: 'Active trials',
    },
    {
      name: 'Active Today',
      value: stats.activeUsersToday.toLocaleString(),
      icon: Activity,
      color: 'bg-pink-500',
      trend: 'Daily active users',
    },
    {
      name: 'New This Month',
      value: stats.newUsersThisMonth.toLocaleString(),
      icon: UserCheck,
      color: 'bg-indigo-500',
      trend: 'New signups',
    },
  ] : [];

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">
          Overview of PreciseGovCon platform metrics and analytics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          // Determine navigation based on card type
          const getNavigation = (name: string) => {
            switch(name) {
              case 'Total Users':
              case 'New This Month':
                return '/dashboard/users';
              case 'Active Subscriptions':
              case 'Trial Users':
                return '/dashboard/subscriptions';
              case 'Total Revenue':
                return '/dashboard/analytics';
              case 'Active Today':
                return '/dashboard/analytics';
              default:
                return '#';
            }
          };

          const href = getNavigation(stat.name);

          return (
            <button
              key={stat.name}
              onClick={() => href !== '#' && router.push(href)}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-xl hover:border-orange-500 transition-all cursor-pointer transform hover:-translate-y-1 text-left"
              title={`View ${stat.name.toLowerCase()}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">{stat.name}</h3>
              <p className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.trend}</p>
              <p className="text-xs text-orange-500 font-semibold mt-3">Click to view →</p>
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/dashboard/users"
            className="flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <Users className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
            <div>
              <p className="font-medium text-slate-900 group-hover:text-blue-600">Manage Users</p>
              <p className="text-xs text-slate-500">View and edit user accounts</p>
            </div>
          </a>
          <a
            href="/dashboard/subscriptions"
            className="flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <CreditCard className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
            <div>
              <p className="font-medium text-slate-900 group-hover:text-green-600">Subscriptions</p>
              <p className="text-xs text-slate-500">Manage billing and plans</p>
            </div>
          </a>
          <a
            href="/dashboard/audit-logs"
            className="flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all group"
          >
            <Activity className="w-5 h-5 text-slate-400 group-hover:text-purple-600" />
            <div>
              <p className="font-medium text-slate-900 group-hover:text-purple-600">Audit Logs</p>
              <p className="text-xs text-slate-500">Review system activity</p>
            </div>
          </a>
          <a
            href="/dashboard/analytics"
            className="flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-all group"
          >
            <TrendingUp className="w-5 h-5 text-slate-400 group-hover:text-orange-600" />
            <div>
              <p className="font-medium text-slate-900 group-hover:text-orange-600">Analytics</p>
              <p className="text-xs text-slate-500">View detailed reports</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
