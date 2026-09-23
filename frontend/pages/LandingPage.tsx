import React, { useState } from 'react';
import { ShieldAlert, Cpu, Sparkles, MessageSquare, Layers } from 'lucide-react';
import CitizenFlow from '../components/CitizenFlow';
import ClusterDetailView from '../components/ClusterDetailView';

export const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CITIZEN_FLOW' | 'CLUSTER_DETAIL' | 'SYSTEM_OVERVIEW'>('CLUSTER_DETAIL');

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

      {/* Navigation Header */}
      <header id="main-header" className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-500 flex items-center justify-center font-black text-lg shadow-xs">
              CP
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-stone-900 leading-none">
                CivicPulse AI
              </h1>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                From Citizen Voice to Government Action
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="tab-cluster-detail"
              onClick={() => setActiveTab('CLUSTER_DETAIL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'CLUSTER_DETAIL'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              G2 Cluster Detail (Contract C)
            </button>
            <button
              type="button"
              id="tab-citizen-flow"
              onClick={() => setActiveTab('CITIZEN_FLOW')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'CITIZEN_FLOW'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Citizen Submission (C1 → C2)
            </button>
            <button
              type="button"
              id="tab-system-overview"
              onClick={() => setActiveTab('SYSTEM_OVERVIEW')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'SYSTEM_OVERVIEW'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Pipeline Overview
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 flex flex-col justify-between">
        {activeTab === 'CLUSTER_DETAIL' ? (
          <ClusterDetailView />
        ) : activeTab === 'CITIZEN_FLOW' ? (
          <CitizenFlow />
        ) : (
          <div id="system-overview-view" className="space-y-8">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full font-bold">
                RICE-05 AI Understanding Layer
              </span>
              <h2 className="text-3xl font-extrabold text-stone-900 tracking-tight">
                AI Understanding & Multimodal Evidence Pipeline
              </h2>
              <p className="text-base text-stone-600 max-w-2xl leading-relaxed">
                Structured contracts ensuring speech audio transcription (P0-10), multimodal physical evidence analysis (P0-11, AI Contract B), and closed-taxonomy civic grievance understanding (AI Contract A) before clustering.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500">AI Contract A</span>
                <h3 className="text-lg font-semibold text-stone-800">Request Understanding Engine</h3>
                <p className="text-sm text-stone-600 leading-normal">
                  Parses narrative or voice transcript against the closed civic taxonomy (WATER, ROADS, SANITATION, POWER, etc.). Calculates multidimensional confidence (category, issue_type, intent, location) and guards against hallucinated categories.
                </p>
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500">AI Contract B</span>
                <h3 className="text-lg font-semibold text-stone-800">Multimodal Photo Evidence Analysis</h3>
                <p className="text-sm text-stone-600 leading-normal">
                  Identifies observable physical infrastructure traits from attached photos without speculating on personal identities or unstated facts. Flags material conflicts between visual evidence and textual claims.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer id="landing-footer" className="pt-8 mt-12 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-stone-400" />
            <span>CivicPulse AI — Operational Build RICE-05 (AI Understanding & Multimodal Evidence)</span>
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
