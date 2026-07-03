import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { ChevronDown, LogOut, User, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 glass px-6 py-3 flex items-center justify-between">
      {/* Brand logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 text-white font-extrabold text-lg shadow-lg shadow-brand-500/20">
          CS
        </div>
        <div>
          <span className="font-bold text-white tracking-wider text-lg font-sans">CodeScreen</span>
          <span className="ml-2 rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-400 uppercase tracking-widest border border-brand-500/20">
            {user.role}
          </span>
        </div>
      </div>

      {/* Action items */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationDropdown userId={user.id} />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-xl border border-white/5 bg-dark-900/60 p-1.5 pr-3 hover:bg-dark-800 transition-all duration-200"
          >
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366F1&color=fff`}
              alt={user.name}
              className="h-8 w-8 rounded-lg object-cover border border-white/10"
            />
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
              <p className="text-[10px] text-dark-400 capitalize">{user.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-dark-400" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl glass p-2 shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 border-b border-white/5 mb-1.5">
                  <p className="text-xs text-dark-400">Signed in as</p>
                  <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-dark-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <User className="h-4 w-4" /> My Profile
                </Link>

                {user.role === 'interviewer' && (
                  <Link
                    to="/questions"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-dark-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Shield className="h-4 w-4" /> Manage Questions
                  </Link>
                )}

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors mt-1.5 border-t border-white/5 pt-2.5"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
