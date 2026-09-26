import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Send, LogOut, ExternalLink, Activity } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Send className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-900">ReachInbox</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'Overview', path: '/dashboard' },
              { label: 'Scheduled', path: '/scheduled' },
              { label: 'Sent History', path: '/sent' },
              { label: 'Senders', path: '/senders' },
              { label: 'Settings', path: '/settings' }
            ].map((tab) => {
              const active = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Bull Board Link & User Profile */}
        <div className="flex items-center gap-3">
          <a
            href="http://localhost:8383/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            title="Open Live BullMQ Dashboard"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            Bull Board
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </a>

          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-200">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-zinc-900">{user.name}</p>
                <p className="text-[11px] text-zinc-500">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
