'use client';

import Link from 'next/link';
import { Heart, Github, Mail, Globe } from 'lucide-react';

interface FooterProps {
  showLinks?: boolean;
}

export default function Footer({ showLinks = true }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-auto">
      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="PreciseGovCon"
                className="h-8 w-auto object-contain"
              />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Precise Govcon
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Admin Portal
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Enterprise platform for managing government contracting subscriptions and user accounts.
            </p>
          </div>

          {showLinks && (
            <>
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Platform</h4>
                <ul className="space-y-2 text-sm">
                  {[
                    { href: '/dashboard', label: 'Dashboard' },
                    { href: '/dashboard/users', label: 'Users' },
                    { href: '/dashboard/subscriptions', label: 'Subscriptions' },
                    { href: '/dashboard/analytics', label: 'Analytics' },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Support</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="https://precisegovcon.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:support@precisegovcon.com"
                      className="text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1"
                    >
                      <Mail className="w-4 h-4" />
                      Support
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Legal</h4>
                <ul className="space-y-2 text-sm">
                  {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((label) => (
                    <li key={label}>
                      <Link
                        href="#"
                        className="text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
              &copy; {currentYear} Precise Govcon. Built with{' '}
              <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" />
              {' '}for government contractors.
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <span>v1.0.0</span>
              <span className="w-1 h-1 bg-slate-400 rounded-full" />
              <span>Admin Portal</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}