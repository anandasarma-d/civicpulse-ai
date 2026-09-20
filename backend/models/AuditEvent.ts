export interface AuditEvent {
  event_id: string; // PK
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  references: string[] | null;
  timestamp: string; // datetime (ISO 8601)
  metadata: object | null;
}
