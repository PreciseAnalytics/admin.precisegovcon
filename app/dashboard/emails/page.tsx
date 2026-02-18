'use client';

import { useEffect, useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Search, Filter, Send, RotateCw, Eye, EyeOff } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface UserEmail {
  id: string;
  email: string;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email_verified: boolean;
  email_verification_token?: string | null;
  email_verification_expires?: string | null;
  created_at: string;
  last_login?: string | null;
}

export default function EmailManagementPage() {
  const [users, setUsers] = useState<UserEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showTokens, setShowTokens] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?limit=100');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(search.toLowerCase())) ||
      (user.firstName && user.firstName.toLowerCase().includes(search.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter =
      filterVerified === 'all' ||
      (filterVerified === 'verified' && user.email_verified) ||
      (filterVerified === 'unverified' && !user.email_verified);

    return matchesSearch && matchesFilter;
  });

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleResendVerificationEmail = async (userId: string, email: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/emails/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      });

      if (res.ok) {
        alert(`Verification email sent to ${email}`);
      } else {
        alert('Failed to send verification email');
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      alert('Error sending verification email');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendBulkVerification = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user');
      return;
    }

    setActionLoading('bulk');
    try {
      const userIds = Array.from(selectedUsers);
      const res = await fetch('/api/emails/resend-verification-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Sent ${data.sent} verification emails`);
        setSelectedUsers(new Set());
        await fetchUsers();
      } else {
        alert('Failed to send verification emails');
      }
    } catch (error) {
      console.error('Error sending bulk verification emails:', error);
      alert('Error sending verification emails');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleShowToken = (userId: string) => {
    const newSet = new Set(showTokens);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setShowTokens(newSet);
  };

  const unverifiedCount = users.filter(u => !u.email_verified).length;
  const verifiedCount = users.filter(u => u.email_verified).length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded" />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded" />
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Email Management</h1>
        <p className="text-slate-600">Manage user emails and verification status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-600">Total Users</h3>
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{users.length}</p>
          <p className="text-xs text-slate-500 mt-2">All registered users</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-600">Verified</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{verifiedCount}</p>
          <p className="text-xs text-slate-500 mt-2">
            {verifiedCount === 0 ? '0%' : `${((verifiedCount / users.length) * 100).toFixed(0)}%`} of users
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-600">Pending Verification</h3>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{unverifiedCount}</p>
          <p className="text-xs text-slate-500 mt-2">Need to verify email</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <select
            value={filterVerified}
            onChange={(e) => setFilterVerified(e.target.value as 'all' | 'verified' | 'unverified')}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Users</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>

        {selectedUsers.size > 0 && (
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <span className="text-sm text-slate-600">
              {selectedUsers.size} selected
            </span>
            <button
              onClick={handleResendBulkVerification}
              disabled={actionLoading === 'bulk'}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition text-sm"
            >
              <Send className="w-4 h-4" />
              {actionLoading === 'bulk' ? 'Sending...' : 'Send Verification Emails'}
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Table Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-3 sm:hidden">
          <span className="text-sm font-medium text-slate-600">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
          </span>
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Email</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Name</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Status</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Joined</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Token</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.name || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {user.email_verified ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            Verified
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                            Pending
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {!user.email_verified && user.email_verification_token && (
                        <button
                          onClick={() => toggleShowToken(user.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition"
                          title="Toggle token visibility"
                        >
                          {showTokens.has(user.id) ? (
                            <Eye className="w-4 h-4 text-slate-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      )}
                      {showTokens.has(user.id) && user.email_verification_token && (
                        <div className="absolute bg-slate-900 text-white text-xs rounded p-2 z-10 mt-2 max-w-xs break-all">
                          {user.email_verification_token}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!user.email_verified ? (
                        <button
                          onClick={() => handleResendVerificationEmail(user.id, user.email)}
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 text-white rounded text-xs font-medium transition"
                        >
                          <RotateCw className="w-3 h-3" />
                          {actionLoading === user.id ? 'Sending...' : 'Resend'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden space-y-4 p-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No users found</div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 ml-3">
                    <p className="font-medium text-slate-900">{user.email}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.name || 'No name'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {user.email_verified ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Verified
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                        Pending
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-3">Joined {formatDate(user.created_at)}</p>
                {!user.email_verified && (
                  <button
                    onClick={() => handleResendVerificationEmail(user.id, user.email)}
                    disabled={actionLoading === user.id}
                    className="w-full flex items-center gap-2 justify-center px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 text-white rounded text-sm font-medium transition"
                  >
                    <RotateCw className="w-4 h-4" />
                    {actionLoading === user.id ? 'Sending...' : 'Resend Email'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
