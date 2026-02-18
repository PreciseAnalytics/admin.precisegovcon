'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Key,
  Ban,
  CheckCircle,
  XCircle,
  Power,
  Trash2,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  isActive: boolean;
  isSuspended: boolean;
}

interface UserActionsDropdownProps {
  user: User;
  onRefresh: () => void;
  onEditUser: (user: User) => void;
  onResetPassword: (user: User) => void;
}

export default function UserActionsDropdown({
  user,
  onRefresh,
  onEditUser,
  onResetPassword,
}: UserActionsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSuspend = async () => {
    setIsOpen(false);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_suspended: !user.isSuspended }),
      });
      if (!res.ok) throw new Error();
      toast.success(user.isSuspended ? 'User unsuspended' : 'User suspended');
      onRefresh();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleToggleActive = async () => {
    setIsOpen(false);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
      onRefresh();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async () => {
    setIsOpen(false);
    if (!confirm(`Are you sure you want to delete ${user.name || user.email}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('User deleted successfully');
      onRefresh();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const menuItems = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: () => { setIsOpen(false); router.push(`/dashboard/users/${user.id}`); },
      color: 'text-slate-700',
    },
    {
      label: 'Edit User',
      icon: Edit,
      onClick: () => { setIsOpen(false); onEditUser(user); },
      color: 'text-slate-700',
    },
    {
      label: 'Reset Password',
      icon: Key,
      onClick: () => { setIsOpen(false); onResetPassword(user); },
      color: 'text-slate-700',
    },
    { divider: true },
    {
      label: user.isSuspended ? 'Unsuspend User' : 'Suspend User',
      icon: user.isSuspended ? CheckCircle : Ban,
      onClick: handleToggleSuspend,
      color: user.isSuspended ? 'text-green-600' : 'text-orange-600',
    },
    {
      label: user.isActive ? 'Deactivate User' : 'Activate User',
      icon: user.isActive ? XCircle : Power,
      onClick: handleToggleActive,
      color: user.isActive ? 'text-yellow-600' : 'text-green-600',
    },
    { divider: true },
    {
      label: 'Delete User',
      icon: Trash2,
      onClick: handleDelete,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-100 rounded-lg transition"
        title="Actions"
      >
        <MoreHorizontal className="w-5 h-5 text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          {menuItems.map((item, index) => {
            if ('divider' in item && item.divider) {
              return <div key={index} className="my-1 border-t border-slate-100" />;
            }

            const Icon = item.icon!;
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition ${item.color}`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
