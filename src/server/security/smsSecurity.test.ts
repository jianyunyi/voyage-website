import assert from 'node:assert/strict';
import test from 'node:test';
import { SmsChallengeService } from './smsSecurity';

test('blocks SMS sends when the same phone exceeds the short-window limit', async () => {
  const service = new SmsChallengeService({
    now: () => new Date('2026-06-07T00:00:00.000Z'),
    sendLimitPerPhoneWindow: 2,
    sendLimitPerEmailWindow: 10,
    globalBudgetPerHour: 10,
  });

  await service.requestChallenge({ email: 'USER@example.com', phone: '+8613800138000', ip: '1.1.1.1' });
  await service.requestChallenge({ email: 'USER@example.com', phone: '+8613800138000', ip: '1.1.1.1' });
  const third = await service.requestChallenge({ email: 'USER@example.com', phone: '+8613800138000', ip: '1.1.1.1' });

  assert.equal(third.success, false);
  assert.equal(third.code, 'SMS_PHONE_RATE_LIMITED');
});

test('blocks SMS sends when the same email exceeds the short-window limit', async () => {
  const service = new SmsChallengeService({
    now: () => new Date('2026-06-07T00:00:00.000Z'),
    sendLimitPerPhoneWindow: 10,
    sendLimitPerEmailWindow: 1,
    globalBudgetPerHour: 10,
  });

  await service.requestChallenge({ email: 'user@example.com', phone: '+8613800138001', ip: '1.1.1.1' });
  const second = await service.requestChallenge({ email: 'USER@example.com', phone: '+8613800138002', ip: '1.1.1.1' });

  assert.equal(second.success, false);
  assert.equal(second.code, 'SMS_EMAIL_RATE_LIMITED');
});

test('blocks SMS sends when the global hourly budget is exhausted', async () => {
  const service = new SmsChallengeService({
    now: () => new Date('2026-06-07T00:00:00.000Z'),
    sendLimitPerPhoneWindow: 10,
    sendLimitPerEmailWindow: 10,
    globalBudgetPerHour: 1,
  });

  await service.requestChallenge({ email: 'a@example.com', phone: '+8613800138001', ip: '1.1.1.1' });
  const second = await service.requestChallenge({ email: 'b@example.com', phone: '+8613800138002', ip: '1.1.1.1' });

  assert.equal(second.success, false);
  assert.equal(second.code, 'SMS_BUDGET_EXHAUSTED');
});

test('locks an SMS challenge after five invalid verification attempts', async () => {
  const service = new SmsChallengeService({
    now: () => new Date('2026-06-07T00:00:00.000Z'),
    sendLimitPerPhoneWindow: 10,
    sendLimitPerEmailWindow: 10,
    globalBudgetPerHour: 10,
    codeGenerator: () => '123456',
  });

  const challenge = await service.requestChallenge({ email: 'user@example.com', phone: '+8613800138000', ip: '1.1.1.1' });
  assert.equal(challenge.success, true);

  for (let index = 0; index < 4; index += 1) {
    const result = await service.verifyChallenge({ challengeId: challenge.challengeId, code: '000000' });
    assert.equal(result.success, false);
    assert.equal(result.code, 'SMS_INVALID_CODE');
  }

  const locked = await service.verifyChallenge({ challengeId: challenge.challengeId, code: '000000' });
  assert.equal(locked.success, false);
  assert.equal(locked.code, 'SMS_CHALLENGE_LOCKED');
});
