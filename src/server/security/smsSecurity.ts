import { createHash, randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { SecurityAlertSink, SecurityAuditEvent } from './securityTypes';

export type SmsChallengeStatus = 'pending' | 'verified' | 'expired' | 'locked' | 'consumed';

export type SmsRequestErrorCode =
  | 'SMS_INVALID_INPUT'
  | 'SMS_PHONE_RATE_LIMITED'
  | 'SMS_EMAIL_RATE_LIMITED'
  | 'SMS_BUDGET_EXHAUSTED';

export type SmsVerifyErrorCode =
  | 'SMS_INVALID_INPUT'
  | 'SMS_INVALID_CODE'
  | 'SMS_CHALLENGE_EXPIRED'
  | 'SMS_CHALLENGE_LOCKED';

export interface SmsChallengeServiceOptions {
  now?: () => Date;
  sendLimitPerPhoneWindow?: number;
  sendLimitPerEmailWindow?: number;
  globalBudgetPerHour?: number;
  codeGenerator?: () => string;
  alertSink?: SecurityAlertSink;
}

export type SmsRequestResult =
  | {
      success: true;
      challengeId: string;
      expiresInSeconds: number;
      retryAfterSeconds: number;
      debugCode: string;
    }
  | { success: false; code: SmsRequestErrorCode; retryAfterSeconds?: number; message: string };

export type SmsVerifyResult =
  | { success: true; email: string; phone: string }
  | { success: false; code: SmsVerifyErrorCode; message: string };

interface RequestChallengeInput {
  email: string;
  phone: string;
  ip?: string;
  deviceId?: string;
}

interface VerifyChallengeInput {
  challengeId: string;
  code: string;
}

interface StoredChallenge {
  id: string;
  email: string;
  phone: string;
  emailHash: string;
  phoneHash: string;
  codeHash: string;
  status: SmsChallengeStatus;
  attemptCount: number;
  expiresAtMs: number;
  createdAtMs: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s-]/g, '');
}

export function hashSecurityValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function makeCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone);
}

export class SmsChallengeService {
  private readonly now: () => Date;
  private readonly sendLimitPerPhoneWindow: number;
  private readonly sendLimitPerEmailWindow: number;
  private readonly globalBudgetPerHour: number;
  private readonly codeGenerator: () => string;
  private readonly alertSink?: SecurityAlertSink;
  private readonly phoneSendBuckets = new Map<string, number[]>();
  private readonly emailSendBuckets = new Map<string, number[]>();
  private readonly globalSends: number[] = [];
  private readonly challenges = new Map<string, StoredChallenge>();
  readonly auditEvents: SecurityAuditEvent[] = [];

  constructor(options: SmsChallengeServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.sendLimitPerPhoneWindow = options.sendLimitPerPhoneWindow ?? 3;
    this.sendLimitPerEmailWindow = options.sendLimitPerEmailWindow ?? 3;
    this.globalBudgetPerHour = options.globalBudgetPerHour ?? 500;
    this.codeGenerator = options.codeGenerator ?? makeCode;
    this.alertSink = options.alertSink;
  }

