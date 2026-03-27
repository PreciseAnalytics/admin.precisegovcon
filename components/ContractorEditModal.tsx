

import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import type { Contractor } from '../types/contractor';

interface ContractorEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: Contractor | null;
  onSuccess: () => void;
}

export default function ContractorEditModal({ isOpen, onClose, contractor, onSuccess }: ContractorEditModalProps) {
  const [form, setForm] = useState<Contractor | null>(contractor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync form state when contractor changes
  useEffect(() => { setForm(contractor); }, [contractor]);

  if (!isOpen || !form) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f: Contractor | null) => f ? { ...f, [name]: value } : f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Prepare data: convert empty date fields to null
      const patch: any = { ...form };
      if (patch.registration_date === '') patch.registration_date = null;
      if (patch.trial_start === '') patch.trial_start = null;
      if (patch.trial_end === '') patch.trial_end = null;

      const res = await fetch(`/api/outreach/contractors/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update contractor');
      }
      setSuccess(true);
      onSuccess();
      setTimeout(() => { setSuccess(false); onClose(); }, 1200);
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Edit3 className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold text-slate-900">Edit Contractor</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">Contractor updated!</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
              <input name="name" value={form.name || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
              <input name="email" value={form.email || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Phone</label>
              <input name="phone" value={form.phone || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Business Type</label>
              <input name="business_type" value={form.business_type || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">State</label>
              <input name="state" value={form.state || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">NAICS Code</label>
              <input name="naics_code" value={form.naics_code || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">UEI Number</label>
              <input name="uei_number" value={form.uei_number || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">CAGE Code</label>
              <input name="cage_code" value={form.cage_code || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
              <input name="notes" value={form.notes || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
