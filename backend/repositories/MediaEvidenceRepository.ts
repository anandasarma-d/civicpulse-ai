import fs from 'fs';
import path from 'path';
import { MediaEvidence } from '../models/MediaEvidence';

export interface MediaEvidenceFilter {
  request_id?: string;
  media_type?: 'PHOTO' | 'AUDIO';
}

export interface MediaEvidenceRepository {
  getById(media_id: string): Promise<MediaEvidence | null>;
  list(filter?: MediaEvidenceFilter): Promise<MediaEvidence[]>;
  create(evidence: MediaEvidence): Promise<MediaEvidence>;
  update(media_id: string, updates: Partial<MediaEvidence>): Promise<MediaEvidence | null>;
}

export class LocalJsonMediaEvidenceRepository implements MediaEvidenceRepository {
  private filePath: string;
  private cache: MediaEvidence[] | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/media_evidence.json');
  }

  private loadData(): MediaEvidence[] {
    if (this.cache) {
      return this.cache;
    }
    if (!fs.existsSync(this.filePath)) {
      this.cache = [];
      return this.cache;
    }
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    this.cache = JSON.parse(raw) as MediaEvidence[];
    return this.cache;
  }

  async getById(media_id: string): Promise<MediaEvidence | null> {
    const items = this.loadData();
    const found = items.find((i) => i.media_id === media_id);
    return found || null;
  }

  async list(filter?: MediaEvidenceFilter): Promise<MediaEvidence[]> {
    let items = this.loadData();
    if (!filter) return items;

    if (filter.request_id) {
      items = items.filter((i) => i.request_id === filter.request_id);
    }
    if (filter.media_type) {
      items = items.filter((i) => i.media_type === filter.media_type);
    }
    return items;
  }

  async create(evidence: MediaEvidence): Promise<MediaEvidence> {
    const items = this.loadData();
    items.push(evidence);
    return evidence;
  }

  async update(media_id: string, updates: Partial<MediaEvidence>): Promise<MediaEvidence | null> {
    const items = this.loadData();
    const idx = items.findIndex((i) => i.media_id === media_id);
    if (idx === -1) return null;

    const updated = { ...items[idx], ...updates };
    items[idx] = updated;
    return updated;
  }
}

export const mediaEvidenceRepository = new LocalJsonMediaEvidenceRepository();
