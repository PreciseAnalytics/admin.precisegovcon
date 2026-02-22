//code app/dashboard/audit-logs/page.tsx

'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, FileText, User } from 'lucide-react';

interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes_before: any;
  changes_after: any;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
  admin_user?: {
    email: string;
    name: string;
  } | null;
}

function formatDateTime(value: string) {
  // Accepts ISO strings; falls back safely if invalid
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    const ac = new AbortController();

    async function fetchLogs() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '50',
          ...(actionFilter ? { action: actionFilter } : {}),
          ...(entityFilter ? { entityType: entityFilter } : {}),
        });

        const res = await fetch(`/api/audit-logs?${params.toString()}`, {
          signal: ac.signal,
          cache: 'no-store',
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Request failed (${res.status})`);
        }

        const data: any = await res.json().catch(() => ({}));

        // ✅ Guard against undefined/null payloads (prevents "logs.length" crash)
        const nextLogs: AuditLog[] = Array.isArray(data?.logs) ? data.logs : [];
        const pagination = data?.pagination ?? {};

        const nextTotalPages =
          typeof pagination.totalPages === 'number' && Number.isFinite(pagination.totalPages)
            ? pagination.totalPages
            : 1;

        const nextTotal =
          typeof pagination.total === 'number' && Number.isFinite(pagination.total)
            ? pagination.total
            : nextLogs.length;

        setLogs(nextLogs);
        setTotalPages(Math.max(1, nextTotalPages));
        setTotal(Math.max(0, nextTotal));
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.error('Failed to fetch logs:', e);
        setError(e?.message || 'Failed to fetch audit logs');
        setLogs([]); // keep logs always an array
        setTotalPages(1);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();

    return () => ac.abort();
  }, [page, actionFilter, entityFilter]);

  const getActionColor = (action: string) => {
    const a = String(action || '');
    if (a.includes('DELETE')) return 'bg-red-100 text-red-800';
    if (a.includes('UPDATE')) return 'bg-yellow-100 text-yellow-800';
    if (a.includes('CREATE')) return 'bg-green-100 text-green-800';
    if (a.includes('LOGIN')) return 'bg-blue-100 text-blue-800';
    return 'bg-slate-100 text-slate-800';
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Audit Logs</h1>
        <p className="text-slate-600">
          Complete activity trail of all administrative actions ({total.toLocaleString()} total)
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Actions</option>
              <option value="UPDATE_USER">Update User</option>
              <option value="DELETE_USER">Delete User</option>
              <option value="RESET_PASSWORD">Reset Password</option>
              <option value="UPDATE_SUBSCRIPTION">Update Subscription</option>
              <option value="LOGIN">Login</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Entities</option>
              <option value="User">User</option>
              <option value="Subscription">Subscription</option>
              <option value="Payment">Payment</option>
              <option value="Auth">Auth</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">No audit logs found</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Activity will appear here as admins make changes
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDateTime(log.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {log.admin_user?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {log.admin_user?.email || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(
                          log.action
                        )}`}
                      >
                        {String(log.action || '').replace(/_/g, ' ') || '—'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {log.entity_type || '—'}
                      <div className="text-xs text-slate-400 font-mono">
                        {log.entity_id ? `${log.entity_id.substring(0, 8)}...` : '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      {log.ip_address || 'N/A'}
                    </td>

                    <td className="px-6 py-4">
                      {log.success ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logs.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, total)} of {total} logs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm font-medium text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
