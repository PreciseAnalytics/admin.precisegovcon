//app/dashboard/users/page.tsx

'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  UserPlus,
  Users,
  Mail,
  CreditCard,
  Ban,
  CheckCircle,
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
  ArrowLeft,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
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
  role?: string | null;
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
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sendingBulkEmails, setSendingBulkEmails] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ userId: string; userName: string; userEmail: string; userTier: string | null; userStatus: string | null } | null>(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        ...((statusFilter === 'active')
          ? { is_active: 'true', is_suspended: 'false' }
          : (statusFilter === 'suspended' 
            ? { is_suspended: 'true' }
            : (statusFilter && { status: statusFilter }))),
        ...(tierFilter === 'paid' 
          ? { paid: 'true' }
          : (tierFilter && tierFilter !== '' && { tier: tierFilter })),
      });

      const res = await fetch(`/api/users?${params}`);
      if (res.status === 401) {
        router.push('/');
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.details || err.error || 'Failed to fetch users');
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('fetchUsers error:', error);
      toast.error('Network error — could not reach the server');
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

  const confirmDeleteUser = async () => {
    if (!deleteModal) return;
    const { userId, userName } = deleteModal;
    setDeleteModal(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(`Could not delete ${userName}: ${data.error || 'Unknown error'}`, {
          duration: 8000,
          description: data.details || 'Check the server logs for more details.',
        });
        return;
      }

      toast.success(`${userName} has been permanently deleted.`, {
        duration: 5000,
      });

      await fetchUsers();
      await fetchStats();
    } catch (error) {
      toast.error('Network error — the server could not be reached. Please try again.', {
        duration: 8000,
      });
    }
  };

  const handleSuspendUser = async (userId: string, userName: string, isSuspended: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_suspended: !isSuspended }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to update user', {
          duration: 5000,
        });
        console.error('Suspend error:', data);
        return;
      }

      toast.success(`User ${isSuspended ? 'unsuspended' : 'suspended'} successfully`, {
        duration: 5000,
        action: {
          label: 'Close',
          onClick: () => {},
        },
      });
      
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      console.error('Suspend error:', error);
      toast.error('Network error — failed to update user', {
        duration: 5000,
      });
    }
  };

  // NEW: Function to get proper user status display
  const getUserStatusDisplay = (user: User) => {
    // Check suspension first - it overrides everything
    if (user.is_suspended) {
      return {
        text: 'Suspended',
        color: 'bg-red-100 text-red-800',
        icon: <Ban className="w-3 h-3" />
      };
    }
    
    // If not suspended, check if active
    if (user.is_active) {
      return {
        text: 'Active',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-3 h-3" />
      };
    }
    
    // If not active and not suspended, show pending/inactive
    const isTrialing = user.plan_status?.toLowerCase() === 'trialing';
    return {
      text: isTrialing ? 'Trial' : 'Inactive',
      color: isTrialing ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-800',
      icon: isTrialing ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />
    };
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
      case 'trialing':
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
      case 'trial':
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

  const normalizeRole = (role: string | null | undefined) => {
    const r = (role || 'USER').toString().toUpperCase().trim();
    if (r === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    if (r === 'ADMIN') return 'ADMIN';
    return 'USER';
  };

  const getRoleBadgeColor = (role: string | null | undefined) => {
    switch (normalizeRole(role)) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  const getRoleIcon = (role: string | null | undefined) => {
    switch (normalizeRole(role)) {
      case 'SUPER_ADMIN':
        return <Crown className="w-3 h-3" />;
      case 'ADMIN':
        return <Briefcase className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  const groupUsersByTier = () => {
    const groups: Record<string, User[]> = {
      Enterprise: [],
      Professional: [],
      Basic: [],
      Free: [],
    };

    users.forEach((user) => {
      const tier = user.plan_tier?.toLowerCase() || 'free';
      if (tier === 'enterprise') groups.Enterprise.push(user);
      else if (tier === 'professional') groups.Professional.push(user);
      else if (tier === 'basic') groups.Basic.push(user);
      else groups.Free.push(user);
    });

    return Object.entries(groups).filter(([, u]) => u.length > 0);
  };

  const groupUsersByStatus = () => {
    const groups: Record<string, User[]> = {
      Active: [],
      Suspended: [],
      Trial: [],
      Inactive: [],
    };

    users.forEach((user) => {
      if (user.is_suspended) {
        groups.Suspended.push(user);
      } else if (user.is_active) {
        groups.Active.push(user);
      } else if (user.plan_status?.toLowerCase() === 'trialing') {
        groups.Trial.push(user);
      } else {
        groups.Inactive.push(user);
      }
    });

    return Object.entries(groups).filter(([, u]) => u.length > 0);
  };

  const groupedUsers =
    groupBy === 'tier' ? groupUsersByTier() : groupBy === 'status' ? groupUsersByStatus() : [];

  const UserActionButtons = ({ user }: { user: User }) => (
    <div className="flex flex-col items-stretch justify-end gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/dashboard/users/${user.id}`);
        }}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm w-full"
      >
        View Details
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSuspendUser(user.id, user.name || 'User', user.is_suspended);
        }}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-sm w-full ${
          user.is_suspended ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'
        }`}
      >
        {user.is_suspended ? 'Unsuspend' : 'Suspend'}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setDeleteModal({ userId: user.id, userName: user.name || 'Unknown', userEmail: user.email, userTier: user.plan_tier, userStatus: user.plan_status });
        }}
        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm w-full"
      >
        Delete
      </button>
    </div>
  );

  const handleBulkSendEmails = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setSendingBulkEmails(true);
    try {
      const res = await fetch('/api/emails/resend-verification-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds) }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to send emails');
        return;
      }

      toast.success(data.message);
      setSelectedUserIds(new Set());
      fetchUsers();
    } catch (error) {
      console.error('Bulk email error:', error);
      toast.error('Network error — could not send emails');
    } finally {
      setSendingBulkEmails(false);
    }
  };

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
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Users</h1>
        <p className="text-slate-600">Manage and monitor all platform users</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          className={`rounded-lg border p-4 text-left transition focus:ring-2 focus:ring-orange-500 ${!statusFilter && !tierFilter ? 'bg-orange-600 border-orange-700 text-white shadow-md' : 'bg-white border-slate-200 text-slate-900 hover:shadow-md'}`}
          onClick={() => {
            setStatusFilter('');
            setTierFilter('');
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium uppercase ${!statusFilter && !tierFilter ? 'text-white' : 'text-slate-500'}`}>Total Users</p>
              <p className={`text-2xl font-bold mt-1 ${!statusFilter && !tierFilter ? 'text-white' : 'text-slate-900'}`}>{stats.totalUsers}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${!statusFilter && !tierFilter ? 'bg-orange-700' : 'bg-blue-100'}`}>
              <Users className={`w-5 h-5 ${!statusFilter && !tierFilter ? 'text-white' : 'text-blue-600'}`} />
            </div>
          </div>
        </button>

        <button
          className={`rounded-lg border p-4 text-left transition focus:ring-2 focus:ring-orange-500 ${
            statusFilter === 'active' 
              ? 'bg-green-600 border-green-700 text-white shadow-md' 
              : 'bg-white border-slate-200 text-slate-900 hover:shadow-md'
          }`}
          onClick={() => {
            setStatusFilter('active');
            setTierFilter('');
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium uppercase ${statusFilter === 'active' ? 'text-white' : 'text-slate-500'}`}>Active Users</p>
              <p className={`text-2xl font-bold mt-1 ${statusFilter === 'active' ? 'text-white' : 'text-slate-900'}`}>{stats.activeUsers}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusFilter === 'active' ? 'bg-green-700' : 'bg-green-100'}`}>
              <TrendingUp className={`w-5 h-5 ${statusFilter === 'active' ? 'text-white' : 'text-green-600'}`} />
            </div>
          </div>
        </button>

        <button
          className={`rounded-lg border p-4 text-left transition focus:ring-2 focus:ring-orange-500 ${
            statusFilter === 'suspended' 
              ? 'bg-red-600 border-red-700 text-white shadow-md' 
              : 'bg-white border-slate-200 text-slate-900 hover:shadow-md'
          }`}
          onClick={() => {
            setStatusFilter('suspended');
            setTierFilter('');
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium uppercase ${statusFilter === 'suspended' ? 'text-white' : 'text-slate-500'}`}>Suspended</p>
              <p className={`text-2xl font-bold mt-1 ${statusFilter === 'suspended' ? 'text-white' : 'text-slate-900'}`}>{stats.suspendedUsers}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusFilter === 'suspended' ? 'bg-red-700' : 'bg-red-100'}`}>
              <Ban className={`w-5 h-5 ${statusFilter === 'suspended' ? 'text-white' : 'text-red-600'}`} />
            </div>
          </div>
        </button>

        <button
          className={`rounded-lg border p-4 text-left transition focus:ring-2 focus:ring-orange-500 ${
            tierFilter === 'paid' 
              ? 'bg-purple-600 border-purple-700 text-white shadow-md' 
              : 'bg-white border-slate-200 text-slate-900 hover:shadow-md'
          }`}
          onClick={() => {
            setTierFilter('paid');
            setStatusFilter('');
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium uppercase ${tierFilter === 'paid' ? 'text-white' : 'text-slate-500'}`}>Paid Subscribers</p>
              <p className={`text-2xl font-bold mt-1 ${tierFilter === 'paid' ? 'text-white' : 'text-slate-900'}`}>{stats.paidSubscribers}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tierFilter === 'paid' ? 'bg-purple-700' : 'bg-purple-100'}`}>
              <CreditCard className={`w-5 h-5 ${tierFilter === 'paid' ? 'text-white' : 'text-purple-600'}`} />
            </div>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
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
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="trialing">Trialing</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Tiers</option>
          <option value="ENTERPRISE">Enterprise</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="BASIC">Basic</option>
          <option value="">Free</option>
        </select>

        <div className="flex gap-2">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'none' | 'tier' | 'status')}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="none">Group By: None</option>
            <option value="tier">Group By: Tier</option>
            <option value="status">Group By: Status</option>
          </select>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition flex items-center gap-2 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUserIds.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-900">
              {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedUserIds(new Set())}
              className="px-4 py-2 border border-orange-300 text-orange-700 hover:bg-orange-100 rounded-lg transition font-medium"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkSendEmails}
              disabled={sendingBulkEmails}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white rounded-lg transition font-medium flex items-center gap-2"
            >
              {sendingBulkEmails ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Verification Emails
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-md transition ${
              viewMode === 'grid' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md transition ${
              viewMode === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Display */}
      {groupBy !== 'none' ? (
        <div className="space-y-6 mb-8">
          {groupedUsers.map(([groupName, groupUsers]) => (
            <div key={groupName} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className={`px-6 py-3 ${getTierHeaderColor(groupName)}`}>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  {groupBy === 'tier' ? getTierIcon(groupName) : groupName === 'Suspended' ? <Ban className="w-3 h-3" /> : getStatusIcon(groupName)}
                  {groupName} ({groupUsers.length})
                </h3>
              </div>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                  {groupUsers.map((user) => {
                    const statusDisplay = getUserStatusDisplay(user);
                    return (
                      <div
                        key={user.id}
                        className="bg-white rounded-lg border border-slate-200 p-4 flex flex-row gap-4 shadow-sm hover:shadow-md transition cursor-pointer"
                        onClick={() => router.push(`/dashboard/users/${user.id}`)}
                      >
                        <div className="flex-1 flex flex-col gap-1 justify-center">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-3 h-3 rounded-full ${user.plan_tier?.toLowerCase() === 'enterprise' ? 'bg-purple-600' : user.plan_tier?.toLowerCase() === 'professional' ? 'bg-blue-600' : user.plan_tier?.toLowerCase() === 'basic' ? 'bg-green-600' : 'bg-orange-600'}`} />
                            <span className="font-medium text-slate-900 text-lg">{user.name || 'Unnamed'}</span>
                          </div>
                          <div className="text-sm text-slate-600">{user.email}</div>
                          <div className="flex flex-wrap gap-2 mt-1 mb-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(user.role)}`}>
                              {getRoleIcon(user.role)}{normalizeRole(user.role).replace('_', ' ')}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getTierBadgeColor(user.plan_tier)}`}>
                              {getTierIcon(user.plan_tier)}{user.plan_tier ? user.plan_tier.charAt(0).toUpperCase() + user.plan_tier.slice(1) : 'Free'}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusDisplay.color}`}>
                              {statusDisplay.icon}{statusDisplay.text}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">Joined: {formatDate(user.created_at)}</div>
                        </div>
                        <div className="flex flex-col justify-center items-end min-w-[48px] gap-2">
                          <UserActionButtons user={user} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Tier</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Joined</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {groupUsers.map((user) => {
                        const statusDisplay = getUserStatusDisplay(user);
                        return (
                          <tr key={user.id} className="hover:bg-slate-50 transition cursor-pointer group" onClick={() => router.push(`/dashboard/users/${user.id}`)}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${user.plan_tier?.toLowerCase() === 'enterprise' ? 'bg-purple-600' : user.plan_tier?.toLowerCase() === 'professional' ? 'bg-blue-600' : user.plan_tier?.toLowerCase() === 'basic' ? 'bg-green-600' : 'bg-orange-600'}`} />
                                <div><p className="font-medium text-slate-900 group-hover:text-orange-600">{user.name || 'Unnamed'}</p></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                            <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(user.role)}`}>{getRoleIcon(user.role)}{normalizeRole(user.role).replace('_', ' ')}</span></td>
                            <td className="px-6 py-4 text-sm text-slate-600">{user.company || '-'}</td>
                            <td className="px-6 py-4"><button onClick={e => {e.stopPropagation(); setTierFilter(user.plan_tier || ''); setPage(1);}} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 cursor-pointer flex items-center gap-1 ${getTierBadgeColor(user.plan_tier)}`}>{getTierIcon(user.plan_tier)}{user.plan_tier ? user.plan_tier.charAt(0).toUpperCase() + user.plan_tier.slice(1) : 'Free'}</button></td>
                            <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusDisplay.color}`}>{statusDisplay.icon}{statusDisplay.text}</span></td>
                            <td className="px-6 py-4 text-sm text-slate-600">{formatDate(user.created_at)}</td>
                            <td className="px-6 py-4 text-right"><UserActionButtons user={user} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                   </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {users.map((user) => {
              const statusDisplay = getUserStatusDisplay(user);
              return (
                <div
                  key={user.id}
                  className="bg-white rounded-lg border border-slate-200 p-4 flex flex-row gap-4 shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() => router.push(`/dashboard/users/${user.id}`)}
                >
                  <div className="flex-1 flex flex-col gap-1 justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full ${user.plan_tier?.toLowerCase() === 'enterprise' ? 'bg-purple-600' : user.plan_tier?.toLowerCase() === 'professional' ? 'bg-blue-600' : user.plan_tier?.toLowerCase() === 'basic' ? 'bg-green-600' : 'bg-orange-600'}`} />
                      <span className="font-medium text-slate-900 text-lg">{user.name || 'Unnamed'}</span>
                    </div>
                    <div className="text-sm text-slate-600">{user.email}</div>
                    <div className="flex flex-wrap gap-2 mt-1 mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(user.role)}`}>
                        {getRoleIcon(user.role)}{normalizeRole(user.role).replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getTierBadgeColor(user.plan_tier)}`}>
                        {getTierIcon(user.plan_tier)}{user.plan_tier ? user.plan_tier.charAt(0).toUpperCase() + user.plan_tier.slice(1) : 'Free'}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusDisplay.color}`}>
                        {statusDisplay.icon}{statusDisplay.text}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">Joined: {formatDate(user.created_at)}</div>
                  </div>
                  <div className="flex flex-col justify-center items-end min-w-[48px]">
                    <UserActionButtons user={user} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 mb-8 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase w-10">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.size === users.length && users.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds(new Set(users.map((u) => u.id)));
                        } else {
                          setSelectedUserIds(new Set());
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => {
                  const statusDisplay = getUserStatusDisplay(user);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition group">
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={e => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedUserIds);
                            if (e.target.checked) {
                              newSelected.add(user.id);
                            } else {
                              newSelected.delete(user.id);
                            }
                            setSelectedUserIds(newSelected);
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/dashboard/users/${user.id}`)}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${user.plan_tier?.toLowerCase() === 'enterprise' ? 'bg-purple-600' : user.plan_tier?.toLowerCase() === 'professional' ? 'bg-blue-600' : user.plan_tier?.toLowerCase() === 'basic' ? 'bg-green-600' : 'bg-orange-600'}`} />
                          <div><p className="font-medium text-slate-900 group-hover:text-orange-600">{user.name || 'Unnamed'}</p></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(user.role)}`}>{getRoleIcon(user.role)}{normalizeRole(user.role).replace('_', ' ')}</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.company || '-'}</td>
                      <td className="px-6 py-4"><button onClick={e => {e.stopPropagation(); setTierFilter(user.plan_tier || ''); setPage(1);}} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 cursor-pointer flex items-center gap-1 ${getTierBadgeColor(user.plan_tier)}`}>{getTierIcon(user.plan_tier)}{user.plan_tier ? user.plan_tier.charAt(0).toUpperCase() + user.plan_tier.slice(1) : 'Free'}</button></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusDisplay.color}`}>{statusDisplay.icon}{statusDisplay.text}</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(user.created_at)}</td>
                      <td className="px-6 py-4 text-right"><UserActionButtons user={user} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
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
                      page === pageNum ? 'bg-orange-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
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
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={() => fetchUsers()}
      />

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 text-center mb-1">Delete User Account</h2>
            <p className="text-slate-500 text-sm text-center mb-5">This action is permanent and cannot be undone.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Name</span>
                <span className="font-semibold text-slate-900">{deleteModal.userName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-900">{deleteModal.userEmail}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Plan</span>
                <span className="font-semibold text-slate-900">{deleteModal.userTier || 'FREE'} · {deleteModal.userStatus || 'INACTIVE'}</span>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3 mb-6">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="text-xs text-red-700 leading-relaxed">
                All account data including subscription info, login history, and profile details will be <strong>permanently deleted</strong> from the database.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}