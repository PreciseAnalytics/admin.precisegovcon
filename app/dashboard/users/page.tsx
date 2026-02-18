'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  UserPlus,
  Users,
  Mail,
  Building,
  Calendar,
  CreditCard,
  Trash2,
  Ban,
  MoreVertical,
  ChevronDown,
  TrendingUp,
  Grid3x3,
  List,
  Zap,
  Clock,
  AlertCircle,
  XCircle,
  Crown,
  Briefcase,
  Layers,
} from 'lucide-react';
import { formatDate, getStatusColor, getTierColor } from '@/lib/utils';
import AddUserModal from '@/components/AddUserModal';

interface User {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  plan_tier: string | null;
  plan_status: string | null;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  paidSubscribers: number;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'tier' | 'status'>('none');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, activeUsers: 0, suspendedUsers: 0, paidSubscribers: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [page, search, statusFilter, tierFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(tierFilter && { tier: tierFilter }),
      });

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();

      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/users/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete ${userName || 'this user'}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
        fetchStats();
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleSuspendUser = async (userId: string, userName: string, isSuspended: boolean) => {
    if (!confirm(`${isSuspended ? 'Unsuspend' : 'Suspend'} ${userName || 'this user'}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_suspended: !isSuspended }),
      });

      if (res.ok) {
        toast.success(`User ${isSuspended ? 'unsuspended' : 'suspended'} successfully`);
        fetchUsers();
        fetchStats();
      } else {
        toast.error('Failed to update user');
      }
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const getTierBadgeColor = (tier: string | null) => {
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

  const getTierHeaderColor = (tier: string | null) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise':
        return 'bg-gradient-to-r from-purple-100 to-purple-50 border-l-4 border-l-purple-600';
      case 'professional':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-l-blue-600';
      case 'basic':
        return 'bg-gradient-to-r from-green-100 to-green-50 border-l-4 border-l-green-600';
      default:
        return 'bg-gradient-to-r from-orange-50 to-slate-50 border-l-4 border-l-orange-600';
    }
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'trial':
        return 'bg-orange-100 text-orange-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Zap className="w-3 h-3" />;
      case 'trialing':
        return <Clock className="w-3 h-3" />;
      case 'pending':
        return <AlertCircle className="w-3 h-3" />;
      case 'cancelled':
        return <XCircle className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getTierIcon = (tier: string | null) => {
    switch (tier?.toUpperCase()) {
      case 'ENTERPRISE':
        return <Crown className="w-3 h-3" />;
      case 'PROFESSIONAL':
        return <Briefcase className="w-3 h-3" />;
      case 'BASIC':
        return <Layers className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  const groupUsersByTier = () => {
    const groups: Record<string, User[]> = {
      'Enterprise': [],
      'Professional': [],
      'Basic': [],
      'Free': [],
    };

    users.forEach(user => {
      const tier = user.plan_tier?.toLowerCase() || 'free';
      if (tier === 'enterprise') groups['Enterprise'].push(user);
      else if (tier === 'professional') groups['Professional'].push(user);
      else if (tier === 'basic') groups['Basic'].push(user);
      else groups['Free'].push(user);
    });

    return Object.entries(groups).filter(([, users]) => users.length > 0);
  };

  const groupUsersByStatus = () => {
    const groups: Record<string, User[]> = {
      'Active': [],
      'Trial': [],
      'Inactive': [],
      'Past Due': [],
    };

    users.forEach(user => {
      const status = user.plan_status?.toLowerCase() || 'inactive';
      if (status === 'active') groups['Active'].push(user);
      else if (status === 'trial') groups['Trial'].push(user);
      else if (status === 'past_due') groups['Past Due'].push(user);
      else groups['Inactive'].push(user);
    });

    return Object.entries(groups).filter(([, users]) => users.length > 0);
  };

  const groupedUsers = groupBy === 'tier' ? groupUsersByTier() : groupBy === 'status' ? groupUsersByStatus() : [];

  if (loading && users.length === 0) {
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
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded" />
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Users</h1>
        <p className="text-slate-600">Manage and monitor all platform users</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Users</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Active Users</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.activeUsers}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Suspended</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.suspendedUsers}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Paid</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.paidSubscribers}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email, name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="trialing">Trialing</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            >
              <option value="">All Tiers</option>
              <option value="BASIC">Basic</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>

            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value as 'none' | 'tier' | 'status');
                setPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-blue-50"
            >
              <option value="none">Group By: None</option>
              <option value="tier">Group By: Tier</option>
              <option value="status">Group By: Status</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>

            {/* View Mode Toggle */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition ${
                  viewMode === 'list'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users View */}
      {users.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 text-lg">No users found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or add a new user</p>
        </div>
      ) : groupBy !== 'none' ? (
        <div className="space-y-8 mb-8">
          {groupedUsers.map(([groupName, groupUsers]) => (
            <div key={groupName}>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                {groupName} ({groupUsers.length})
              </h2>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : ''}>
                {groupUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-orange-300 transition group cursor-pointer"
              onClick={() => router.push(`/dashboard/users/${user.id}`)}
            >
              {/* Card Header */}
              <div className={`${getTierHeaderColor(user.plan_tier)} px-6 py-4 border-b border-slate-200 flex items-start justify-between`}>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate hover:text-orange-600 transition cursor-pointer group-hover:text-orange-600">
                    {user.name || 'Unnamed User'}
                  </h3>
                  <p className="text-sm text-slate-600 truncate">{user.email}</p>
                </div>
                <div className="relative ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === user.id ? null : user.id);
                    }}
                    className="p-2 hover:bg-white rounded-lg transition text-slate-400 hover:text-slate-600"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenuId === user.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-10 min-w-48">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/users/${user.id}`);
                          setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium border-b border-slate-100 text-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSuspendUser(user.id, user.name || 'User', user.is_suspended);
                          setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-orange-50 text-orange-600 text-sm"
                      >
                        <Ban className="w-3.5 h-3.5 inline mr-2" />
                        {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUser(user.id, user.name || 'User');
                          setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline mr-2" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="px-6 py-4 space-y-3">
                {user.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{user.company}</span>
                  </div>
                )}

                {user.last_login_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      Last login: {formatDate(user.last_login_at)}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    Joined: {formatDate(user.created_at)}
                  </span>
                </div>
              </div>

              {/* Card Footer - Badges */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-2 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTierFilter(user.plan_tier || '');
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 cursor-pointer flex items-center gap-1 ${getTierBadgeColor(user.plan_tier)}`}
                  title="Filter by tier"
                >
                  {getTierIcon(user.plan_tier)}
                  {user.plan_tier?.charAt(0).toUpperCase() + user.plan_tier?.slice(1) || 'Free'}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusFilter(user.plan_status || '');
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 cursor-pointer flex items-center gap-1 ${getStatusBadgeColor(user.plan_status)}`}
                  title="Filter by status"
                >
                  {getStatusIcon(user.plan_status)}
                  {user.plan_status?.charAt(0).toUpperCase() + user.plan_status?.slice(1) || 'Inactive'}
                </button>

                {user.is_suspended && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                    <Ban className="w-3 h-3" />
                    Suspended
                  </span>
                )}

                {user.is_active && !user.is_suspended && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                    <Zap className="w-3 h-3" />
                    Active
                  </span>
                )}
              </div>
            </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'list' && groupBy !== 'none' ? (
        <div className="space-y-8 mb-8">
          {groupedUsers.map(([groupName, groupUsers]) => (
            <div key={groupName}>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                {groupName} ({groupUsers.length})
              </h2>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Joined</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {groupUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50 transition cursor-pointer group"
                        onClick={() => router.push(`/dashboard/users/${user.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              user.plan_tier?.toLowerCase() === 'enterprise' ? 'bg-purple-600' :
                              user.plan_tier?.toLowerCase() === 'professional' ? 'bg-blue-600' :
                              user.plan_tier?.toLowerCase() === 'basic' ? 'bg-green-600' :
                              'bg-orange-600'
                            }`} />
                            <div>
                              <p className="font-medium text-slate-900 group-hover:text-orange-600">{user.name || 'Unnamed'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{user.company || '-'}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTierFilter(user.plan_tier || '');
                              setPage(1);
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 cursor-pointer flex items-center gap-1 ${getTierBadgeColor(user.plan_tier)}`}
                            title="Filter by tier"
                          >
                            {getTierIcon(user.plan_tier)}
                            {user.plan_tier?.charAt(0).toUpperCase() + user.plan_tier?.slice(1) || 'Free'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusFilter(user.plan_status || '');
                              setPage(1);
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 cursor-pointer flex items-center gap-1 ${getStatusBadgeColor(user.plan_status)}`}
                            title="Filter by status"
                          >
                            {getStatusIcon(user.plan_status)}
                            {user.plan_status?.charAt(0).toUpperCase() + user.plan_status?.slice(1) || 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(user.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === user.id ? null : user.id);
                              }}
                              className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-400 hover:text-slate-600"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === user.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-10 min-w-48">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/dashboard/users/${user.id}`);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium border-b border-slate-100 text-sm"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSuspendUser(user.id, user.name || 'User', user.is_suspended);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-orange-50 text-orange-600 text-sm"
                                >
                                  <Ban className="w-3.5 h-3.5 inline mr-2" />
                                  {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(user.id, user.name || 'User');
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm"
                                >
                                  <Trash2 className="w-3.5 h-3.5 inline mr-2" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 mb-8 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50 transition cursor-pointer group"
                  onClick={() => router.push(`/dashboard/users/${user.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        user.plan_tier?.toLowerCase() === 'enterprise' ? 'bg-purple-600' :
                        user.plan_tier?.toLowerCase() === 'professional' ? 'bg-blue-600' :
                        user.plan_tier?.toLowerCase() === 'basic' ? 'bg-green-600' :
                        'bg-orange-600'
                      }`} />
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-orange-600">{user.name || 'Unnamed'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{user.company || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTierFilter(user.plan_tier || '');
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 cursor-pointer flex items-center gap-1 ${getTierBadgeColor(user.plan_tier)}`}
                      title="Filter by tier"
                    >
                      {getTierIcon(user.plan_tier)}
                      {user.plan_tier?.charAt(0).toUpperCase() + user.plan_tier?.slice(1) || 'Free'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusFilter(user.plan_status || '');
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 cursor-pointer flex items-center gap-1 ${getStatusBadgeColor(user.plan_status)}`}
                      title="Filter by status"
                    >
                      {getStatusIcon(user.plan_status)}
                      {user.plan_status?.charAt(0).toUpperCase() + user.plan_status?.slice(1) || 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === user.id ? null : user.id);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-400 hover:text-slate-600"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === user.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-10 min-w-48">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/users/${user.id}`);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium border-b border-slate-100 text-sm"
                          >
                            View Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuspendUser(user.id, user.name || 'User', user.is_suspended);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-orange-50 text-orange-600 text-sm"
                          >
                            <Ban className="w-3.5 h-3.5 inline mr-2" />
                            {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user.id, user.name || 'User');
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="px-4 py-2 bg-slate-100 rounded-lg border border-slate-300">
            <p className="text-sm font-medium text-slate-700">
              Showing {users.length} of {total} users
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium transition ${
                      page === pageNum
                        ? 'bg-orange-600 text-white'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal open={showAddUserModal} onClose={() => setShowAddUserModal(false)} onSuccess={() => fetchUsers()} />
    </div>
  );
}
