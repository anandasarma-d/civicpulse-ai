import { Router, Request, Response, NextFunction } from 'express';
import { citizenRequestRepository } from '../../repositories/CitizenRequestRepository';
import { mediaEvidenceRepository } from '../../repositories/MediaEvidenceRepository';
import {
  understandCitizenRequest,
  analyzePhotoEvidence,
  transcribeVoiceAudio,
  RequestMediaItem,
} from '../../services/request_ai';
import {
  CitizenRequest,
  InputModality,
  RequestChannel,
  CitizenRequestStatus,
  VerificationStatus,
} from '../../models/CitizenRequest';
import { MediaEvidence } from '../../models/MediaEvidence';
import { AppError } from '../middleware/errorHandler';
import { coerceJson } from '../../common/bigqueryClient';

export const requestsRouter = Router();

interface CreateRequestBody {
  input_modality?: unknown;
  channel?: unknown;
  raw_text?: unknown;
  language?: unknown;
  media?: unknown;
  geo_id?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

const VALID_MODALITIES: Set<string> = new Set(['TEXT', 'VOICE', 'PHOTO', 'MIXED']);
const VALID_CHANNELS: Set<string> = new Set(['web', 'mobile', 'assisted']);

/** Doc 04 §3 CitizenRequest: REQ-{state}-{number} with 6-digit zero-padded number. */
async function allocateCitizenRequestId(state: string): Promise<string> {
  for (let attempt = 0; attempt < 64; attempt++) {
    const number = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    const candidate = `REQ-${state}-${number}`;
    const existing = await citizenRequestRepository.getById(candidate);
    if (!existing) {
      return candidate;
    }
  }
  throw new AppError(500, 'Unable to allocate a unique citizen request ID', 'INTERNAL_ERROR', []);
}

/**
 * POST /api/v1/requests
 * Creates a new citizen request, transcribes voice audio if present,
 * analyzes photo evidence if present, begins AI Contract A understanding,
 * and returns 202 Accepted. (Doc 14 §5, Doc 06 §6, §7, Doc 11 §8)
 */
requestsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const correlation_id = (req.correlationId as string) || (req.headers['x-correlation-id'] as string) || '';
    const body = req.body as CreateRequestBody;

    // 1. Validate separate input_modality and channel fields
    if (!body.input_modality || typeof body.input_modality !== 'string' || !VALID_MODALITIES.has(body.input_modality)) {
      throw new AppError(
        400,
        'Invalid or missing input_modality. Allowed values: TEXT, VOICE, PHOTO, MIXED',
        'VALIDATION_ERROR',
        [{ field: 'input_modality', issue: 'Must be one of TEXT, VOICE, PHOTO, MIXED' }]
      );
    }

    if (!body.channel || typeof body.channel !== 'string' || !VALID_CHANNELS.has(body.channel)) {
      throw new AppError(
        400,
        'Invalid or missing channel. Allowed values: web, mobile, assisted',
        'VALIDATION_ERROR',
        [{ field: 'channel', issue: 'Must be one of web, mobile, assisted' }]
      );
    }

    const inputModality = body.input_modality as InputModality;
    const channel = body.channel as RequestChannel;
    const language = typeof body.language === 'string' && body.language ? body.language : 'en';
    const rawText = typeof body.raw_text === 'string' ? body.raw_text.trim() : null;
    const geoId = typeof body.geo_id === 'string' && body.geo_id ? body.geo_id : null;
    const latitude = typeof body.latitude === 'number' ? body.latitude : null;
    const longitude = typeof body.longitude === 'number' ? body.longitude : null;

    let media: RequestMediaItem[] | null = null;
    if (Array.isArray(body.media)) {
      media = body.media as RequestMediaItem[];
    }

    // Check if at least some narrative or media is provided
    const hasText = Boolean(rawText && rawText.length > 0);
    const hasMedia = Boolean(media && media.length > 0);
    if (!hasText && !hasMedia) {
      throw new AppError(
        400,
        'Request must contain either raw_text narrative or media evidence',
        'VALIDATION_ERROR',
        [{ field: 'raw_text', issue: 'Both narrative text and media attachments cannot be empty' }]
      );
    }

