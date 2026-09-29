import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calculator,
  FileText,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Clock,
  Lightbulb,
  ListChecks,
  Link2,
} from 'lucide-react';
import { RecommendationApiResponse, RecommendationScoreBreakdown } from '../types/recommendation';
import { recommendationService } from '../services/recommendationService';

interface RecommendationDetailViewProps {
  recommendationId: string;
  onOpenGap?: (gapId: string) => void;
}

const FACTOR_ROWS: Array<{
  key: keyof Omit<RecommendationScoreBreakdown, 'source_gap_id'>;
  label: string;
  weight: string;
}> = [
  { key: 'citizen_demand', label: 'Citizen Demand', weight: '30%' },
  { key: 'population_affected', label: 'Population Affected', weight: '20%' },
  { key: 'infrastructure_gap', label: 'Infrastructure Gap', weight: '20%' },
  { key: 'urgency_severity', label: 'Urgency & Severity', weight: '15%' },
  { key: 'investment_gap', label: 'Investment Gap', weight: '10%' },
  { key: 'equity_need', label: 'Equity Need', weight: '5%' },
];

export const RecommendationDetailView: React.FC<RecommendationDetailViewProps> = ({
  recommendationId,
  onOpenGap,
}) => {
  const [record, setRecord] = useState<RecommendationApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendation = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await recommendationService.getRecommendation(id);
      setRecord(data);
    } catch (err: unknown) {
      console.error('Error fetching recommendation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendation');
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendation(recommendationId);
  }, [recommendationId]);

  if (loading && !record) {
    return (
      <div id="recommendation-loading-view" className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-stone-600 font-medium">Generating decision-support recommendation...</p>
      </div>
    );
  }

  if (error && !record) {
    return (
      <div id="recommendation-error-view" className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-lg">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>Error Loading Recommendation</span>
        </div>
        <p className="text-sm">{error}</p>
        <button
          type="button"
          onClick={() => fetchRecommendation(recommendationId)}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const rec = record!;
  const body = rec.recommendation;
  const breakdown = rec.score_breakdown;

  return (
    <div id="g4-recommendation-screen" className="space-y-8">
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 bg-indigo-50 text-indigo-800 rounded-md border border-indigo-200">
              G4 Recommendation Screen (AI Contract E)
            </span>
            <span className="text-xs font-mono text-stone-500 font-medium">
              Prompt: {rec.prompt_version}
            </span>
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            Decision-support recommendation
          </h2>
          <p className="text-xs text-stone-500 font-mono mt-1">
            Recommendation ID: {rec.recommendation_id} • Source Gap: {rec.gap_id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenGap && (
            <button
              type="button"
              id="g4-back-to-g3"
              onClick={() => onOpenGap(rec.gap_id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold hover:bg-stone-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to {rec.gap_id}
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchRecommendation(recommendationId)}
            title="Reload recommendation"
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {rec.review_required && (
        <div
          id="recommendation-review-required-banner"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-950"
        >
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Review required</p>
            <p className="text-xs font-medium mt-1">
              Evidence is insufficient for a confident recommendation. This is not an autonomous government decision.
            </p>
          </div>
        </div>
      )}

      <div
        id="g4-recommendation-narrative"
        className="bg-white border-2 border-indigo-200 rounded-2xl p-7 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-indigo-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                AI Contract E — Recommendation Generation
              </span>
              <h3 className="text-lg font-bold text-stone-900 tracking-tight mt-0.5">
                Grounded intervention narrative
              </h3>
            </div>
          </div>
          <span className="text-xs font-mono text-stone-500">Doc 13 §10 • recommendation_v1</span>
        </div>

        <section id="g4-intervention" className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-indigo-600" /> 1. Intervention
          </h4>
          <p className="text-sm font-semibold text-stone-900 leading-relaxed">{body.intervention}</p>
        </section>

        <section id="g4-why-here" className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> 2. Why here
          </h4>
          <p className="text-xs text-stone-700 leading-relaxed font-medium">{body.why_here}</p>
        </section>

        <section id="g4-why-now" className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> 3. Why now
          </h4>
          <p className="text-xs text-stone-700 leading-relaxed font-medium">{body.why_now}</p>
        </section>

        <section id="g4-expected-benefit" className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> 4. Expected benefit
          </h4>
          <p className="text-xs text-stone-700 leading-relaxed font-medium">{body.expected_benefit}</p>
        </section>

        <section id="g4-caveats" className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5 text-amber-700" /> 5. Caveats
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-amber-900 font-medium">
            {body.caveats.map((caveat, idx) => (
              <li key={idx}>{caveat}</li>
            ))}
          </ul>
        </section>

        <section id="g4-evidence" className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-slate-600" /> 6. Evidence
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {body.evidence_refs.map((ref) => (
              <span
                key={ref}
                className="px-2.5 py-0.5 rounded-md font-mono text-2xs font-semibold bg-white border border-slate-300 text-slate-800"
              >
                {ref}
              </span>
            ))}
          </div>
        </section>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="font-semibold">
            Decision-support only. This is not an autonomous government decision and no action has been executed.
          </span>
        </div>
      </div>

      <div
        id="g4-score-breakdown"
        className="bg-stone-900 text-white rounded-2xl p-7 shadow-md border-2 border-stone-800 space-y-5"
      >
        <div className="flex items-center gap-2.5 pb-4 border-b border-stone-800">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400">
              Pure deterministic calculation (non-AI)
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Score breakdown from {breakdown.source_gap_id}
            </h3>
          </div>
        </div>
        <p className="text-xs text-stone-400">
          Weighted contribution = normalized × weight × 100. Values are reused from the source gap. Gemini does not calculate or modify the priority score.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FACTOR_ROWS.map((row) => {
            const factor = breakdown[row.key];
            return (
              <div key={row.key} className="bg-stone-950/50 border border-stone-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-300">{row.label}</span>
                  <span className="text-amber-400 font-mono font-bold">{row.weight}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-white">
                    {factor.weighted_contribution.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-400">norm {factor.normalized.toFixed(3)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RecommendationDetailView;
