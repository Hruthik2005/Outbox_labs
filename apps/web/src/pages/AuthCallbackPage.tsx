import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { authApi } from '../services/auth-api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const AuthCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    async function completeAuth() {
      const token = params.get('token');
      if (token) {
        localStorage.setItem('reachinbox_token', token);
      }

      try {
        const profile = await authApi.getMe();
        setUser(profile);
        showToast('Successfully authenticated!', 'success');
        navigate('/dashboard');
      } catch (err) {
        console.error('Callback error', err);
        showToast('Authentication failed. Please try again.', 'error');
        navigate('/login');
      }
    }

    completeAuth();
  }, [params, navigate, setUser, showToast]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-zinc-600">Completing authentication...</p>
      </div>
    </div>
  );
};
