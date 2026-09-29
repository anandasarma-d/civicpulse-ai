import { fqTable, getBigQueryClient, getBigQueryLocation } from '../backend/common/bigqueryClient';

async function run() {
  const bq = getBigQueryClient();
  const location = getBigQueryLocation();

  const queries = [
    `SELECT request_id, geo_id, category_id, issue_type_id, cluster_id, status
     FROM ${fqTable('citizen_requests')}
     WHERE request_id = 'REQ-TS-000101'`,
    `SELECT gap_id, cluster_id, priority_score, citizen_demand, population_affected,
            infrastructure_gap, urgency_severity, investment_gap, equity_need, rank
     FROM ${fqTable('gap_assessments')}
     WHERE gap_id = 'GAP-0001'`,
  ];

  for (const query of queries) {
    console.log('\n--- QUERY ---\n' + query);
    const [rows] = await bq.query({ query, location });
    console.log(JSON.stringify(rows, null, 2));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
