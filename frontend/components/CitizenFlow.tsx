import React, { useState } from 'react';
import {
  Mic,
  Camera,
  MapPin,
  Send,
  AlertTriangle,
  HelpCircle,
  Clock,
  Sparkles,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  requestService,
  CitizenRequestDetails,
  CreateRequestPayload,
} from '../services/requestService';

export const CitizenFlow: React.FC = () => {
  // Step State: 'C1_REPORT' | 'PROCESSING' | 'C2_RESULT'
  const [step, setStep] = useState<'C1_REPORT' | 'PROCESSING' | 'C2_RESULT'>('C1_REPORT');
  const [modality, setModality] = useState<'TEXT' | 'VOICE' | 'PHOTO' | 'MIXED'>('TEXT');
  const [language, setLanguage] = useState<'en' | 'kn' | 'hi'>('en');
  const [narrative, setNarrative] = useState('');
  const [geoId, setGeoId] = useState('GEO-LOC-BLR-01');
  const [includeLocation, setIncludeLocation] = useState(true);
  const [includePhoto, setIncludePhoto] = useState(false);
  const [photoType, setPhotoType] = useState<'AGREEMENT' | 'CONFLICT'>('AGREEMENT');
  const [includeAudio, setIncludeAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [submittedRequest, setSubmittedRequest] = useState<CitizenRequestDetails | null>(null);

  // Presets for quick evaluation demonstration
  const handleApplyPreset = (type: 'HERO_WATER' | 'VOICE_HERO' | 'PHOTO_CONFLICT' | 'MISSING_LOC') => {
    setErrorMessage(null);
    if (type === 'HERO_WATER') {
      setModality('TEXT');
      setLanguage('en');
      setNarrative('Drinking water pipeline ruptured on 80ft Road Whitefield, no water supply for 4 days for 500 houses.');
      setGeoId('GEO-LOC-BLR-01');
      setIncludeLocation(true);
      setIncludePhoto(false);
      setIncludeAudio(false);
    } else if (type === 'VOICE_HERO') {
      setModality('VOICE');
      setLanguage('en');
      setNarrative('');
      setGeoId('GEO-LOC-BLR-01');
      setIncludeLocation(true);
      setIncludePhoto(false);
      setIncludeAudio(true);
    } else if (type === 'PHOTO_CONFLICT') {
      setModality('MIXED');
      setLanguage('en');
      setNarrative('Severe water pipeline rupture flooding street pavement.');
      setGeoId('GEO-LOC-BLR-01');
      setIncludeLocation(true);
      setIncludePhoto(true);
      setPhotoType('CONFLICT');
      setIncludeAudio(false);
    } else if (type === 'MISSING_LOC') {
      setModality('TEXT');
      setLanguage('en');
      setNarrative('Drinking water pipeline has broken completely and no tankers have come to help residents.');
      setIncludeLocation(false);
      setIncludePhoto(false);
      setIncludeAudio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    setStep('PROCESSING');

    try {
      // Build media payload if selected
      const mediaList: CreateRequestPayload['media'] = [];
      if (includePhoto) {
        mediaList.push({
          media_type: 'PHOTO',
          uri:
            photoType === 'CONFLICT'
              ? 'gs://civicpulse-bucket/photos/conflict_clean_room.jpg'
              : 'gs://civicpulse-bucket/photos/pipeline_water_leak.jpg',
          mime_type: 'image/jpeg',
        });
      }
      if (includeAudio || modality === 'VOICE') {
        mediaList.push({
          media_type: 'AUDIO',
          uri: 'gs://civicpulse-bucket/audio/hero_voice_water.wav',
          mime_type: 'audio/wav',
        });
      }

      const payload: CreateRequestPayload = {
        input_modality: modality,
        channel: 'web',
        language,
        raw_text: narrative.trim() || undefined,
        media: mediaList.length > 0 ? mediaList : undefined,
        geo_id: includeLocation ? geoId : undefined,
        latitude: includeLocation ? 12.9698 : undefined,
        longitude: includeLocation ? 77.75 : undefined,
      };

      // 1. Submit to POST /api/v1/requests (never calls Gemini directly, routes through requestService)
      const res = await requestService.createRequest(payload);

      // 2. Poll for the processed record
      let details: CitizenRequestDetails | null = null;
      for (let i = 0; i < 5; i++) {
        details = await requestService.getRequest(res.request_id);
        if (details && details.status !== 'PROCESSING') {
          break;
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      setSubmittedRequest(details);
      setStep('C2_RESULT');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while processing the request.');
      setStep('C1_REPORT');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('C1_REPORT');
    setSubmittedRequest(null);
    setNarrative('');
    setErrorMessage(null);
  };

  return (
    <div id="citizen-flow-container" className="max-w-4xl mx-auto w-full py-6">
      {/* Step Indicator */}
      <div id="flow-stepper" className="flex items-center justify-between border-b border-stone-200 pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div
            id="step-badge-c1"
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step === 'C1_REPORT'
                ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-100'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            C1
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">Report Issue</h3>
            <p className="text-xs text-stone-500">Citizen grievance submission & evidence</p>
          </div>
        </div>

        <div className="h-0.5 w-16 bg-stone-200 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div
            id="step-badge-c2"
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step === 'C2_RESULT'
                ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-100'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            C2
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">AI Understanding Result</h3>
            <p className="text-xs text-stone-500">Structured interpretation & evidence signals</p>
          </div>
        </div>
      </div>

      {/* Preset Quick Actions */}
      <div id="preset-selector" className="mb-6 p-4 bg-stone-100 rounded-xl border border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Evaluation Presets (Doc 06 §19)
          </span>
          <span className="text-xs text-stone-500">Click to prefill scenario</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            id="btn-preset-hero"
            onClick={() => handleApplyPreset('HERO_WATER')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 transition-colors shadow-xs"
          >
            Hero Water Rupture (Text)
          </button>
          <button
            type="button"
            id="btn-preset-voice"
            onClick={() => handleApplyPreset('VOICE_HERO')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 transition-colors shadow-xs flex items-center gap-1"
          >
            <Mic className="w-3 h-3 text-amber-600" />
            Voice Hero Scenario
          </button>
          <button
            type="button"
            id="btn-preset-conflict"
            onClick={() => handleApplyPreset('PHOTO_CONFLICT')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 transition-colors shadow-xs flex items-center gap-1"
          >
            <Camera className="w-3 h-3 text-red-600" />
            Photo/Text Conflict Case
          </button>
          <button
            type="button"
            id="btn-preset-missing-loc"
            onClick={() => handleApplyPreset('MISSING_LOC')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 transition-colors shadow-xs flex items-center gap-1"
          >
            <MapPin className="w-3 h-3 text-stone-400" />
            Missing Location Case
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          id="error-banner"
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* C1: REPORT ISSUE VIEW */}
      {step === 'C1_REPORT' && (
        <form id="c1-report-form" onSubmit={handleSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-stone-900">C1: Report a Community Grievance</h2>
            <p className="text-sm text-stone-500">
              Submit details via text narrative, audio recording, or visual evidence.
            </p>
          </div>

          {/* Modality & Language Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="modality-select" className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                Input Modality (Doc 04 §6)
              </label>
              <select
                id="modality-select"
                value={modality}
                onChange={(e) => setModality(e.target.value as any)}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="TEXT">TEXT (Standard text narrative)</option>
                <option value="VOICE">VOICE (Spoken audio grievance)</option>
                <option value="PHOTO">PHOTO (Visual evidence only)</option>
                <option value="MIXED">MIXED (Narrative + Media Evidence)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="language-select" className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                Language (Multi-dialect)
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="en">English (en)</option>
                <option value="kn">Kannada (ಕನ್ನಡ - kn)</option>
                <option value="hi">Hindi (हिन्दी - hi)</option>
              </select>
            </div>
          </div>

          {/* Narrative Text Area */}
          <div className="space-y-2">
            <label htmlFor="narrative-input" className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
              Issue Narrative / Citizen Statement
            </label>
            <textarea
              id="narrative-input"
              rows={4}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder={
                modality === 'VOICE'
                  ? 'Optional written notes (audio will be transcribed by Voice AI)...'
                  : 'Describe the civic problem in detail (e.g. water pipeline rupture, pothole)...'
              }
              className="w-full bg-stone-50 border border-stone-300 rounded-lg p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Evidence Attachments: Photo & Audio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
            {/* Photo Attachment Toggle */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-stone-600" />
                  Photo Evidence (AI Contract B)
                </span>
                <input
                  type="checkbox"
                  id="toggle-photo"
                  checked={includePhoto}
                  onChange={(e) => setIncludePhoto(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
              </div>
              {includePhoto && (
                <div className="space-y-2 pt-2 border-t border-stone-200 text-xs">
                  <label className="block text-stone-600 font-medium">Evaluation Photo Sample:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="photoType"
                        value="AGREEMENT"
                        checked={photoType === 'AGREEMENT'}
                        onChange={() => setPhotoType('AGREEMENT')}
                      />
                      <span>Corroborating photo</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-red-700">
                      <input
                        type="radio"
                        name="photoType"
                        value="CONFLICT"
                        checked={photoType === 'CONFLICT'}
                        onChange={() => setPhotoType('CONFLICT')}
                      />
                      <span>Conflicting photo</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Attachment Toggle */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-stone-600" />
                  Voice Audio (P0-10)
                </span>
                <input
                  type="checkbox"
                  id="toggle-audio"
                  checked={includeAudio || modality === 'VOICE'}
                  disabled={modality === 'VOICE'}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
              </div>
              <p className="text-xs text-stone-500">
                {modality === 'VOICE' || includeAudio
                  ? 'Simulated spoken audio grievance attached for server-side transcription.'
                  : 'Enable to attach audio recording.'}
              </p>
            </div>
          </div>

          {/* Location Handling */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-stone-600" />
                Explicit Location Handling (Doc 12 §22)
              </span>
              <input
                type="checkbox"
                id="toggle-location"
                checked={includeLocation}
                onChange={(e) => setIncludeLocation(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
              />
            </div>
            {includeLocation ? (
              <div className="flex items-center gap-3 pt-2 border-t border-stone-200">
                <select
                  id="geoid-select"
                  value={geoId}
                  onChange={(e) => setGeoId(e.target.value)}
                  className="bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-stone-800"
                >
                  <option value="GEO-LOC-BLR-01">Whitefield (GEO-LOC-BLR-01, Lat: 12.9698, Long: 77.7500)</option>
                  <option value="GEO-LOC-BLR-02">Bellandur (GEO-LOC-BLR-02, Lat: 12.9304, Long: 77.6784)</option>
                  <option value="GEO-LOC-BLR-03">Koramangala (GEO-LOC-BLR-03, Lat: 12.9352, Long: 77.6245)</option>
                </select>
                <span className="text-xs text-emerald-700 font-medium">✓ Valid coordinates attached</span>
              </div>
            ) : (
              <p className="text-xs text-amber-800 font-medium pt-2 border-t border-stone-200">
                ⚠ No geographic coordinates provided — AI Contract A will set location confidence to 0.0 and request clarification.
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              id="btn-submit-request"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 active:bg-amber-600 transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Submit Civic Report</span>
            </button>
          </div>
        </form>
      )}

      {/* PROCESSING STATE */}
      {step === 'PROCESSING' && (
        <div id="processing-view" className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto"></div>
          <h3 className="text-lg font-bold text-stone-900">Processing Request via AI Contracts A & B</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            Classifying taxonomy against closed taxonomy, evaluating physical photo evidence, transcribing speech, and calculating multidimensional confidence scores...
          </p>
        </div>
      )}

      {/* C2: SUBMISSION RESULT VIEW */}
      {step === 'C2_RESULT' && submittedRequest && (
        <div id="c2-result-container" className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs">
          {/* Header & Status Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                  {submittedRequest.request_id}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {submittedRequest.input_modality} / {submittedRequest.channel}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-stone-900 mt-1">C2: Submission Analysis</h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Verification Status Banner: MUST REMAIN PENDING (Doc 12 §10, CP-020) */}
              <span
                id="verification-status-badge"
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  submittedRequest.verification_status === 'PENDING'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-stone-100 text-stone-700 border border-stone-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Verification: {submittedRequest.verification_status}
              </span>

              {/* Lifecycle Status */}
              <span
                id="lifecycle-status-badge"
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  submittedRequest.status === 'PROCESSED'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : submittedRequest.status === 'NEEDS_CLARIFICATION'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-red-100 text-red-900 border border-red-300'
                }`}
              >
                Status: {submittedRequest.status}
              </span>
            </div>
          </div>

          {/* AI Understanding Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Taxonomy Understanding */}
            <div className="space-y-4 p-5 rounded-xl border border-stone-200 bg-stone-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-2">
                <FileText className="w-4 h-4 text-stone-500" />
                AI Contract A: Structured Understanding
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Category:</span>
                  <span id="result-category" className="font-semibold text-stone-900">
                    {submittedRequest.category_id || 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Issue Type:</span>
                  <span id="result-issue-type" className="font-semibold text-stone-900">
                    {submittedRequest.issue_type_id || 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Affected Service:</span>
                  <span className="text-stone-800">{submittedRequest.affected_service || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Severity / Urgency:</span>
                  <span className="text-stone-800">
                    Level {submittedRequest.severity || 1} / Level {submittedRequest.urgency || 1}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <span className="text-xs text-stone-500 block mb-1">Issue Summary:</span>
                <p className="text-xs text-stone-800 italic bg-white p-2.5 rounded-lg border border-stone-200">
                  "{submittedRequest.issue_summary || 'No summary produced'}"
                </p>
              </div>

              {submittedRequest.transcript && (
                <div className="pt-2 border-t border-stone-200">
                  <span className="text-xs text-stone-500 block mb-1">Voice Transcript (P0-10):</span>
                  <p className="text-xs text-stone-800 font-mono bg-white p-2.5 rounded-lg border border-stone-200">
                    "{submittedRequest.transcript}"
                  </p>
                </div>
              )}
            </div>

            {/* AI Confidence Breakdown (Strictly 4 Approved Keys) */}
            <div className="space-y-4 p-5 rounded-xl border border-stone-200 bg-stone-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Approved AI Confidence Metrics (Doc 06 §14)
              </h3>

              {submittedRequest.ai_confidence ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-stone-600 font-medium">Category Confidence</span>
                      <span className="font-bold text-stone-900">
                        {Math.round(submittedRequest.ai_confidence.category * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${submittedRequest.ai_confidence.category * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-stone-600 font-medium">Issue Type Confidence</span>
                      <span className="font-bold text-stone-900">
                        {Math.round(submittedRequest.ai_confidence.issue_type * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${submittedRequest.ai_confidence.issue_type * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-stone-600 font-medium">Intent Confidence</span>
                      <span className="font-bold text-stone-900">
                        {Math.round(submittedRequest.ai_confidence.intent * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${submittedRequest.ai_confidence.intent * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-stone-600 font-medium">Location Confidence</span>
                      <span
                        className={`font-bold ${
                          submittedRequest.ai_confidence.location === 0 ? 'text-red-600' : 'text-stone-900'
                        }`}
                      >
                        {Math.round(submittedRequest.ai_confidence.location * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          submittedRequest.ai_confidence.location === 0 ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${submittedRequest.ai_confidence.location * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-500">No confidence vector available.</p>
              )}

              {submittedRequest.status === 'NEEDS_CLARIFICATION' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Uncertainty detected: Flagged for citizen clarification before downstream clustering.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* AI Contract B: Multimodal Photo Evidence Analysis Section */}
          {submittedRequest.media_evidence && submittedRequest.media_evidence.length > 0 && (
            <div id="multimodal-evidence-section" className="space-y-4 pt-4 border-t border-stone-200">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                <Camera className="w-4 h-4 text-stone-600" />
                AI Contract B: Multimodal Photo Evidence Analysis (Doc 06 §7)
              </h3>

              {submittedRequest.media_evidence.map((evidence) => {
                const obs = evidence.observations || {};
                const isConflict = obs.conflict_flag === true;

                return (
                  <div
                    key={evidence.media_id}
                    className={`p-5 rounded-xl border ${
                      isConflict ? 'bg-red-50/70 border-red-300' : 'bg-stone-50 border-stone-200'
                    } space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-stone-500">{evidence.media_id}</span>
                      {isConflict ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Photo/Text Conflict Detected
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Corroborating Visual Evidence
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-stone-800">
                      <strong>Visual Summary:</strong> {evidence.analysis_summary}
                    </p>

                    {/* Observable Tags Only (Safety rule) */}
                    {obs.observable_tags && Array.isArray(obs.observable_tags) && (
                      <div className="space-y-1">
                        <span className="text-xs text-stone-500 font-medium">Observable Physical Tags:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {obs.observable_tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-xs font-mono bg-white border border-stone-200 text-stone-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {isConflict && obs.conflict_reason && (
                      <div className="p-3 bg-white rounded-lg border border-red-200 text-xs text-red-800">
                        <strong>Conflict Reason:</strong> {obs.conflict_reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action to submit another report */}
          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              type="button"
              id="btn-report-another"
              onClick={handleReset}
              className="px-5 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Submit Another Report</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenFlow;
