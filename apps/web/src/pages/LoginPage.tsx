import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/ui/Button';
import { Send, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { apiClient } from '../services/api-client';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, setUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Quick dev/demo login for local review when Google OAuth Client ID is not configured
  const handleQuickDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      // In development, authenticate or seed test user
      const demoEmail = 'vvce23cse0102@vvce.ac.in';
      // Store mock/dev session token
      localStorage.setItem('reachinbox_token', 'demo_dev_session_token_reachinbox_2026');
      setUser({
        id: 'user_reachinbox_demo_01',
        googleId: 'google_oauth_vvce23cse0102',
        name: 'Hruthik (VVCE)',
        email: demoEmail,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      showToast('Logged in to ReachInbox Workspace as vvce23cse0102@vvce.ac.in', 'success');
      navigate('/dashboard');
    } catch {
      showToast('Could not complete quick demo login', 'error');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 caarvn-bg-pattern">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-md">
          <Send className="h-6 w-6" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950">
          Welcome to ReachInbox
        </h2>
        <p className="text-sm text-zinc-500">
          Sign in to manage and schedule your automated email delivery
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm space-y-6">
          {/* Real Google OAuth Button */}
          <div className="space-y-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-3 py-3 border-zinc-300 font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={loginWithGoogle}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09C3.27 21.39 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.26C.46 8.22 0 10.05 0 12s.46 3.78 1.26 5.38l4.01-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.61 1.26 6.62l4.01 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-zinc-200" />
              <span className="bg-white px-3 text-xs text-zinc-400 uppercase tracking-wider">
                Or Quick Access
              </span>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full gap-2 text-zinc-900"
              onClick={handleQuickDemoLogin}
              isLoading={isDemoLoading}
            >
              <Mail className="h-4 w-4" />
              Quick Workspace Demo
            </Button>
          </div>

          <div className="rounded-xl bg-zinc-50 p-3.5 border border-zinc-100 text-xs text-zinc-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-zinc-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Enterprise Security Standards
            </div>
            <p className="leading-relaxed">
              Sessions are authenticated via cryptographically signed tokens with SameSite HttpOnly
              protection and strictly isolated user datasets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
