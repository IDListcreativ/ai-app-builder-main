import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { githubService } from '../lib/api';
import { toast } from 'sonner';

const GitHubCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          toast.error('GitHub authorization failed');
          navigate('/dashboard');
          return;
        }

        if (!code) {
          toast.error('Invalid callback');
          navigate('/dashboard');
          return;
        }

        setStatus('Connecting to GitHub...');
        await githubService.handleCallback(code);

        toast.success('GitHub connected successfully!');
        navigate('/dashboard');
      } catch (error) {
        console.error('GitHub callback error:', error);
        toast.error('Failed to connect GitHub');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-400 text-lg">{status}</p>
      </div>
    </div>
  );
};

export default GitHubCallback;
