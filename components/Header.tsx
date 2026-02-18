'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, Settings, Bell, User } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  title?: string;
  showMobileMenu?: boolean;
}

export default function Header({ title = 'Dashboard', showMobileMenu = true }: HeaderProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Main Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo and Title */}
            <div className="flex items-center gap-4">
              {showMobileMenu && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Toggle mobile menu"
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  ) : (
                    <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  )}
                </button>
              )}

              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="PreciseGovCon"
                  className="h-8 w-auto object-contain"
                />
                <div className="hidden sm:block">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Precise Govcon
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Admin Portal
                  </p>
                </div>
              </div>
            </div>

            {/* Center: Page Title */}
            <div className="hidden md:block flex-1 text-center">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                {title}
              </h1>
            </div>

            {/* Right: Actions and User Menu */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notification Bell */}
              <button
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
              </button>

              {/* User Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">
                    Admin
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 py-1 z-50">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-slate-200 dark:border-slate-600"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Title */}
          <div className="md:hidden mt-4">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h1>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
