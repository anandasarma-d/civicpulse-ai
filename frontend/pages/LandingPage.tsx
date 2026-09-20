import React from 'react';
import { Activity, Layers, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div id="landing-page" className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Visible Mandatory Prototype Banner */}
      <div 
        id="prototype-banner"
        className="w-full bg-amber-500 text-stone-950 px-4 py-2 text-center text-sm font-semibold tracking-wide uppercase shadow-sm flex items-center justify-center gap-2"
      >
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Synthetic/demo data — prototype only</span>
      </div>

      {/* Main Container */}
      <main id="main-content" className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col justify-between">
        {/* Header and Hero Block */}
        <div id="hero-section" className="space-y-8 pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-stone-300 bg-white text-xs font-medium text-stone-600 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Stage: RICE-01 Bootstrap & Architecture Setup
          </div>

          <div className="space-y-4">
            <h1 id="app-title" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900">
              CivicPulse AI
            </h1>
            <p id="app-tagline" className="text-xl sm:text-2xl text-stone-600 font-medium tracking-tight">
              From Citizen Voice to Government Action
            </p>
          </div>

          <p className="text-base text-stone-600 max-w-2xl leading-relaxed">
            A real-time civic intelligence platform bridging community input with actionable public administration insights. Currently initialized in foundational scaffolding mode for the <span className="font-semibold text-stone-800">Build with AI: Code for Communities 2.0</span> challenge.
          </p>
        </div>

        {/* Architecture & Pipeline Architecture Status (Read-Only) */}
        <div id="architecture-overview" className="my-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div id="module-backend" className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-500">Backend Core</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800">Express Node.js</h3>
            <p className="text-sm text-stone-500 leading-normal">
              Stateless service layer with active <code className="font-mono text-xs bg-stone-100 px-1 py-0.5 rounded text-stone-700">GET /health</code> endpoint ready for Cloud Run containerization.
            </p>
          </div>

          <div id="module-frontend" className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-500">Client Shell</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800">React + Vite</h3>
            <p className="text-sm text-stone-500 leading-normal">
              Modular structure configured with structured routes, pages, components, services, and domain types.
            </p>
          </div>

          <div id="module-ai-pipeline" className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-500">AI Framework</span>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800">Prompt & Data Stubs</h3>
            <p className="text-sm text-stone-500 leading-normal">
              Standardized schemas, prompt versioning placeholders, and evaluation suites staged for subsequent phases.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <footer id="landing-footer" className="pt-8 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-stone-400" />
            <span>CivicPulse AI — Scaffolding Build RICE-01</span>
          </div>
          <div className="text-center sm:text-right">
            <span>Build with AI: Code for Communities 2.0</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
