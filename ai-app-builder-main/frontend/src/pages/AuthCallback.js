import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    toast.error('OAuth callback is disabled in self-hosted mode. Use email login instead.');
    const timeout = setTimeout(() => navigate('/login', { replace: true }), 1200);
    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 text-lg" data-testid="auth-status">
          Redirecting to login...
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