    const requestId = await allocateCitizenRequestId('KA');

    // Extract photo and audio URIs if media was attached
    let photoUri: string | null = null;
    let audioUri: string | null = null;
    if (media) {
      for (const m of media) {
        if (m.media_type === 'PHOTO' && !photoUri) {
          photoUri = m.uri || `gs://civicpulse-bucket/photos/${requestId}.jpg`;
        } else if (m.media_type === 'AUDIO' && !audioUri) {
          audioUri = m.uri || `gs://civicpulse-bucket/audio/${requestId}.wav`;
        }
      }
    }

    const isSynthetic = req.body.synthetic_flag !== undefined ? Boolean(req.body.synthetic_flag) : false;

    // 2. Initial state: RECEIVED / PROCESSING, verification_status PENDING
    const initialRecord: CitizenRequest = {
      request_id: requestId,
      created_at: new Date().toISOString(),
      input_modality: inputModality,
      channel,
      language,
      raw_text: rawText,
      audio_uri: audioUri,
      photo_uri: photoUri,
      transcript: null,
      category_id: null,
      issue_type_id: null,
      issue_summary: null,
      severity: null,
      urgency: null,
      affected_service: null,
      geo_id: geoId,
      latitude,
      longitude,
      ai_confidence: null,
      verification_status: 'PENDING',
      cluster_id: null,
      status: 'PROCESSING',
      synthetic_flag: isSynthetic,
    };

    // Save initial record
    await citizenRequestRepository.create(initialRecord);

    // 3. Process Voice Audio Transcription if VOICE or MIXED modality (P0-10, Doc 11 §8, Doc 06 §6)
    let producedTranscript: string | null = null;
    let voiceSuccess = true;
    if (inputModality === 'VOICE' || inputModality === 'MIXED') {
      const audioItem = media?.find((m) => m.media_type === 'AUDIO');
      if (audioItem || audioUri) {
        const voiceResult = await transcribeVoiceAudio({
          audio_data: audioItem?.data,
          mime_type: audioItem?.mime_type,
          audio_uri: audioItem?.uri || audioUri || undefined,
          language_hint: language,
        });

        if (voiceResult.success && voiceResult.transcript) {
          producedTranscript = voiceResult.transcript;
        } else {
          // Explicit failure state — never fabricate missing speech (Doc 06 §6)
          voiceSuccess = false;
          producedTranscript = null;
        }
      } else if (!rawText) {
        // Voice modality requested with zero audio data or narrative
        voiceSuccess = false;
      }
    }

