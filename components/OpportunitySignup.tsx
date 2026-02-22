// components/OpportunitySignup.tsx
// Embeddable signup form for the main website

import { useState } from 'react';
import { analytics } from '@/lib/analytics';

export function OpportunitySignup({ naicsCode }: { naicsCode?: string }) {
  const [email, setEmail] = useState('');
  const [naics, setNaics] = useState(naicsCode || '');
  const [businessType, setBusinessType] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('/api/marketing/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, naics, businessType }),
    });
    
    if (res.ok) {
      setSubmitted(true);
      // Track conversion using our analytics utility
      analytics.signup('opportunity_alert', email);
      
      // Also track with additional data
      analytics.event('signup_details', {
        event_category: 'lead',
        event_label: 'opportunity_alert',
        business_type: businessType,
        naics_code: naics,
      });
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="font-bold text-lg mb-2">You're Signed Up!</h3>
        <p className="text-green-700">
          We'll send you opportunities matching your profile. 
          Check your email for confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border-2 border-slate-200 rounded-2xl p-6">
      <h3 className="font-bold text-xl mb-2">Get Daily Opportunity Alerts</h3>
      <p className="text-slate-600 mb-4">
        Free for 30 days • Cancel anytime
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Work Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-400 outline-none"
            placeholder="you@company.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-1">Primary NAICS Code</label>
          <input
            type="text"
            value={naics}
            onChange={e => setNaics(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-400 outline-none"
            placeholder="e.g., 541511"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-1">Business Type</label>
          <select
            value={businessType}
            onChange={e => setBusinessType(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-400 outline-none bg-white"
          >
            <option value="">Select...</option>
            <option value="Small Business">Small Business</option>
            <option value="SDVOSB">SDVOSB</option>
            <option value="WOSB">WOSB</option>
            <option value="8(a)">8(a)</option>
            <option value="HUBZone">HUBZone</option>
          </select>
        </div>
        
        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition"
        >
          Get Free Alerts →
        </button>
        
        <p className="text-xs text-slate-400 text-center">
          We'll never share your email. Unsubscribe anytime.
        </p>
      </div>
    </form>
  );
}