import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  LayoutPanelTop,
  Rocket,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { Button } from '../components/ui/button';

const featureCards = [
  {
    title: 'Prompt To Product',
    description:
      'Describe your app once and generate full React + FastAPI structure with real file outputs.',
    icon: WandSparkles,
  },
  {
    title: 'Visual Builder Loop',
    description:
      'Iterate from the same project context with quick prompts, live preview, and saved project history.',
    icon: LayoutPanelTop,
  },
  {
    title: 'Ship With Ownership',
    description:
      'Export your codebase, deploy, and share links without locking your team into a black-box runtime.',
    icon: Rocket,
  },
];

const flowSteps = [
  'Pick a template or start from a blank prompt.',
  'Generate code and refine with directed updates.',
  'Deploy or export your project when it is production-ready.',
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-dark-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute right-0 top-48 h-96 w-96 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl" />
      </div>

      <nav className="fixed top-0 z-50 h-16 w-full border-b border-white/10 bg-dark-900/70 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <span className="text-lg font-bold tracking-tight">MetaBuilder</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-zinc-300 hover:bg-white/5 hover:text-white"
              data-testid="nav-login-btn"
            >
              Login
            </Button>
            <Button
              onClick={() => navigate('/login')}
              className="bg-cyan-400 text-black hover:bg-cyan-300"
              data-testid="nav-signup-btn"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-28">
        <section className="grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Build full-stack apps from prompts
            </div>

            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
              Faster layout.
              <br />
              Cleaner shipping.
              <br />
              Less glue code.
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-zinc-300 md:text-xl">
              MetaBuilder gives your team a structured workflow from prompt to deploy, so you spend more
              time on product decisions and less time wiring boilerplate.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button
                onClick={() => navigate('/login')}
                className="h-11 bg-cyan-400 px-7 text-base font-semibold text-black hover:bg-cyan-300"
                data-testid="hero-cta-btn"
              >
                Start Building
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/templates')}
                className="h-11 border-zinc-700 bg-zinc-900/70 px-7 text-base text-zinc-100 hover:bg-zinc-800"
                data-testid="hero-templates-btn"
              >
                Explore Templates
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Setup Time</p>
                <p className="mt-2 text-2xl font-bold">Minutes</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Collaboration</p>
                <p className="mt-2 text-2xl font-bold">Project Based</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Delivery</p>
                <p className="mt-2 text-2xl font-bold">Export Ready</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-card">
              <div className="mb-5 flex items-center justify-between border-b border-zinc-800 pb-4">
                <p className="text-sm font-medium text-zinc-200">Build Session</p>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                  Active
                </span>
              </div>

              <div className="space-y-4 text-sm">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Prompt</p>
                  <p className="text-zinc-100">
                    Build a dashboard with auth, analytics cards, and project sharing.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Generated Files</p>
                  <ul className="space-y-2 font-mono text-xs text-cyan-200">
                    <li>src/pages/Dashboard.js</li>
                    <li>src/components/ProjectCard.jsx</li>
                    <li>backend/server.py</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Deployment Status</p>
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-cyan-400 to-orange-400" />
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">Preview build is 75% complete.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-3">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:-translate-y-1 hover:border-cyan-400/40"
            >
              <div className="mb-4 inline-flex rounded-lg bg-cyan-400/10 p-2 text-cyan-300 transition-colors group-hover:bg-cyan-400/20">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
            </article>
          ))}
        </section>

        <section className="mt-20 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 md:p-10">
          <div className="mb-8 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-orange-300" />
            <h2 className="text-2xl font-bold md:text-3xl">How It Flows</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {flowSteps.map((step, index) => (
              <div key={step} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
                <p className="text-xs uppercase tracking-wide text-orange-300">Step {index + 1}</p>
                <p className="mt-3 text-sm text-zinc-300">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-primary-500/10 to-orange-500/10 p-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Ready to ship your next app faster?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-300">
            Start with a template, iterate with prompts, and move from idea to deploy in one workspace.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="mt-8 h-11 bg-cyan-400 px-8 text-base font-semibold text-black hover:bg-cyan-300"
            data-testid="bottom-cta-btn"
          >
            Launch MetaBuilder
          </Button>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto max-w-7xl px-6 text-sm text-zinc-500">
          (c) 2026 MetaBuilder
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
