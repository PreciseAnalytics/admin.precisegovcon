'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CreditCard, Search, Filter, Eye, Edit2,
  DollarSign, Calendar, ChevronLeft, ChevronRight,
  Users, Clock, AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';
import { EditUserModal } from '@/components/UserActionsModal';

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
  trial_active: boolean | null;
  trial_expires_at: string | null;
  is_suspended: boolean | null;
  created_at: string;
}

// Shape expected by EditUserModal
interface ModalUser {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  subscriptionTier: string;
  subscriptionStatus: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tierBadge(tier: string | null) {
  const t = (tier || 'FREE').toUpperCase();
  const colors: Record<string, string> = {
    ENTERPRISE:    'bg-purple-100 text-purple-800',
    PROFESSIONAL:  'bg-blue-100   text-blue-800',
    BASIC:         'bg-green-100  text-green-800',
    FREE:          'bg-gray-100   text-gray-700',
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[t] ?? 'bg-gray-100 text-gray-700'}`}>
      {t}
    </span>
  );
}

function trialDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Edit modal
  const [editTarget, setEditTarget] = useState<ModalUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [page, search, statusFilter, tierFilter]);

  const fetchSubscriptions = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search       && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(tierFilter   && { tier: tierFilter }),
      });

      const res  = await fetch(`/api/subscriptions?${params}`);
      const data = await res.json();

      setSubscriptions(data.subscriptions ?? []);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      toast.error('Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (sub: Subscription) => {
    setEditTarget({
      id:                 sub.id,
      email:              sub.email,
      name:               sub.name || '',
      companyName:        sub.company || '',
      subscriptionTier:   (sub.plan_tier   || 'FREE').toUpperCase(),
      subscriptionStatus: (sub.plan_status || 'INACTIVE').toUpperCase(),
    });
    setEditOpen(true);
  };

  // Summary counts from current page (full counts come from API stats if needed)
  const activeSubs  = subscriptions.filter(s => s.plan_status?.toUpperCase() === 'ACTIVE').length;
  const trialSubs   = subscriptions.filter(s => s.trial_active).length;
  const pastDueSubs = subscriptions.filter(s => s.plan_status?.toUpperCase() === 'PAST_DUE').length;
  const stripeSubs  = subscriptions.filter(s => s.stripe_customer_id).length;

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Subscriptions</h1>
        <p className="text-slate-600">
          Manage all user subscriptions and billing ({total.toLocaleString()} total)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeSubs}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">On Trial</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{trialSubs}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Past Due</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{pastDueSubs}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Stripe Connected</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stripeSubs}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search email, name, company…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIALING">Trialing</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELED">Canceled</option>
              <option value="UNPAID">Unpaid</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Tiers</option>
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trial</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stripe</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium">No subscriptions found</p>
                    <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const daysLeft = trialDaysLeft(sub.trial_expires_at);
                  const statusUpper = (sub.plan_status || 'INACTIVE').toUpperCase();

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 transition">
                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900 text-sm">{sub.name || 'No name'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{sub.email}</div>
                        {sub.company && <div className="text-xs text-slate-400 mt-0.5">{sub.company}</div>}
                        {sub.is_suspended && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                            <XCircle className="w-3 h-3" /> Suspended
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-4">{tierBadge(sub.plan_tier)}</td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(statusUpper)}`}>
                          {statusUpper}
                        </span>
                      </td>

                      {/* Trial */}
                      <td className="px-5 py-4">
                        {sub.trial_active ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className={`text-xs font-medium ${
                              daysLeft !== null && daysLeft <= 1
                                ? 'text-red-600'
                                : daysLeft !== null && daysLeft <= 3
                                  ? 'text-amber-600'
                                  : 'text-blue-600'
                            }`}>
                              {daysLeft === 0
                                ? 'Expires today'
                                : daysLeft === 1
                                  ? '1 day left'
                                  : daysLeft !== null
                                    ? `${daysLeft} days left`
                                    : 'Trial active'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Stripe */}
                      <td className="px-5 py-4">
                        {sub.stripe_customer_id ? (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-xs text-green-700 font-medium">Connected</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 text-xs text-slate-500">{formatDate(sub.created_at)}</td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(sub)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Plan & Status"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/users/${sub.id}`)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {subscriptions.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-sm font-medium text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      <EditUserModal
        isOpen={editOpen}
        onClose={() => { setEditOpen(false); setEditTarget(null); }}
        user={editTarget}
        onSuccess={() => {
          toast.success('Subscription updated');
          fetchSubscriptions();
        }}
      />
    </div>
  );
}