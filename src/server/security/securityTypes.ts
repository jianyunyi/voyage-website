export type SecurityDecision = 'allow' | 'deny' | 'review' | 'alert';

export interface SecurityAuditEvent {
  type: string;
  decision: SecurityDecision;
  reason: string;
  subjectHash?: string;
  actorId?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SecurityAlertSink {
  emit(input: {
    severity: 'info' | 'warning' | 'critical';
    type: string;
    requestId: string;
    reason: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}

export class ConsoleSecurityAlertSink implements SecurityAlertSink {
  async emit(input: {
    severity: 'info' | 'warning' | 'critical';
    type: string;
    requestId: string;
    reason: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    console.warn('[security-alert]', JSON.stringify(input));
  }
}
