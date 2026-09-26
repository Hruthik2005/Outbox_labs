import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Send, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LandingLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex flex-col caarvn-bg-pattern">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Send className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-900">ReachInbox</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
              How It Works
            </a>
            <Link to="/dashboard" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
              Dashboard
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button size="sm" variant="outline">
                Sign In
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="sm" className="hidden sm:inline-flex items-center gap-1.5">
                Open Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Minimalist Footer */}
      <footer className="border-t border-zinc-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Send className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-900">ReachInbox</span>
            <span className="text-xs text-zinc-400 ml-2">© 2026. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <a href="http://localhost:8383/admin/queues" target="_blank" rel="noreferrer" className="hover:text-zinc-900 transition-colors">
              Bull Board Monitor
            </a>
            <a href="http://localhost:8383/api/health" target="_blank" rel="noreferrer" className="hover:text-zinc-900 transition-colors">
              System Health
            </a>
            <a href="#features" className="hover:text-zinc-900 transition-colors">
              Features
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
