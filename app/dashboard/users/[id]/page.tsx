'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Key, Ban, CheckCircle, XCircle, Trash2,
  Calendar, Activity, CreditCard, Clock, Phone, Mail,
  Building2, User, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils';

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  plan: string | null;
  plan_status: string | null;
  plan_tier: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
  is_suspended: boolean;
  email_verified: boolean;
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
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

      if (res.status === 401) {
        toast.error('Session expired — please log in again');
        router.push('/');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'User not found');
        router.push('/dashboard/users');
        return;
      }

      const u = data.user;
      setUser(u);
      setName(u.name || '');
      setFirstName(u.firstName || '');
      setLastName(u.lastName || '');
      setEmail(u.email);
      setCompany(u.company || '');
      setPhone(u.phone || '');
      setPlanTier(u.plan_tier || 'FREE');
      setPlanStatus(u.plan_status || 'INACTIVE');
      setIsActive(u.is_active ?? true);
      setIsSuspended(u.is_suspended ?? false);
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
          name: name || null,
          firstName: firstName || null,
          lastName: lastName || null,
          email,
          company: company || null,
          phone: phone || null,
          plan_tier: planTier,
          plan_status: planStatus,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        toast.error('Session expired — please log in again');
        router.push('/');
        return;
      }

      if (!res.ok) {
        toast.error(data.error || 'Failed to update user');
        return;
      }

      toast.success('User updated successfully');
      fetchUser();
    } catch (error) {
      toast.error('Network error — check your connection');
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
    } catch {
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
    } catch {
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
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/users/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('User deleted');
      router.push('/dashboard/users');
    } catch {
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

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || name || 'Unnamed User';

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
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
            {(firstName?.[0] || name?.[0] || email[0]).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{displayName}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              {user.email_verified ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />Email Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                  <ShieldAlert className="w-3 h-3" />Unverified
                </span>
              )}
              {isSuspended && (
                <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Suspended</span>
              )}
              {!isActive && (
                <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Contact Information</h2>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Display name"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company or organization"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Plan Tier
                </label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Plan Status
                </label>
                <select
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
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
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Stripe Customer ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={user.stripe_customer_id}
                      disabled
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm font-mono"
                    />
                    <a
                      href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                    >
                      Stripe ↗
                    </a>
                  </div>
                </div>
              )}

              {user.stripe_subscription_id && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Stripe Subscription ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={user.stripe_subscription_id}
                      disabled
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm font-mono"
                    />
                    <a
                      href={`https://dashboard.stripe.com/subscriptions/${user.stripe_subscription_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                    >
                      Stripe ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              {[
                {
                  label: 'Email Verified',
                  value: user.email_verified,
                  yes: 'Verified',
                  no: 'Unverified',
                  yesColor: 'bg-green-100 text-green-800',
                  noColor: 'bg-orange-100 text-orange-800',
                },
                {
                  label: 'Account Active',
                  value: isActive,
                  yes: 'Active',
                  no: 'Inactive',
                  yesColor: 'bg-green-100 text-green-800',
                  noColor: 'bg-gray-100 text-gray-800',
                },
                {
                  label: 'Suspended',
                  value: isSuspended,
                  yes: 'Suspended',
                  no: 'Not Suspended',
                  yesColor: 'bg-red-100 text-red-800',
                  noColor: 'bg-green-100 text-green-800',
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.value ? item.yesColor : item.noColor}`}>
                    {item.value ? item.yes : item.no}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleResetPassword}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition text-sm"
              >
                <Key className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-800">Reset Password</span>
              </button>

              <button
                onClick={handleToggleSuspend}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${
                  isSuspended ? 'bg-green-50 hover:bg-green-100' : 'bg-orange-50 hover:bg-orange-100'
                }`}
              >
                {isSuspended
                  ? <CheckCircle className="w-4 h-4 text-green-600" />
                  : <Ban className="w-4 h-4 text-orange-600" />}
                <span className="font-medium text-slate-800">
                  {isSuspended ? 'Unsuspend User' : 'Suspend User'}
                </span>
              </button>

              <button
                onClick={handleToggleActive}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${
                  isActive ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-green-50 hover:bg-green-100'
                }`}
              >
                {isActive
                  ? <XCircle className="w-4 h-4 text-yellow-600" />
                  : <CheckCircle className="w-4 h-4 text-green-600" />}
                <span className="font-medium text-slate-800">
                  {isActive ? 'Deactivate User' : 'Activate User'}
                </span>
              </button>

              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition text-sm"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-700">Delete User</span>
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Account Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Member Since</span>
                </div>
                <span className="text-xs font-semibold text-slate-900">
                  {formatDate(user.created_at)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Last Login</span>
                </div>
                <span className="text-xs font-semibold text-slate-900">
                  {user.last_login_at ? formatDateTime(user.last_login_at) : 'Never'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs">Last Updated</span>
                </div>
                <span className="text-xs font-semibold text-slate-900">
                  {formatDate(user.updated_at)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Current Plan</span>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(user.plan_tier || 'FREE')}`}>
                  {user.plan_tier || 'FREE'}
                </span>
              </div>

              {user.company && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs">Company</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900 max-w-[120px] truncate text-right">
                    {user.company}
                  </span>
                </div>
              )}

              {user.phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-4 h-4" />
                    <span className="text-xs">Phone</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    {user.phone}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}