import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  Sparkles,
  ShieldCheck,
  Building,
  Users,
  AlertTriangle,
  Coins,
  HeartHandshake,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Sliders,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { GapAssessmentRecord } from '../types/gap';
import { gapService } from '../services/gapService';

interface GapDetailViewProps {
  onOpenRecommendation?: (recommendationId: string) => void;
}

export const GapDetailView: React.FC<GapDetailViewProps> = ({ onOpenRecommendation }) => {
  const [gaps, setGaps] = useState<GapAssessmentRecord[]>([]);
  const [selectedGapId, setSelectedGapId] = useState<string>('GAP-0001');
  const [selectedGap, setSelectedGap] = useState<GapAssessmentRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const listRes = await gapService.listGaps();
      setGaps(listRes.items || []);

      const activeId = selectedGapId || (listRes.items.length > 0 ? listRes.items[0].gap_id : 'GAP-0001');
      const gapDetail = await gapService.getGap(activeId);
      setSelectedGap(gapDetail);
    } catch (err: unknown) {
      console.error('Error fetching gaps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gap assessment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGaps();
  }, []);

  const handleSelectGap = async (gapId: string) => {
    setSelectedGapId(gapId);
    try {
      setLoading(true);
      const gapDetail = await gapService.getGap(gapId);
      setSelectedGap(gapDetail);
    } catch (err: unknown) {
      console.error('Error loading gap details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gap details');
    } finally {
      setLoading(false);
    }
  };

  const getBandBadge = (band: string) => {
    switch (band) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            CRITICAL PRIORITY (score &gt;= 90.0)
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            HIGH PRIORITY (60.0 &lt;= score &lt; 90.0)
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-900 border border-blue-300">
            MEDIUM PRIORITY (40.0 &lt;= score &lt; 60.0)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-800 border border-stone-300">
            LOW PRIORITY (score &lt; 40.0)
          </span>
        );
    }
  };

  if (loading && !selectedGap) {
    return (
      <div id="gap-loading-view" className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
        <p className="text-stone-600 font-medium">Evaluating Infrastructure Gaps & Deterministic Priority Engine...</p>
      </div>
    );
  }

  if (error && !selectedGap) {
    return (
      <div id="gap-error-view" className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-lg">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>Error Loading Gap Assessment</span>
        </div>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchGaps}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const gap = selectedGap!;
  const raw = gap.factors.raw;
  const norm = gap.factors.normalized;
  const priority = gap.priority;
  const explanation = gap.explanation;

  return (
    <div id="g3-gap-detail-screen" className="space-y-8">
      {/* Top Header & Selector */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 bg-stone-100 text-stone-700 rounded-md border border-stone-200">
              G3 Gap & Priority Detail Screen (P0-22)
            </span>
            <span className="text-xs font-mono text-stone-500 font-medium">
              Calculation Version: {gap.calculation_version}
            </span>
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <span>{gap.title}</span>
          </h2>
          <p className="text-xs text-stone-500 font-mono mt-1">
            Gap ID: {gap.gap_id} • Cluster: {gap.cluster_id} • Category: {gap.category_id} • Geo ID: {gap.geo_id}
          </p>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="gap-selector" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
            Select Gap:
          </label>
          <select
            id="gap-selector"
            value={selectedGapId}
            onChange={(e) => handleSelectGap(e.target.value)}
            className="px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 shadow-2xs hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            {gaps.map((g) => (
              <option key={g.gap_id} value={g.gap_id}>
                Rank #{g.priority.rank} — {g.gap_id} ({g.category_id}, Score: {g.priority.priority_score.toFixed(1)})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchGaps}
            title="Reload Gap Assessments"
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SECTION 1: DETERMINISTIC PRIORITY ENGINE (AUTHORITATIVE MATHEMATICAL SCORE) */}
      <div
        id="deterministic-priority-container"
        className="bg-stone-900 text-white rounded-2xl p-7 shadow-md border-2 border-stone-800 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Calculator className="w-32 h-32 text-white" />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header Banner Clearly Marking Deterministic Application Engine */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400">
                  PURE DETERMINISTIC CALCULATION (NON-AI)
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Deterministic Priority Engine (Doc 06 §10 / Doc 11 §10)
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getBandBadge(priority.priority_band)}
              <span className="text-xs font-mono bg-stone-800 text-stone-300 px-3 py-1 rounded-full border border-stone-700">
                City Rank #{priority.rank}
              </span>
            </div>
          </div>

          {/* Large Authoritative Score Callout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-1 bg-stone-950/60 p-5 rounded-xl border border-stone-800 text-center">
              <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">
                Priority Score
              </span>
              <div className="text-5xl font-black text-amber-400 my-1 font-mono">
                {priority.priority_score.toFixed(1)}
              </div>
              <span className="text-xs text-stone-400">
                Scale 0 – 100 • Frozen Hero Specification
              </span>
            </div>

            <div className="md:col-span-2 space-y-2 text-stone-300">
              <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">
                Approved 30/20/20/15/10/5 Weight Formula:
              </span>
              <div className="font-mono text-xs bg-stone-950/80 p-3 rounded-lg border border-stone-800 text-amber-300 overflow-x-auto">
                {priority.formula}
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                <strong className="text-stone-300">Deterministic Guarantee:</strong> This numeric score is produced entirely by deterministic application arithmetic. Gemini is strictly barred from modifying, adjusting, approving, or interpreting the score or ranking.
              </p>
            </div>
          </div>

          {/* Six Approved Factors Breakdown Grid */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Six Approved Input Factors (Normalized 0 – 1)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Factor 1: Citizen Demand (30%) */}
              <div className="bg-stone-950/50 border border-stone-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> Citizen Demand
                  </span>
                  <span className="text-amber-400 font-mono font-bold">30% Weight</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-white">
                    {norm.citizen_demand.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-400">Raw: {raw.citizen_demand} requests</span>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${norm.citizen_demand * 100}%` }}
                  />
                </div>
              </div>

              {/* Factor 2: Population Affected (20%) */}
              <div className="bg-stone-950/50 border border-stone-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-indigo-400" /> Population Affected
                  </span>
                  <span className="text-amber-400 font-mono font-bold">20% Weight</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-white">
                    {norm.population_affected.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-400">
                    Raw: {raw.population_affected.toLocaleString()} citizens
                  </span>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${norm.population_affected * 100}%` }}
                  />
                </div>
              </div>

              {/* Factor 3: Infrastructure Gap (20%) */}
              <div className="bg-stone-950/50 border border-stone-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Infrastructure Gap
                  </span>
                  <span className="text-amber-400 font-mono font-bold">20% Weight</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-white">
                    {norm.infrastructure_gap.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-400">Raw: {raw.infrastructure_gap}% deficiency</span>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${norm.infrastructure_gap * 100}%` }}
                  />
                </div>
              </div>

              {/* Factor 4: Urgency / Severity (15%) */}
              <div className="bg-stone-950/50 border border-stone-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                    <BadgeAlert className="w-3.5 h-3.5 text-amber-400" /> Urgency & Severity
                  </span>
                  <span className="text-amber-400 font-mono font-bold">15% Weight</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-white">
                    {norm.urgency_severity.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-400">Raw: {raw.urgency_severity}/100</span>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${norm.urgency_severity * 100}%` }}
                  />
                </div>
              </div>

              {/* Factor 5: Investment Gap (10%) */}
              <div className="bg-stone-950/50 border border-stone-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" /> Investment Gap
                  </span>
                  <span className="text-amber-400 font-mono font-bold">10% Weight</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-white">
                    {norm.investment_gap.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-400">
                    {norm.investment_gap === 1.0 ? 'UNKNOWN (100% gap)' : `Raw: ${raw.investment_gap}%`}
                  </span>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${norm.investment_gap * 100}%` }}
                  />
                </div>
              </div>

              {/* Factor 6: Equity Need (5%) */}
              <div className="bg-stone-950/50 border border-stone-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-purple-400" /> Equity Need
                  </span>
                  <span className="text-amber-400 font-mono font-bold">5% Weight</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-white">
                    {norm.equity_need.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-400">Raw: {raw.equity_need}% index</span>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${norm.equity_need * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: AI CONTRACT D — PRIORITY EXPLANATION (GEMINI-GENERATED, VISUALLY DISTINCT) */}
      <div
        id="gemini-explanation-container"
        className="bg-white border-2 border-indigo-200 rounded-2xl p-7 shadow-xs space-y-6 relative"
      >
        {/* Distinctive AI Visual Identity Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-indigo-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                  AI Contract D — Priority Explanation
                </span>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
                    explanation.is_live_ai
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-stone-100 text-stone-700 border border-stone-300'
                  }`}
                >
                  {explanation.execution_source === 'LIVE_GEMINI'
                    ? '● Live Gemini (gemini-3.6-flash)'
                    : '○ Deterministic Fallback'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 tracking-tight mt-0.5">
                Executive Grounded Explanation ({explanation.prompt_version})
              </h3>
            </div>
          </div>

          <div className="text-xs font-mono text-stone-500">
            Prompt: priority_explanation_v1 • Version: Doc 13 §9
          </div>
        </div>

        {/* AI Explanation Narrative (Doc 13 §9 Exact Schema) */}
        <div className="space-y-4">
          {/* 1. Headline */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-900 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Executive Headline
            </h4>
            <p className="text-sm font-semibold text-stone-900 leading-relaxed">
              {explanation.headline || explanation.summary}
            </p>
          </div>

          {/* 2. Why High or Low */}
          {explanation.why_high_or_low && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600">
                Priority Band Rationale ({selectedGap?.priority?.priority_band})
              </h4>
              <p className="text-xs text-stone-700 leading-relaxed font-medium">
                {explanation.why_high_or_low}
              </p>
            </div>
          )}

          {/* 3. Factor Explanations */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
              Factor Explanations (Doc 13 §9):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {Array.isArray(explanation.factor_explanations) && explanation.factor_explanations.length > 0 ? (
                explanation.factor_explanations.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white border border-stone-200 rounded-lg p-3 text-xs text-stone-700 shadow-2xs space-y-1"
                  >
                    <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{item.factor}</span>
                    </div>
                    <p className="text-stone-600 text-2xs leading-relaxed">{item.explanation}</p>
                  </div>
                ))
              ) : (
                explanation.driving_factors?.map((factor, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2.5 bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-700"
                  >
                    <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{factor}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Resolvable Evidence References (Doc 15 §12) */}
          {Array.isArray(explanation.evidence_refs) && explanation.evidence_refs.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" /> Evidence References (Doc 15 §12 Resolvable):
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {explanation.evidence_refs.map((ref, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md font-mono text-2xs font-semibold bg-white border border-slate-300 text-slate-800"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 5. Uncertainties & Data Limitations */}
          {Array.isArray(explanation.uncertainties) && explanation.uncertainties.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Identified Data Limitations & Uncertainties:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 font-medium">
                {explanation.uncertainties.map((u, idx) => (
                  <li key={idx}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 6. Mandatory Decision Support Disclaimer (Doc 06 §11) */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
            <span className="font-semibold">
              {explanation.decision_support_note || 'Final prioritization remains with authorized officials.'}
            </span>
          </div>
        </div>

        {/* Mandatory Transparency Disclaimer */}
        <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-2xs text-stone-500 font-mono">
          <span>Rule: Gemini MUST NOT recalculate, alter, or reinterpret numeric scores.</span>
          <span>Status: {explanation.status}</span>
        </div>
      </div>

      {gap.recommendation_id && onOpenRecommendation && (
        <div
          id="g3-to-g4-recommendation-link"
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
              AI Contract E — Recommendation
            </span>
            <p className="text-sm text-stone-700 mt-2 font-medium">
              Open the decision-support recommendation generated from this gap.
            </p>
            <p className="text-xs font-mono text-stone-500 mt-1">
              {gap.recommendation_id} • advisory only • not an executed action
            </p>
          </div>
          <button
            type="button"
            id="open-recommendation-from-g3"
            onClick={() => onOpenRecommendation(gap.recommendation_id!)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
          >
            View {gap.recommendation_id}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default GapDetailView;
