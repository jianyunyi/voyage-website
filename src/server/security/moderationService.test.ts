import assert from 'node:assert/strict';
import test from 'node:test';
import { moderateSubmission, resolveModerationAction } from './moderationService';

test('keeps safe user UGC hidden in pending review before publication', () => {
  const result = moderateSubmission({
    title: 'Chengdu weekend guide',
    body: 'A calm itinerary with museums, food streets, and public transit notes.',
    imageUrl: 'https://images.unsplash.com/photo.jpg',
  });

  assert.equal(result.status, 'pending_review');
  assert.equal(result.canPublish, false);
  assert.deepEqual(result.riskLabels, []);
});

test('auto rejects high-risk UGC and keeps it unpublishable', () => {
  const result = moderateSubmission({
    title: 'Cheap illegal service',
    body: 'Contact me for scam illegal gambling malware links.',
    imageUrl: 'javascript:alert(1)',
  });

  assert.equal(result.status, 'auto_rejected');
  assert.equal(result.canPublish, false);
  assert.ok(result.riskLabels.includes('unsafe_text'));
  assert.ok(result.riskLabels.includes('unsafe_url'));
});

test('publishes content when an admin approves pending review', () => {
  const result = resolveModerationAction('pending_review', 'approve');

  assert.deepEqual(result, { action: 'publish', nextStatus: 'published' });
});

test('deletes content when an admin rejects pending review', () => {
  const result = resolveModerationAction('pending_review', 'reject');

  assert.deepEqual(result, { action: 'delete' });
});
