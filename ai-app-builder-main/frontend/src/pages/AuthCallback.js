import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/api';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        const hash = window.location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);

        if (!sessionIdMatch) {
          toast.error('Invalid session');
          navigate('/login');
          return;
        }

        const sessionId = sessionIdMatch[1];
        setStatus('Authenticating...');

        const data = await authService.handleOAuthSession(sessionId);

        setStatus('Success! Redirecting...');
        toast.success('Logged in successfully!');

        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } catch (error) {
        console.error('Auth error:', error);
        setStatus('Authentication failed');
        toast.error('Authentication failed. Please try again.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    };

    processSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-400 text-lg" data-testid="auth-status">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
