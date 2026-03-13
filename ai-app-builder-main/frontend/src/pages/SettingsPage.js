import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Sparkles, ArrowLeft, User, Rocket, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SettingsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vercelToken, setVercelToken] = useState('');
  const [netlifyToken, setNetlifyToken] = useState('');
  const [preferredPlatform, setPreferredPlatform] = useState('vercel');
  const [savingVercel, setSavingVercel] = useState(false);
  const [savingNetlify, setSavingNetlify] = useState(false);
  const [vercelConnected, setVercelConnected] = useState(false);
  const [netlifyConnected, setNetlifyConnected] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const userData = await authService.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadDeploymentSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/deployment/settings`, {
        withCredentials: true,
      });
      setVercelConnected(response.data.vercel_connected);
      setNetlifyConnected(response.data.netlify_connected);
      setPreferredPlatform(response.data.preferred_platform || 'vercel');
    } catch (error) {
      console.error('Failed to load deployment settings:', error);
    }
  }, []);

  useEffect(() => {
    loadUser();
    loadDeploymentSettings();
  }, [loadDeploymentSettings, loadUser]);

  const handleSaveVercel = async () => {
    if (!vercelToken.trim()) {
      toast.error('Please enter a Vercel token');
      return;
    }

    setSavingVercel(true);
    try {
      await axios.post(
        `${API_URL}/deployment/vercel/token`,
        { token: vercelToken },
        { withCredentials: true }
      );

      toast.success('Vercel token saved and verified!');
      setVercelToken('');
      setVercelConnected(true);
    } catch (error) {
      console.error('Vercel token error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save Vercel token');
    } finally {
      setSavingVercel(false);
    }
  };

  const handleSaveNetlify = async () => {
    if (!netlifyToken.trim()) {
      toast.error('Please enter a Netlify token');
      return;
    }

    setSavingNetlify(true);
    try {
      await axios.post(
        `${API_URL}/deployment/netlify/token`,
        { token: netlifyToken },
        { withCredentials: true }
      );

      toast.success('Netlify token saved and verified!');
      setNetlifyToken('');
      setNetlifyConnected(true);
    } catch (error) {
      console.error('Netlify token error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save Netlify token');
    } finally {
      setSavingNetlify(false);
    }
  };

  const handleSavePreference = async (platform) => {
    try {
      await axios.post(
        `${API_URL}/deployment/preference`,
        { platform },
        { withCredentials: true }
      );
      setPreferredPlatform(platform);
      toast.success(`Preferred platform set to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="text-zinc-400 hover:text-white"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-600" />
              <span className="text-xl font-heading font-bold">Settings</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-3">
            Settings
          </h1>
          <p className="text-zinc-400 text-lg">Manage your account and deployment preferences</p>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-heading font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-violet-600" />
              Profile
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Name</label>
                <p className="text-white" data-testid="user-name">{user?.name}</p>
              </div>
              
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Email</label>
                <p className="text-white" data-testid="user-email">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-heading font-semibold mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-violet-600" />
              Vercel Deployment
            </h2>
            
            <div className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-zinc-300 mb-2">
                  <strong>Setup Instructions:</strong>
                </p>
                <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">https://vercel.com/account/tokens</a></li>
                  <li>Create a new token with scopes: <code className="bg-zinc-800 px-1 rounded">deployments</code> (write), <code className="bg-zinc-800 px-1 rounded">projects</code> (read/write)</li>
                  <li>Paste the token below and click "Save & Test"</li>
                </ol>
                <p className="text-xs text-amber-500 mt-2">⚠️ Never share your token publicly</p>
              </div>

              <div>
                <Label htmlFor="vercel-token" className="text-zinc-300 mb-2 block">
                  Vercel Personal Access Token
                  {vercelConnected && (
                    <span className="ml-2 text-green-500 text-sm inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Connected
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="vercel-token"
                    type="password"
                    placeholder="Enter your Vercel token..."
                    value={vercelToken}
                    onChange={(e) => setVercelToken(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 focus:border-violet-500"
                    data-testid="vercel-token-input"
                  />
                  <Button
                    onClick={handleSaveVercel}
                    disabled={savingVercel || !vercelToken.trim()}
                    className="bg-violet-600 hover:bg-violet-700 whitespace-nowrap"
                    data-testid="save-vercel-btn"
                  >
                    {savingVercel ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Save & Test'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-heading font-semibold mb-4">
              Netlify Deployment (Optional)
            </h2>
            
            <div className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-zinc-300 mb-2">
                  <strong>Setup Instructions:</strong>
                </p>
                <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://app.netlify.com/user/applications" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">https://app.netlify.com/user/applications</a></li>
                  <li>Create a new personal access token</li>
                  <li>Paste the token below and click "Save & Test"</li>
                </ol>
              </div>

              <div>
                <Label htmlFor="netlify-token" className="text-zinc-300 mb-2 block">
                  Netlify Personal Access Token
                  {netlifyConnected && (
                    <span className="ml-2 text-green-500 text-sm inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Connected
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="netlify-token"
                    type="password"
                    placeholder="Enter your Netlify token..."
                    value={netlifyToken}
                    onChange={(e) => setNetlifyToken(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 focus:border-violet-500"
                    data-testid="netlify-token-input"
                  />
                  <Button
                    onClick={handleSaveNetlify}
                    disabled={savingNetlify || !netlifyToken.trim()}
                    className="bg-violet-600 hover:bg-violet-700 whitespace-nowrap"
                    data-testid="save-netlify-btn"
                  >
                    {savingNetlify ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Save & Test'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-heading font-semibold mb-4">
              Preferred Deployment Platform
            </h2>
            
            <div className="flex gap-4">
              <button
                onClick={() => handleSavePreference('vercel')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  preferredPlatform === 'vercel'
                    ? 'border-violet-600 bg-violet-600/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
                data-testid="select-vercel"
              >
                <div className="font-semibold mb-1">Vercel</div>
                <div className="text-sm text-zinc-400">Optimized for React & Next.js</div>
              </button>
              <button
                onClick={() => handleSavePreference('netlify')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  preferredPlatform === 'netlify'
                    ? 'border-violet-600 bg-violet-600/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
                data-testid="select-netlify"
              >
                <div className="font-semibold mb-1">Netlify</div>
                <div className="text-sm text-zinc-400">Great for static sites</div>
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-heading font-semibold mb-4">
              AI Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-2">Default AI Provider</label>
                <p className="text-zinc-500 text-sm">
                  You can select your preferred AI provider (OpenAI, Claude, or Gemini) when creating each project.
                </p>
              </div>
              
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <p className="text-sm text-zinc-400">
                  <strong className="text-violet-400">Note:</strong> MetaBuilder uses Emergent LLM Key for seamless AI access. No additional API keys required.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-heading font-semibold mb-4">
              About
            </h2>
            <p className="text-zinc-400 text-sm">
              MetaBuilder v1.0 - Build apps at the speed of thought.
              <br />
              Powered by multiple AI models for maximum flexibility.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
