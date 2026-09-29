import { fqTable, getBigQueryClient, getBigQueryLocation } from '../backend/common/bigqueryClient';
import { assembleEvidence, loadGapRecord } from '../backend/services/recommendations/recommendationService';

async function deriveReviewRequired(gapId: string): Promise<boolean> {
  const gap = await loadGapRecord(gapId);
  if (!gap) return true;
  const evidence = await assembleEvidence(gap);
  return evidence.evidence_is_thin;
}

async function main() {
  const bq = getBigQueryClient();
  const location = getBigQueryLocation();
  const recFq = fqTable('recommendations');

  await bq.query({
    query: `ALTER TABLE ${recFq} ADD COLUMN IF NOT EXISTS review_required BOOL`,
    location,
  });

  const [rows] = await bq.query({
    query: `SELECT recommendation_id, gap_id FROM ${recFq}`,
    location,
  });

  for (const row of rows as Array<{ recommendation_id: string; gap_id: string }>) {
    const reviewRequired = await deriveReviewRequired(row.gap_id);
    console.log(
      `${row.recommendation_id} gap=${row.gap_id} evidence_is_thin/review_required=${reviewRequired}`
    );
    await bq.query({
      query: `UPDATE ${recFq} SET review_required = @review_required WHERE recommendation_id = @recommendation_id`,
      params: {
        review_required: reviewRequired,
        recommendation_id: row.recommendation_id,
      },
      location,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
