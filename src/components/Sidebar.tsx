import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Calendar, FileCode, User, LogOut, Code } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const candidateLinks = [
    { to: '/candidate-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: '/profile', label: 'My Profile', icon: <User className="h-5 w-5" /> }
  ];

  const interviewerLinks = [
    { to: '/interviewer-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: '/scheduling', label: 'Schedule Room', icon: <Calendar className="h-5 w-5" /> },
    { to: '/questions', label: 'Question Bank', icon: <FileCode className="h-5 w-5" /> },
    { to: '/profile', label: 'Interviewer Profile', icon: <User className="h-5 w-5" /> }
  ];

  const activeClass = "flex items-center gap-3 rounded-xl bg-brand-500/10 border border-brand-500/20 px-4 py-3 text-sm font-semibold text-brand-400 transition-all duration-200";
  const inactiveClass = "flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-dark-400 hover:bg-white/5 hover:text-white transition-all duration-200";

  const links = user.role === 'candidate' ? candidateLinks : interviewerLinks;

  return (
    <aside className="fixed bottom-0 left-0 top-[65px] z-30 hidden w-64 border-r border-white/5 bg-dark-950/60 p-4 md:flex md:flex-col md:justify-between">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-wider text-dark-500">Navigation</p>
          <nav className="mt-2 space-y-1">
            {links.map((link, idx) => (
              <NavLink
                key={idx}
                to={link.to}
                className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Quick Tips Box */}
        <div className="rounded-xl glass-accent p-4 border border-brand-500/10">
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-xs mb-1">
            <Code className="h-4 w-4" /> Live WebRTC Coding
          </div>
          <p className="text-[11px] text-dark-400 leading-normal">
            For code execution and WebRTC streams, verify your microphone and camera settings are enabled in the live room.
          </p>
        </div>
      </div>

      {/* Logout button */}
      <div>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/5 hover:text-rose-300 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
