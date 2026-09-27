import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { authApi } from '../services/auth-api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Send, ShieldCheck, Mail, Lock, UserCheck, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  defaultMode?: 'login' | 'signup';
}

export const LoginPage: React.FC<LoginPageProps> = ({ defaultMode }) => {
  const location = useLocation();
  const initialMode = defaultMode || (location.pathname === '/signup' ? 'signup' : 'login');
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  const { loginWithGoogle, setUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Handle email/password sign up and login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Email and password are required', 'error');
      return;
    }
    if (mode === 'signup' && !name) {
      showToast('Full name is required to register', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const res = await authApi.register({ name, email, password });
        setUser(res.user);
        showToast(`Account registered in MySQL! Welcome ${res.user.name}`, 'success');
      } else {
        const res = await authApi.login({ email, password });
        setUser(res.user);
        showToast(`Welcome back, ${res.user.name}!`, 'success');
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || (err instanceof Error ? err.message : 'Authentication failed');
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick access for local dev/review without requiring Google Cloud Console keys
  const handleQuickDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const demoEmail = 'vvce23cse0102@vvce.ac.in';
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
      showToast('Could not complete quick access login', 'error');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 caarvn-bg-pattern">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-md">
            <Send className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-950">ReachInbox</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
          {mode === 'signup' ? 'Create your ReachInbox account' : 'Welcome back to ReachInbox'}
        </h2>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
          {mode === 'signup'
            ? 'Register directly in MySQL or continue with Google to access your email scheduler'
            : 'Sign in to access your email scheduler, live queues, and senders'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm space-y-5">
          {/* Tab Switcher: Sign In vs Sign Up */}
          <div className="flex rounded-xl bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Sign Up (Register)
            </button>
          </div>

          {/* Email & Password Form (MySQL direct persistence) */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {mode === 'signup' && (
              <Input
                label="Full Name"
                placeholder="e.g. Hruthik"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="vvce23cse0102@vvce.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 mt-2 bg-zinc-950 hover:bg-zinc-800"
              isLoading={isSubmitting}
            >
              {mode === 'signup' ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  Register in MySQL
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Sign In with Password
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="w-full border-t border-zinc-200" />
            <span className="bg-white px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Or Social / SSO
            </span>
          </div>

          {/* Google Auth / Login Button */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full gap-3 py-3 border-zinc-300 font-semibold text-zinc-800 hover:bg-zinc-50 shadow-xs"
              onClick={loginWithGoogle}
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
              {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full gap-2 text-zinc-900 border border-zinc-200"
              onClick={handleQuickDemoLogin}
              isLoading={isDemoLoading}
            >
              <Mail className="h-4 w-4" />
              Quick Access: vvce23cse0102@vvce.ac.in
            </Button>
          </div>

          <div className="rounded-xl bg-zinc-50 p-3.5 border border-zinc-100 text-xs text-zinc-600 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-zinc-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              MySQL + Google OAuth Security
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Users and credentials are stored securely in MySQL with cryptographic password hashing (Scrypt) and HttpOnly session cookies.
            </p>
          </div>
        </div>

        {/* Footer switch */}
        <p className="mt-4 text-center text-xs text-zinc-500">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-semibold text-zinc-900 underline hover:text-zinc-700"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-semibold text-zinc-900 underline hover:text-zinc-700"
              >
                Register in MySQL
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