    // 4. Execute AI Contract A understanding
    try {
      // Transcript feeds into AI Contract A pipeline
      const aiResult = await understandCitizenRequest({
        raw_text: rawText,
        transcript: producedTranscript,
        language,
        media,
        geo_id: geoId,
        latitude,
        longitude,
      });

      // 5. Multimodal evidence analysis — AI Contract B (P0-11, Doc 06 §7)
      let photoEvidenceList: MediaEvidence[] = [];
      let photoConflictDetected = false;

      if (media && media.some((m) => m.media_type === 'PHOTO')) {
        for (const item of media.filter((m) => m.media_type === 'PHOTO')) {
          const photoAnalysis = await analyzePhotoEvidence({
            request_id: requestId,
            storage_uri: item.uri || photoUri || undefined,
            photo_data: item.data,
            mime_type: item.mime_type,
            request_context: {
              raw_text: rawText || producedTranscript,
              category_id: aiResult.category_id,
              issue_type_id: aiResult.issue_type_id,
            },
          });

          if (photoAnalysis.conflict_flag) {
            photoConflictDetected = true;
          }

          const mediaEntity: MediaEvidence = {
            media_id: photoAnalysis.media_id,
            request_id: requestId,
            media_type: 'PHOTO',
            storage_uri: photoAnalysis.storage_uri,
            analysis_summary: photoAnalysis.analysis_summary,
            observations: {
              ...photoAnalysis.observations,
              observable_tags: photoAnalysis.observable_tags,
              conflict_flag: photoAnalysis.conflict_flag,
              conflict_reason: photoAnalysis.conflict_reason,
            },
            analysis_confidence: {
              overall: photoAnalysis.analysis_confidence,
              per_observation: photoAnalysis.confidence_per_observation,
            },
            model_version: photoAnalysis.model_version,
            created_at: new Date().toISOString(),
            synthetic_flag: isSynthetic,
            is_live_ai: photoAnalysis.is_live_ai,
            execution_source: photoAnalysis.execution_source,
          };

          await mediaEvidenceRepository.create(mediaEntity);
          photoEvidenceList.push(mediaEntity);
        }
      }

      // Status lifecycle evaluation (Doc 06 §14, Doc 12 §10)
      let finalStatus: CitizenRequestStatus = 'PROCESSED';
      let finalVerificationStatus: VerificationStatus = 'PENDING';

      // Rule: Voice failure without raw_text requires clarification
      if ((inputModality === 'VOICE' || inputModality === 'MIXED') && !voiceSuccess && !rawText) {
        finalStatus = 'NEEDS_CLARIFICATION';
        finalVerificationStatus = 'NEEDS_CLARIFICATION';
      } else if (
        aiResult.category_id === 'UNKNOWN' ||
        aiResult.issue_type_id === 'UNKNOWN' ||
        aiResult.needs_clarification
      ) {
        finalStatus = 'NEEDS_CLARIFICATION';
        finalVerificationStatus = 'NEEDS_CLARIFICATION';
      } else if (photoConflictDetected) {
        // Material conflict between photo and text classification flags for review
        finalStatus = 'REVIEW_REQUIRED';
        finalVerificationStatus = 'PENDING';
      }

      await citizenRequestRepository.update(requestId, {
        category_id: aiResult.category_id,
        issue_type_id: aiResult.issue_type_id,
        issue_summary: aiResult.issue_summary,
        affected_service: aiResult.affected_service,
        severity: aiResult.severity,
        urgency: aiResult.urgency,
        ai_confidence: aiResult.ai_confidence,
        transcript: producedTranscript || aiResult.transcript,
        language: aiResult.language,
        status: finalStatus,
        verification_status: finalVerificationStatus,
        is_live_ai: aiResult.is_live_ai,
        execution_source: aiResult.execution_source,
      });
    } catch (err) {
      console.error(`[request_ai] Processing failed for ${requestId}:`, err);
      await citizenRequestRepository.update(requestId, {
        status: 'REVIEW_REQUIRED',
        verification_status: 'PENDING',
      });
    }

    // 6. Return HTTP 202 Accepted (Doc 14 §5). Processing above is awaited, so
    // the body status is the persisted status at response time, not a stale
    // PROCESSING placeholder.
    const processed = await citizenRequestRepository.getById(requestId);
    res.status(202).json({
      request_id: requestId,
      status: processed?.status || 'PROCESSING',
      correlation_id,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/requests/:request_id
 * Returns request details, AI understanding result, verification_status,
 * and associated media evidence analysis. (Doc 14 §6, Doc 06 §7)
 */
requestsRouter.get('/:request_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { request_id } = req.params;
    const request = await citizenRequestRepository.getById(request_id);

    if (!request) {
      throw new AppError(
        404,
        `Citizen request '${request_id}' not found`,
        'NOT_FOUND',
        [{ field: 'request_id', issue: 'Resource does not exist' }]
      );
    }

    // Include any analyzed media evidence
    const media_evidence = await mediaEvidenceRepository.list({ request_id });

    res.status(200).json({
      ...request,
      ai_confidence: coerceJson(request.ai_confidence) ?? request.ai_confidence,
      media_evidence,
    });
  } catch (err) {
    next(err);
  }
});

export default requestsRouter;
