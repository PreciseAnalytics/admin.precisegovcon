'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Key,
  Ban,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar,
  Activity,
  CreditCard,
  Clock,
} from 'lucide-react';
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils';

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  plan: string;
  plan_status: string | null;
  plan_tier: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
  is_suspended: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [planTier, setPlanTier] = useState('');
  const [planStatus, setPlanStatus] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [params.id]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${params.id}`);
      const data = await res.json();
      
      if (!res.ok) {
        toast.error('User not found');
        router.push('/dashboard/users');
        return;
      }

      setUser(data.user);
      setName(data.user.name || '');
      setEmail(data.user.email);
      setCompany(data.user.company || '');
      setPlanTier(data.user.plan_tier || 'FREE');
      setPlanStatus(data.user.plan_status || 'INACTIVE');
      setIsActive(data.user.is_active ?? true);
      setIsSuspended(data.user.is_suspended ?? false);
    } catch (error) {
      toast.error('Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const res = await fetch(`/api/users/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company,
          plan_tier: planTier,
          plan_status: planStatus,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success('User updated successfully');
      fetchUser();
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    const newPassword = prompt('Enter new password (min 8 characters):');
    
    if (!newPassword) return;
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      const res = await fetch(`/api/users/${params.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) throw new Error();

      toast.success('Password reset successfully');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const handleToggleSuspend = async () => {
    try {
      const res = await fetch(`/api/users/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_suspended: !isSuspended }),
      });
      if (!res.ok) throw new Error();
      toast.success(isSuspended ? 'User unsuspended' : 'User suspended');
      fetchUser();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleToggleActive = async () => {
    try {
      const res = await fetch(`/api/users/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(isActive ? 'User deactivated' : 'User activated');
      fetchUser();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/users/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('User deleted successfully');
      router.push('/dashboard/users');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded w-64" />
          <div className="h-96 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-slate-600 hover:text-slate-900 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </button>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {user.name || 'Unnamed User'}
        </h1>
        <p className="text-slate-600">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Subscription</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Plan Tier
                </label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Plan Status
                </label>
                <select
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TRIALING">Trialing</option>
                  <option value="PAST_DUE">Past Due</option>
                  <option value="CANCELED">Canceled</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </div>

              {user.stripe_customer_id && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Stripe Customer ID
                  </label>
                  <input
                    type="text"
                    value={user.stripe_customer_id}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Actions & Info */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {isActive ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Suspended</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {isSuspended ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handleResetPassword}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
              >
                <Key className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-900">Reset Password</span>
              </button>
              <button
                onClick={handleToggleSuspend}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${isSuspended ? 'bg-green-50 hover:bg-green-100' : 'bg-orange-50 hover:bg-orange-100'}`}
              >
                {isSuspended ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Ban className="w-5 h-5 text-orange-600" />}
                <span className="font-medium text-slate-900">{isSuspended ? 'Unsuspend User' : 'Suspend User'}</span>
              </button>
              <button
                onClick={handleToggleActive}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-green-50 hover:bg-green-100'}`}
              >
                {isActive ? <XCircle className="w-5 h-5 text-yellow-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                <span className="font-medium text-slate-900">{isActive ? 'Deactivate User' : 'Activate User'}</span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-700">Delete User</span>
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">User Info</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-slate-600">Member Since</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {formatDate(user.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-slate-600">Last Login</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {user.last_login_at ? formatDateTime(user.last_login_at) : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-slate-600">Last Updated</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {formatDate(user.updated_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-600">Current Plan</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.plan_tier || 'FREE')}`}>
                  {user.plan_tier || 'FREE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}