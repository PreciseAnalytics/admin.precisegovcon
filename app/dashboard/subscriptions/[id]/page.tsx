'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, RefreshCw, Save, ExternalLink,
  CreditCard, User, Building, Mail, Calendar,
  CheckCircle, XCircle, Clock, AlertCircle, Shield,
} from 'lucide-react';

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
  updated_at: string;
}

interface StripeDetails {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items?: { data: { price: { unit_amount: number; currency: string; recurring: { interval: string } } }[] };
}

const TIER_OPTIONS = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'];
const STATUS_OPTIONS = ['active', 'trialing', 'pending', 'cancelled', 'past_due', 'inactive'];

const tierColors: Record<string, string> = {
  ENTERPRISE:    'bg-purple-100 text-purple-800 border-purple-200',
  PROFESSIONAL:  'bg-blue-100 text-blue-800 border-blue-200',
  BASIC:         'bg-green-100 text-green-800 border-green-200',
  FREE:          'bg-slate-100 text-slate-700 border-slate-200',
};

const statusColors: Record<string, string> = {
  active:    'bg-green-100 text-green-800',
  trialing:  'bg-orange-100 text-orange-800',
  pending:   'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  past_due:  'bg-red-100 text-red-800',
  inactive:  'bg-slate-100 text-slate-600',
};

function StatusIcon({ status }: { status: string | null }) {
  switch (status?.toLowerCase()) {
    case 'active':    return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'trialing':  return <Clock className="w-4 h-4 text-orange-500" />;
    case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'past_due':  return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:          return <AlertCircle className="w-4 h-4 text-slate-400" />;
  }
}

function formatDate(val: string | number | null | undefined) {
  if (!val) return 'N/A';
  const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}

export default function SubscriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [sub, setSub] = useState<Subscription | null>(null);
  const [stripeDetails, setStripeDetails] = useState<StripeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable admin-override fields
  const [editTier, setEditTier] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { if (id) fetchSubscription(); }, [id]);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`);
      if (res.status === 401) { router.push('/'); return; }
      if (!res.ok) { toast.error('Failed to load subscription'); return; }
      const data = await res.json();
      setSub(data.subscription);
      setStripeDetails(data.stripeDetails);
      setEditTier(data.subscription.plan_tier || 'FREE');
      setEditStatus(data.subscription.plan_status || 'inactive');
    } catch {
      toast.error('Network error loading subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_stripe' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Stripe sync failed');
        return;
      }
      const data = await res.json();
      toast.success(data.changed ? 'Synced — data updated from Stripe' : 'Synced — already up to date');
      fetchSubscription();
    } catch {
      toast.error('Network error during sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_subscription',
          plan_tier: editTier,
          plan_status: editStatus,
          notes: editNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save changes');
        return;
      }
      toast.success('Changes saved — logged to audit trail');
      setDirty(false);
      fetchSubscription();
    } catch {
      toast.error('Network error saving changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Loading subscription…</p>
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">Subscription not found</p>
          <button onClick={() => router.back()} className="mt-4 text-orange-600 hover:underline text-sm font-medium">
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const stripePrice = stripeDetails?.items?.data?.[0]?.price;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/subscriptions')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Subscriptions
          </button>
          <div className="flex items-center gap-3">
            {/* Stripe Sync Button */}
            <button
              onClick={handleStripeSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync from Stripe'}
            </button>

            {/* Save Admin Overrides */}
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Audit notice */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium">
          <Shield className="w-4 h-4 flex-shrink-0" />
          Admin edits override local data only — Stripe remains source of truth. All changes are immutably logged to the audit trail.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: User Info + Admin Overrides */}
          <div className="lg:col-span-2 space-y-6">

            {/* User Info Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800">User Information</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Name</p>
                  <p className="font-semibold text-slate-800">{sub.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Email</p>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <p className="font-medium text-slate-700 text-sm">{sub.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Company</p>
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <p className="font-medium text-slate-700">{sub.company || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Member Since</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <p className="font-medium text-slate-700">{formatDate(sub.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Overrides Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-500" />
                  <h2 className="font-semibold text-slate-800">Admin Overrides</h2>
                </div>
                {dirty && (
                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                      Plan Tier
                    </label>
                    <select
                      value={editTier}
                      onChange={e => { setEditTier(e.target.value); setDirty(true); }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                      Plan Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={e => { setEditStatus(e.target.value); setDirty(true); }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Admin Notes (logged to audit trail)
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={e => { setEditNotes(e.target.value); setDirty(true); }}
                    rows={3}
                    placeholder="Reason for manual override, special arrangement, etc…"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
                {dirty && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving…' : 'Save & Log to Audit Trail'}
                    </button>
                    <button
                      onClick={() => {
                        setEditTier(sub.plan_tier || 'FREE');
                        setEditStatus(sub.plan_status || 'inactive');
                        setEditNotes('');
                        setDirty(false);
                      }}
                      className="px-5 py-2 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
                    >
                      Discard
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Stripe Data + IDs */}
          <div className="space-y-6">

            {/* Current Plan Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800">Current Plan</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tierColors[sub.plan_tier || 'FREE'] || tierColors.FREE}`}>
                    {sub.plan_tier || 'FREE'}
                  </span>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[sub.plan_status?.toLowerCase() || 'inactive'] || statusColors.inactive}`}>
                    <StatusIcon status={sub.plan_status} />
                    {sub.plan_status || 'Inactive'}
                  </span>
                </div>
                {stripePrice && (
                  <div className="text-center py-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-black text-slate-800">
                      {formatCurrency(stripePrice.unit_amount, stripePrice.currency)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">per {stripePrice.recurring.interval}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stripe Details Card */}
            {stripeDetails ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800 text-sm">Stripe Live Data</h2>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Live
                  </span>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Period Start</span>
                    <span className="font-semibold text-slate-700">{formatDate(stripeDetails.current_period_start)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Period End</span>
                    <span className="font-semibold text-slate-700">{formatDate(stripeDetails.current_period_end)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cancel at Period End</span>
                    <span className={`font-semibold ${stripeDetails.cancel_at_period_end ? 'text-red-600' : 'text-green-600'}`}>
                      {stripeDetails.cancel_at_period_end ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">No Stripe subscription linked</p>
                <p className="text-xs text-slate-400 mt-1">User may be on a free plan or pre-Stripe</p>
              </div>
            )}

            {/* IDs Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800 text-sm">Identifiers</h2>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'User ID', value: sub.id, link: `/dashboard/users/${sub.id}` },
                  { label: 'Stripe Customer', value: sub.stripe_customer_id, link: sub.stripe_customer_id ? `https://dashboard.stripe.com/customers/${sub.stripe_customer_id}` : null, external: true },
                  { label: 'Stripe Sub ID', value: sub.stripe_subscription_id, link: sub.stripe_subscription_id ? `https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}` : null, external: true },
                ].map(({ label, value, link, external }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">{label}</p>
                    {value && link ? (
                      <a
                        href={link}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        onClick={!external ? (e) => { e.preventDefault(); router.push(link); } : undefined}
                        className="flex items-center gap-1 text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline truncate"
                      >
                        {value}
                        {external && <ExternalLink className="w-3 h-3 flex-shrink-0" />}
                      </a>
                    ) : (
                      <p className="text-xs font-mono text-slate-400">{value || 'N/A'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}