  async requestChallenge(input: RequestChallengeInput): Promise<SmsRequestResult> {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const nowMs = this.now().getTime();
    const emailHash = hashSecurityValue(email);
    const phoneHash = hashSecurityValue(phone);

    if (!isValidEmail(email) || !isValidPhone(phone)) {
      return { success: false, code: 'SMS_INVALID_INPUT', message: 'Invalid email or phone.' };
    }

    this.pruneBuckets(nowMs);

    if ((this.phoneSendBuckets.get(phoneHash)?.length ?? 0) >= this.sendLimitPerPhoneWindow) {
      this.recordAudit('login_sms_blocked', 'deny', 'phone_rate_limited', phoneHash);
      return {
        success: false,
        code: 'SMS_PHONE_RATE_LIMITED',
        retryAfterSeconds: 600,
        message: 'Too many SMS requests for this phone.',
      };
    }

    if ((this.emailSendBuckets.get(emailHash)?.length ?? 0) >= this.sendLimitPerEmailWindow) {
      this.recordAudit('login_sms_blocked', 'deny', 'email_rate_limited', emailHash);
      return {
        success: false,
        code: 'SMS_EMAIL_RATE_LIMITED',
        retryAfterSeconds: 600,
        message: 'Too many SMS requests for this email.',
      };
    }

    if (this.globalSends.length >= this.globalBudgetPerHour) {
      this.recordAudit('login_sms_blocked', 'alert', 'global_budget_exhausted');
      await this.emitAlert('critical', 'sms_budget_exhausted', 'Global hourly SMS budget exhausted', {
        budget: this.globalBudgetPerHour,
        used: this.globalSends.length,
      });
      return {
        success: false,
        code: 'SMS_BUDGET_EXHAUSTED',
        retryAfterSeconds: 3600,
        message: 'SMS budget exhausted.',
      };
    }

    const code = this.codeGenerator();
    const challenge: StoredChallenge = {
      id: randomUUID(),
      email,
      phone,
      emailHash,
      phoneHash,
      codeHash: bcrypt.hashSync(code, 10),
      status: 'pending',
      attemptCount: 0,
      expiresAtMs: nowMs + 5 * 60 * 1000,
      createdAtMs: nowMs,
    };

    this.pushBucketValue(this.phoneSendBuckets, phoneHash, nowMs);
    this.pushBucketValue(this.emailSendBuckets, emailHash, nowMs);
    this.globalSends.push(nowMs);
    this.challenges.set(challenge.id, challenge);
    this.recordAudit('login_sms_requested', 'allow', 'challenge_created', phoneHash, {
      ipHash: input.ip ? hashSecurityValue(input.ip) : undefined,
      deviceHash: input.deviceId ? hashSecurityValue(input.deviceId) : undefined,
    });

    return {
      success: true,
      challengeId: challenge.id,
      expiresInSeconds: 300,
      retryAfterSeconds: 60,
      debugCode: code,
    };
  }

  async verifyChallenge(input: VerifyChallengeInput): Promise<SmsVerifyResult> {
    if (!input.challengeId || !/^\d{6}$/.test(input.code)) {
      return { success: false, code: 'SMS_INVALID_INPUT', message: 'Invalid challenge or code.' };
    }

    const challenge = this.challenges.get(input.challengeId);
    if (!challenge) {
      return { success: false, code: 'SMS_INVALID_INPUT', message: 'Invalid challenge or code.' };
    }

    if (challenge.status === 'locked') {
      return { success: false, code: 'SMS_CHALLENGE_LOCKED', message: 'Challenge is locked.' };
    }

    if (this.now().getTime() > challenge.expiresAtMs) {
      challenge.status = 'expired';
      return { success: false, code: 'SMS_CHALLENGE_EXPIRED', message: 'Challenge expired.' };
    }

    if (!bcrypt.compareSync(input.code, challenge.codeHash)) {
      challenge.attemptCount += 1;
      if (challenge.attemptCount >= 5) {
        challenge.status = 'locked';
        this.recordAudit('login_sms_blocked', 'deny', 'challenge_locked', challenge.phoneHash);
        return { success: false, code: 'SMS_CHALLENGE_LOCKED', message: 'Challenge is locked.' };
      }
      return { success: false, code: 'SMS_INVALID_CODE', message: 'Invalid verification code.' };
    }

    challenge.status = 'consumed';
    this.recordAudit('login_sms_verified', 'allow', 'challenge_consumed', challenge.phoneHash);
    return { success: true, email: challenge.email, phone: challenge.phone };
  }

  private pruneBuckets(nowMs: number): void {
    const tenMinutesAgo = nowMs - 10 * 60 * 1000;
    const oneHourAgo = nowMs - 60 * 60 * 1000;

    for (const [key, values] of this.phoneSendBuckets.entries()) {
      this.phoneSendBuckets.set(key, values.filter((value) => value >= tenMinutesAgo));
    }
    for (const [key, values] of this.emailSendBuckets.entries()) {
      this.emailSendBuckets.set(key, values.filter((value) => value >= tenMinutesAgo));
    }

    const retained = this.globalSends.filter((value) => value >= oneHourAgo);
    this.globalSends.length = 0;
    this.globalSends.push(...retained);
  }

  private pushBucketValue(bucket: Map<string, number[]>, key: string, value: number): void {
    const values = bucket.get(key) ?? [];
    values.push(value);
    bucket.set(key, values);
  }

  private recordAudit(
    type: string,
    decision: SecurityAuditEvent['decision'],
    reason: string,
    subjectHash?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.auditEvents.push({
      type,
      decision,
      reason,
      subjectHash,
      metadata,
      createdAt: this.now(),
    });
  }

  private async emitAlert(
    severity: 'info' | 'warning' | 'critical',
    type: string,
    reason: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.alertSink?.emit({
        severity,
        type,
        requestId: randomUUID(),
        reason,
        metadata,
      });
    } catch (error) {
      console.error('security alert delivery failed', error);
    }
  }
}
