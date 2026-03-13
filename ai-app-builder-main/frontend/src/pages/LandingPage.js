import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Code2, Zap, Layers } from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div 
        className="purple-glow" 
        style={{ top: '-10%', left: '30%', opacity: 0.3 }}
      />
      <div 
        className="purple-glow" 
        style={{ bottom: '10%', right: '20%', opacity: 0.2 }}
      />

      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-white/5 h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-600" />
            <span className="text-xl font-heading font-bold">MetaBuilder</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              data-testid="nav-login-btn"
            >
              Login
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              className="bg-white text-black hover:bg-gray-200 font-medium px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
              data-testid="nav-signup-btn"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight leading-[1.1] mb-6 gradient-text">
              Build Apps at the
              <br />
              Speed of Thought
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
              Create full-stack applications using natural language. MetaBuilder transforms your ideas into production-ready code instantly.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button 
                onClick={() => navigate('/login')}
                className="bg-white text-black hover:bg-gray-200 font-medium px-8 py-3 rounded-lg text-lg shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
                data-testid="hero-cta-btn"
              >
                Start Building Free
              </Button>
              <Button 
                variant="secondary"
                onClick={() => navigate('/templates')}
                className="bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 px-8 py-3 rounded-lg text-lg active:scale-95"
                data-testid="hero-templates-btn"
              >
                View Templates
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-all duration-300 group">
              <div className="w-12 h-12 bg-violet-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-violet-600/20 transition-colors">
                <Code2 className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-2xl font-heading font-medium mb-3">AI-Powered Generation</h3>
              <p className="text-zinc-400">Describe your app in plain English. Our AI generates clean, production-ready code instantly.</p>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-all duration-300 group">
              <div className="w-12 h-12 bg-violet-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-violet-600/20 transition-colors">
                <Zap className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-2xl font-heading font-medium mb-3">Live Preview</h3>
              <p className="text-zinc-400">See your app come to life in real-time. Test, iterate, and refine instantly.</p>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-all duration-300 group">
              <div className="w-12 h-12 bg-violet-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-violet-600/20 transition-colors">
                <Layers className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-2xl font-heading font-medium mb-3">Export & Deploy</h3>
              <p className="text-zinc-400">Download your code or deploy with one click. Full ownership of your creation.</p>
            </div>
          </div>

          <div className="text-center bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-2xl p-12">
            <h2 className="text-4xl md:text-5xl font-heading font-semibold tracking-tight mb-4">
              Ready to build something amazing?
            </h2>
            <p className="text-zinc-400 text-lg mb-8">Join thousands of developers creating the future of apps.</p>
            <Button 
              onClick={() => navigate('/login')}
              className="bg-white text-black hover:bg-gray-200 font-medium px-10 py-3 rounded-lg text-lg shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
              data-testid="bottom-cta-btn"
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm">
          © 2026 MetaBuilder. Built with AI.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
