export type PersistenceDataSource = 'BIGQUERY' | 'STATIC_JSON';

let current: PersistenceDataSource = 'STATIC_JSON';

export function setDataSource(source: PersistenceDataSource): void {
  current = source;
}

export function getDataSource(): PersistenceDataSource {
  return current;
}

export default { getDataSource, setDataSource };
