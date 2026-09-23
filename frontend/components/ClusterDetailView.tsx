import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Cpu,
  FileText,
  Camera,
  Mic,
  Database,
  Briefcase,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Info,
  ChevronRight,
} from 'lucide-react';
import { clusterService } from '../services/clusterService';
import {
  ClusterDetailData,
  IssueClusterSummary,
  InfrastructureProfileContext,
  ProjectInvestmentContext,
} from '../types/cluster';

export const ClusterDetailView: React.FC = () => {
  const [clusters, setClusters] = useState<IssueClusterSummary[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string>('CLU-0001');
  const [clusterDetail, setClusterDetail] = useState<ClusterDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch cluster list
  useEffect(() => {
    async function loadClusterList() {
      try {
        setLoading(true);
        const res = await clusterService.listClusters({ limit: 50 });
        setClusters(res.items);
        if (res.items.length > 0) {
          const hero = res.items.find(
            (c) => c.cluster_id === 'CLU-0001' || c.cluster_id === 'CLU-001'
          );
          setSelectedClusterId(hero ? hero.cluster_id : res.items[0].cluster_id);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load clusters');
      } finally {
        setLoading(false);
      }
    }
    loadClusterList();
  }, []);

  // Fetch cluster detail whenever selectedClusterId changes
  useEffect(() => {
    if (!selectedClusterId) return;
    async function loadClusterDetail() {
      try {
        setDetailLoading(true);
        setErrorMessage(null);
        const data = await clusterService.getClusterById(selectedClusterId);
        setClusterDetail(data);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load cluster details');
      } finally {
        setDetailLoading(false);
      }
    }
    loadClusterDetail();
  }, [selectedClusterId]);

  const handleTriggerPipeline = async () => {
    try {
      setIsRefreshing(true);
      await clusterService.triggerPipeline();
      const listRes = await clusterService.listClusters({ limit: 50 });
      setClusters(listRes.items);
      const detailRes = await clusterService.getClusterById(selectedClusterId);
      setClusterDetail(detailRes);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Pipeline execution failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSeverityBadge = (score: number) => {
    if (score >= 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3 h-3" /> Severity {score}/5 (Critical)
        </span>
      );
    }
    if (score === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3" /> Severity {score}/5 (Moderate)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Severity {score}/5 (Low)
      </span>
    );
  };

  const getTrendBadge = (trend: string | null) => {
    if (trend === 'RISING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <TrendingUp className="w-3 h-3 text-rose-600" /> Rising
        </span>
      );
    }
    if (trend === 'FALLING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <TrendingDown className="w-3 h-3 text-emerald-600" /> Falling
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
        <Minus className="w-3 h-3 text-stone-500" /> Stable
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600" />
        <p className="text-sm font-medium text-stone-600">Loading Community Intelligence Clusters...</p>
      </div>
    );
  }

  return (
    <div id="g2-cluster-detail-screen" className="space-y-6">
      {/* Top Banner / Selection Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-900 flex items-center justify-center">
            <Layers className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span>G2 Cluster Detail</span>
              <span className="text-xs font-mono font-normal text-stone-500">
                (AI Contract C • Community Signal)
              </span>
            </h2>
            <p className="text-xs text-stone-500">
              Aggregated from citizen voice reports with taxonomy & geography guardrails
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cluster Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="cluster-selector" className="text-xs font-semibold text-stone-600">
              Select Cluster:
            </label>
            <select
              id="cluster-selector"
              value={selectedClusterId}
              onChange={(e) => setSelectedClusterId(e.target.value)}
              className="text-xs font-medium bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              {clusters.map((c) => (
                <option key={c.cluster_id} value={c.cluster_id}>
                  {c.cluster_id} — {c.canonical_issue.slice(0, 42)}... ({c.request_count} reqs)
                </option>
              ))}
            </select>
          </div>

          {/* Trigger Pipeline Button */}
          <button
            type="button"
            onClick={handleTriggerPipeline}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer border border-stone-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Re-cluster Pipeline</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {detailLoading || !clusterDetail ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600" />
          <p className="text-xs font-medium text-stone-500">Fetching cluster payload...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Cluster Overview Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-stone-900 text-amber-400 px-2.5 py-0.5 rounded">
                    {clusterDetail.cluster_id}
                  </span>
                  <span className="font-mono text-xs font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                    {clusterDetail.category_id}
                  </span>
                  <span className="font-mono text-xs font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                    {clusterDetail.issue_type_id}
                  </span>
                  {getSeverityBadge(clusterDetail.severity)}
                  {getTrendBadge(clusterDetail.trend)}
                </div>

                <h1 className="text-2xl font-black text-stone-900 tracking-tight leading-snug">
                  {clusterDetail.canonical_issue}
                </h1>

                <div className="flex items-center gap-2 text-xs text-stone-600 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>
                    {Array.isArray(clusterDetail.geographies)
                      ? clusterDetail.geographies.join(', ')
                      : clusterDetail.geo_id}
                  </span>
                </div>
              </div>

              {/* AI Execution Tracking Badge (Mandatory RICE-05/06) */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    clusterDetail.execution_source === 'LIVE_GEMINI'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-stone-100 text-stone-700 border-stone-300'
                  }`}
                >
                  {clusterDetail.execution_source === 'LIVE_GEMINI' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Live Gemini (gemini-3.6-flash)</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3.5 h-3.5 text-stone-600" />
                      <span>Deterministic Fallback</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] font-mono text-stone-400">
                  clustering_version: {clusterDetail.clustering_version || 'v1.0'}
                </span>
              </div>
            </div>

            {/* Community Signal Contract (Doc 06 §9) KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-stone-100">
              <div className="bg-stone-50/80 border border-stone-200 rounded-lg p-3">
                <span className="text-[11px] font-medium text-stone-500 block">Citizen Reports</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-stone-900">
                    {clusterDetail.request_count}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">grievances</span>
                </div>
              </div>

              <div className="bg-stone-50/80 border border-stone-200 rounded-lg p-3">
                <span className="text-[11px] font-medium text-stone-500 block">
                  Affected Population
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-stone-900">
                    {clusterDetail.affected_population.toLocaleString()}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">citizens</span>
                </div>
              </div>

              <div className="bg-stone-50/80 border border-stone-200 rounded-lg p-3">
                <span className="text-[11px] font-medium text-stone-500 block">Urgency Score</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-stone-900">
                    {clusterDetail.urgency}/5
                  </span>
                  <span className="text-xs text-stone-500 font-medium">priority</span>
                </div>
              </div>

              <div className="bg-stone-50/80 border border-stone-200 rounded-lg p-3">
                <span className="text-[11px] font-medium text-stone-500 block">Local Units</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-stone-900">
                    {clusterDetail.unique_local_units}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">ward(s)</span>
                </div>
              </div>

              <div className="bg-stone-50/80 border border-stone-200 rounded-lg p-3">
                <span className="text-[11px] font-medium text-stone-500 block">
                  Cluster Confidence
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-stone-900">
                    {Math.round(clusterDetail.cluster_confidence * 100)}%
                  </span>
                  <span className="text-xs text-stone-500 font-medium">semantic fit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dual Columns: Physical Infrastructure & Project Investments (Doc 14 §8) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Infrastructure Context Card */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-stone-700" />
                  <h3 className="text-sm font-bold text-stone-900">
                    Physical Infrastructure Context
                  </h3>
                </div>
                <span className="text-[10px] font-mono uppercase bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                  InfrastructureProfile
                </span>
              </div>

              {clusterDetail.infrastructure_context === 'UNKNOWN' ? (
                <div className="bg-stone-50 border border-dashed border-stone-300 rounded-lg p-4 text-center space-y-1.5">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 text-amber-900">
                    UNKNOWN
                  </span>
                  <p className="text-xs text-stone-600">
                    No physical infrastructure audit row registered for{' '}
                    <span className="font-semibold">{clusterDetail.category_id}</span> in{' '}
                    <span className="font-semibold">{clusterDetail.geo_id}</span>.
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Doc 14 §8 constraint: Raw table lookup only; no value is fabricated.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-stone-50 p-2.5 rounded border border-stone-100">
                      <span className="text-stone-500 text-[11px] block">Coverage Score</span>
                      <span className="text-sm font-bold text-stone-800">
                        {clusterDetail.infrastructure_context.coverage_score}%
                      </span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded border border-stone-100">
                      <span className="text-stone-500 text-[11px] block">Quality Score</span>
                      <span className="text-sm font-bold text-stone-800">
                        {clusterDetail.infrastructure_context.quality_score}%
                      </span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded border border-stone-100">
                      <span className="text-stone-500 text-[11px] block">Capacity Score</span>
                      <span className="text-sm font-bold text-stone-800">
                        {clusterDetail.infrastructure_context.capacity_score}%
                      </span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded border border-stone-100">
                      <span className="text-stone-500 text-[11px] block">Service Reliability</span>
                      <span className="text-sm font-bold text-stone-800">
                        {clusterDetail.infrastructure_context.service_reliability}%
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-500 pt-1 flex items-center justify-between border-t border-stone-100">
                    <span>
                      Audit source: {clusterDetail.infrastructure_context.data_source || 'Gov Registry'}
                    </span>
                    <span>As of: {clusterDetail.infrastructure_context.as_of_date}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Project Investment Context Card */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-stone-700" />
                  <h3 className="text-sm font-bold text-stone-900">Project Investment Context</h3>
                </div>
                <span className="text-[10px] font-mono uppercase bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                  ProjectInvestment
                </span>
              </div>

              {clusterDetail.investment_context?.status === 'UNKNOWN' ? (
                <div className="bg-stone-50 border border-dashed border-stone-300 rounded-lg p-4 text-center space-y-1.5">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 text-amber-900">
                    UNKNOWN
                  </span>
                  <p className="text-xs text-stone-600">
                    No active or planned capital project found for{' '}
                    <span className="font-semibold">{clusterDetail.category_id}</span> in{' '}
                    <span className="font-semibold">{clusterDetail.geo_id}</span>.
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Doc 14 §8 constraint: Absence is distinctly preserved as UNKNOWN.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(
                    clusterDetail.investment_context?.projects ||
                    (clusterDetail.investment_context?.project_id
                      ? [clusterDetail.investment_context]
                      : [])
                  ).map((proj: any) => (
                    <div
                      key={proj.project_id || 'proj-main'}
                      className="border border-stone-200 rounded-lg p-3 space-y-2 bg-stone-50/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] text-stone-500 block">
                            {proj.project_id}
                          </span>
                          <h4 className="text-xs font-bold text-stone-900">{proj.project_name}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            proj.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : proj.status === 'PLANNED'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {proj.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                        <div>
                          <span className="text-stone-400">Budget: </span>
                          <span className="font-semibold text-stone-800">
                            {proj.budget ? `₹${(proj.budget / 100000).toFixed(1)} Lakhs` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400">Beneficiaries: </span>
                          <span className="font-semibold text-stone-800">
                            {proj.expected_beneficiaries
                              ? proj.expected_beneficiaries.toLocaleString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {proj.coverage_target && (
                        <p className="text-[11px] text-stone-500 italic">
                          Target: {proj.coverage_target}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Representative Citizen Requests */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-stone-700" />
                  <span>Representative Member Requests ({clusterDetail.representative_requests.length})</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Key citizen voices driving this civic cluster
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {clusterDetail.representative_requests.map((req) => (
                <div
                  key={req.request_id}
                  className="border border-stone-200 rounded-lg p-4 space-y-2 hover:border-amber-400 transition-colors bg-stone-50/30"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {req.request_id}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-stone-600">
                        {req.input_modality === 'VOICE' ? (
                          <Mic className="w-3.5 h-3.5 text-amber-600" />
                        ) : req.input_modality === 'PHOTO' ? (
                          <Camera className="w-3.5 h-3.5 text-sky-600" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-stone-600" />
                        )}
                        <span>{req.input_modality}</span>
                      </span>
                      <span className="text-stone-400">•</span>
                      <span className="text-stone-500">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-stone-500">
                        Sev: {req.severity}/5 • Urg: {req.urgency}/5
                      </span>
                      {req.verification_status && (
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                          {req.verification_status}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-stone-800 leading-relaxed font-serif">
                    "{req.transcript || req.raw_text || req.issue_summary}"
                  </p>

                  {req.issue_summary && req.issue_summary !== req.raw_text && (
                    <div className="text-[11px] text-stone-500 italic bg-white p-2 rounded border border-stone-100">
                      <span className="font-semibold text-stone-600">Summary: </span>
                      {req.issue_summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Multimodal Physical Evidence References */}
          {clusterDetail.evidence_refs && clusterDetail.evidence_refs.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-stone-700" />
                  <span>Physical Evidence References ({clusterDetail.evidence_refs.length})</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Multimodal photographic and audio evidence anchoring the community signal
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {clusterDetail.evidence_refs.map((ev) => (
                  <div
                    key={ev.media_id}
                    className="border border-stone-200 rounded-lg p-3 bg-stone-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-semibold text-stone-700">{ev.media_id}</span>
                      <span className="text-[10px] font-mono bg-stone-200 px-1.5 py-0.5 rounded text-stone-800">
                        {ev.media_type}
                      </span>
                    </div>

                    <p className="text-[10px] font-mono text-stone-500 truncate" title={ev.storage_uri}>
                      {ev.storage_uri}
                    </p>

                    {ev.observable_tags && ev.observable_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {ev.observable_tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClusterDetailView;
