import fs from 'fs';
import path from 'path';
import { RequestEmbedding } from '../models/RequestEmbedding';

export interface RequestEmbeddingRepository {
  getByRequestId(request_id: string): Promise<RequestEmbedding | null>;
  save(embedding: RequestEmbedding): Promise<RequestEmbedding>;
  list(): Promise<RequestEmbedding[]>;
}

export class LocalJsonRequestEmbeddingRepository implements RequestEmbeddingRepository {
  private filePath: string;
  private cache: RequestEmbedding[] | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/request_embeddings.json');
  }

  private loadData(): RequestEmbedding[] {
    if (this.cache) {
      return this.cache;
    }
    if (!fs.existsSync(this.filePath)) {
      this.cache = [];
      return this.cache;
    }
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    this.cache = JSON.parse(raw) as RequestEmbedding[];
    return this.cache;
  }

  async getByRequestId(request_id: string): Promise<RequestEmbedding | null> {
    const data = this.loadData();
    const item = data.find((e) => e.request_id === request_id);
    return item ? { ...item } : null;
  }

  async save(embedding: RequestEmbedding): Promise<RequestEmbedding> {
    const data = this.loadData();
    const existingIndex = data.findIndex((e) => e.request_id === embedding.request_id);
    if (existingIndex >= 0) {
      data[existingIndex] = { ...embedding };
    } else {
      data.push({ ...embedding });
    }
    return { ...embedding };
  }

  async list(): Promise<RequestEmbedding[]> {
    const data = this.loadData();
    return data.map((e) => ({ ...e }));
  }
}

export const requestEmbeddingRepository: RequestEmbeddingRepository =
  new LocalJsonRequestEmbeddingRepository();
export default requestEmbeddingRepository;
