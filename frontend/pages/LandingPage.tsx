import React, { useState } from 'react';
import { ShieldAlert, Cpu, Sparkles, MessageSquare, Layers, Calculator, Lightbulb, KeyRound } from 'lucide-react';
import CitizenFlow from '../components/CitizenFlow';
import ClusterDetailView from '../components/ClusterDetailView';
import GapDetailView from '../components/GapDetailView';
import RecommendationDetailView from '../components/RecommendationDetailView';
import { clearGovAccessKey, getGovAccessKey, setGovAccessKey } from '../services/govAccess';

type LandingTab = 'GAP_DETAIL' | 'RECOMMENDATION' | 'CLUSTER_DETAIL' | 'CITIZEN_FLOW' | 'SYSTEM_OVERVIEW';

const GOV_TABS: LandingTab[] = ['GAP_DETAIL', 'RECOMMENDATION', 'CLUSTER_DETAIL', 'SYSTEM_OVERVIEW'];

export const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LandingTab>('GAP_DETAIL');
  const [focusRecId, setFocusRecId] = useState('REC-0001');
  const [govUnlocked, setGovUnlocked] = useState(() => Boolean(getGovAccessKey()));
  const [govKeyDraft, setGovKeyDraft] = useState('');
  const [govKeyError, setGovKeyError] = useState('');
  const [govChecking, setGovChecking] = useState(false);

  const needsGovGate = GOV_TABS.includes(activeTab) && !govUnlocked;

  const openTab = (tab: LandingTab) => {
    setActiveTab(tab);
  };

  const unlockGov = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = govKeyDraft.trim();
    if (!next) {
      setGovKeyError('Enter the government demo access key.');
      return;
    }
    setGovChecking(true);
    setGovAccessKey(next);
    try {
      const probe = await fetch('/api/v1/gaps/GAP-0001', {
        headers: { 'X-Gov-Access-Key': next },
      });
      if (probe.status === 401 || probe.status === 403) {
        clearGovAccessKey();
        setGovUnlocked(false);
        setGovKeyError('Invalid access key.');
        return;
      }
      setGovUnlocked(true);
      setGovKeyError('');
    } catch {
      clearGovAccessKey();
      setGovUnlocked(false);
      setGovKeyError('Could not verify the access key. Try again.');
    } finally {
      setGovChecking(false);
    }
  };

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
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="tab-gap-detail"
              onClick={() => openTab('GAP_DETAIL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'GAP_DETAIL'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              G3 Gap Detail
            </button>
            <button
              type="button"
              id="tab-recommendation"
              onClick={() => openTab('RECOMMENDATION')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'RECOMMENDATION'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              G4 Recommendation
            </button>
            <button
              type="button"
              id="tab-cluster-detail"
              onClick={() => openTab('CLUSTER_DETAIL')}
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
              onClick={() => openTab('CITIZEN_FLOW')}
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
              onClick={() => openTab('SYSTEM_OVERVIEW')}
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
      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 flex flex-col justify-between">
        {needsGovGate ? (
          <form id="gov-access-gate" onSubmit={unlockGov} className="max-w-md bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-stone-800">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold">Government demo access</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Cluster, gap, and recommendation screens require the shared demo key. Citizen submission stays public.
            </p>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
              Access key
              <input
                type="password"
                value={govKeyDraft}
                onChange={(e) => setGovKeyDraft(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 font-normal normal-case tracking-normal"
                autoComplete="off"
              />
            </label>
            {govKeyError ? <p className="text-sm text-red-700">{govKeyError}</p> : null}
            <button
              type="submit"
              disabled={govChecking}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-stone-950 cursor-pointer disabled:opacity-60"
            >
              {govChecking ? 'Checking…' : 'Continue'}
            </button>
          </form>
        ) : activeTab === 'GAP_DETAIL' ? (
          <GapDetailView
            onOpenRecommendation={(id) => {
              setFocusRecId(id);
              setActiveTab('RECOMMENDATION');
            }}
          />
        ) : activeTab === 'RECOMMENDATION' ? (
          <RecommendationDetailView
            recommendationId={focusRecId}
            onOpenGap={() => setActiveTab('GAP_DETAIL')}
          />
        ) : activeTab === 'CLUSTER_DETAIL' ? (
          <ClusterDetailView />
        ) : activeTab === 'CITIZEN_FLOW' ? (
          <CitizenFlow />
        ) : (
          <div id="system-overview-view" className="space-y-8">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full font-bold">
                RICE-08 Recommendation Generation
              </span>
              <h2 className="text-3xl font-extrabold text-stone-900 tracking-tight">
                Gap Assessment, Priority Engine & Advisory Recommendations
              </h2>
              <p className="text-base text-stone-600 max-w-2xl leading-relaxed">
                Aggregates community signals into gap assessments with a deterministic priority score (Doc 06 §10), an executive explanation (AI Contract D), and a grounded decision-support recommendation (AI Contract E).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500">Deterministic Engine</span>
                <h3 className="text-lg font-semibold text-stone-800">Priority Engine (30/20/20/15/10/5)</h3>
                <p className="text-sm text-stone-600 leading-normal">
                  Pure mathematical formula (0.30×Demand + 0.20×Population + 0.20×InfraGap + 0.15×Urgency + 0.10×InvestmentGap + 0.05×EquityNeed). No AI model is ever invoked to calculate, adjust, or approve numeric priority scores.
                </p>
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500">AI Contract D</span>
                <h3 className="text-lg font-semibold text-stone-800">Priority Explanation Engine</h3>
                <p className="text-sm text-stone-600 leading-normal">
                  Grounds narrative executive explanations strictly in the calculated factor values, public records, and UNKNOWN investment context without hallucinating facts or overriding mathematical priority.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer id="landing-footer" className="pt-8 mt-12 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-stone-400" />
            <span>CivicPulse AI — Operational Build RICE-08 (Recommendation Generation / AI Contract E)</span>
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
