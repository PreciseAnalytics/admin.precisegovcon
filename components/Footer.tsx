'use client';

import Link from 'next/link';

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-auto" style={{ background: '#0f172a', borderTop: '3px solid #ea580c' }}>
      <div className="px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="space-y-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <img src="/logo.png" alt="PreciseGovCon" className="h-8 w-auto object-contain rounded" />
              <div>
                <p className="text-sm font-bold text-white leading-tight group-hover:text-orange-400 transition-colors">PreciseGovCon</p>
                <p className="text-[11px] font-medium" style={{ color: '#64748b' }}>Admin Portal</p>
              </div>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              Enterprise platform for managing government contracting subscriptions and contractor outreach.
            </p>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/dashboard/users', label: 'Users' },
                { href: '/dashboard/subscriptions', label: 'Subscriptions' },
                { href: '/dashboard/outreach', label: 'Contractor Outreach' },
                { href: '/dashboard/analytics', label: 'Analytics' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-medium transition-colors hover:text-orange-400"
                    style={{ color: '#94a3b8' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Account</h4>
            <ul className="space-y-2.5">
              {[
                { href: '/dashboard/settings', label: 'My Profile' },
                { href: '/dashboard/settings#password', label: 'Change Password' },
                { href: '/dashboard/settings#security', label: 'Security & 2FA' },
                { href: '/dashboard/audit-logs', label: 'Audit Logs' },
                { href: '/dashboard/settings', label: 'Settings' },
              ].map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm font-medium transition-colors hover:text-orange-400"
                    style={{ color: '#94a3b8' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="https://precisegovcon.com" target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium transition-colors hover:text-orange-400" style={{ color: '#94a3b8' }}>
                  Main Website ↗
                </a>
              </li>
              <li>
                <a href="mailto:support@precisegovcon.com"
                  className="text-sm font-medium transition-colors hover:text-orange-400" style={{ color: '#94a3b8' }}>
                  support@precisegovcon.com
                </a>
              </li>
              <li>
                <Link href="#" className="text-sm font-medium transition-colors hover:text-orange-400" style={{ color: '#94a3b8' }}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm font-medium transition-colors hover:text-orange-400" style={{ color: '#94a3b8' }}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6" style={{ borderTop: '1px solid #1e293b' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm font-medium" style={{ color: '#64748b' }}>
              © {currentYear} PreciseGovCon. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm font-medium" style={{ color: '#475569' }}>
              <span>v1.0.0</span>
              <span className="w-1 h-1 rounded-full" style={{ background: '#334155' }} />
              <span>Admin Portal</span>
              <span className="w-1 h-1 rounded-full" style={{ background: '#334155' }} />
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
                <span style={{ color: '#22c55e' }}>System Online</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
