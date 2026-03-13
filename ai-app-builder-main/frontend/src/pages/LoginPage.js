import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Sparkles } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(formData.email, formData.password);
        toast.success('Logged in successfully');
      } else {
        await authService.register(formData.email, formData.password, formData.name);
        toast.success('Account created successfully');
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div
        className="purple-glow"
        style={{ top: '20%', left: '50%', transform: 'translateX(-50%)', opacity: 0.2 }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-violet-600" />
            <span className="text-2xl font-heading font-bold">MetaBuilder</span>
          </div>
          <h1 className="text-3xl font-heading font-bold mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-zinc-400">
            {isLogin ? 'Sign in to continue building' : 'Start building amazing apps today'}
          </p>
        </div>

        <div className="glass-panel rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="text-zinc-300 mb-2 block">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                  className="bg-zinc-950 border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600"
                  data-testid="name-input"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-zinc-300 mb-2 block">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-zinc-950 border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600"
                data-testid="email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-zinc-300 mb-2 block">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-zinc-950 border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-btn"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-zinc-400 hover:text-white text-sm"
              data-testid="toggle-auth-mode-btn"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-zinc-500 hover:text-zinc-400 text-sm"
            data-testid="back-home-btn"
          >
            {'<- Back to home'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
