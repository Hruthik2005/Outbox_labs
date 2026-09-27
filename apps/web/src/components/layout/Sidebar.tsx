import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Mail,
  LayoutGrid,
  MailPlus,
  CalendarClock,
  Send,
  Plug,
  Activity,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-zinc-100 text-zinc-950 font-semibold'
        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-zinc-200/80 flex flex-col h-full select-none">
      {/* Brand Header matching screenshot */}
      <div className="p-5 flex items-center gap-3 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-xs">
          <Mail className="h-4 w-4" />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-zinc-950">
          ReachInbox Operations
        </span>
      </div>

      <div className="h-px bg-zinc-100 mx-5 shrink-0" />

      {/* Navigation Sections */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* WORKSPACE GROUP */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            Workspace
          </div>
          <nav className="space-y-1">
            <NavLink
              to="/dashboard"
              end
              onClick={onCloseMobile}
              className={navItemClass}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span>Overview</span>
            </NavLink>

            <NavLink
              to="/compose"
              onClick={onCloseMobile}
              className={navItemClass}
            >
              <MailPlus className="h-4 w-4 shrink-0" />
              <span>Campaign Builder</span>
            </NavLink>

            <NavLink
              to="/scheduled"
              onClick={onCloseMobile}
              className={navItemClass}
            >
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>Scheduled</span>
            </NavLink>

            <NavLink
              to="/sent"
              onClick={onCloseMobile}
              className={navItemClass}
            >
              <Send className="h-4 w-4 shrink-0" />
              <span>Sent</span>
            </NavLink>
          </nav>
        </div>

        {/* SYSTEM GROUP */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            System
          </div>
          <nav className="space-y-1">
            <NavLink
              to="/settings"
              onClick={onCloseMobile}
              className={navItemClass}
            >
              <Plug className="h-4 w-4 shrink-0" />
              <span>Integrations</span>
            </NavLink>

            <NavLink
              to="/queue-monitor"
              onClick={onCloseMobile}
              className={navItemClass}
            >
              <Activity className="h-4 w-4 shrink-0" />
              <span>Queue Monitor</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Footer User Profile Card */}
      <div className="p-4 border-t border-zinc-100 bg-white shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.name || 'User'}
                className="h-8 w-8 rounded-full border border-zinc-200 object-cover shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'H'}
              </div>
            )}
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold text-zinc-900 truncate">
                {user?.name || 'Hruthik (VVCE)'}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {user?.email || 'vvce23cse0102@vvce.ac.in'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
