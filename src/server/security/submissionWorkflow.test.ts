import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import {
  buildPublishedFoodFromSubmission,
  buildPublishedGuideFromSubmission,
  resolveSubmissionReviewAction,
  type FoodSubmissionPayload,
  type GuideSubmissionPayload,
} from './submissionWorkflow';

test('approving a pending submission publishes it into the target content table', () => {
  assert.deepEqual(resolveSubmissionReviewAction('pending_review', 'approve'), {
    action: 'publish',
    nextStatus: 'published',
  });
});

test('rejecting a pending submission deletes the staged submission', () => {
  assert.deepEqual(resolveSubmissionReviewAction('pending_review', 'reject'), {
    action: 'delete',
  });
});

test('builds a published guide create payload from a staged submission', () => {
  const authorId = new Types.ObjectId();
  const payload: GuideSubmissionPayload = {
    title: '杭州三日游',
    destination: '杭州',
    days: 3,
    budget: 2200,
    content: '西湖、灵隐寺、良渚博物院路线。',
    image: 'https://example.com/hangzhou.jpg',
    tags: ['江南', '博物馆'],
  };

  const guide = buildPublishedGuideFromSubmission({
    payload,
    author: '阿秋',
    authorId,
    riskScore: 0,
    riskLabels: [],
    moderationReason: 'approved',
  });

  assert.equal(guide.title, payload.title);
  assert.equal(guide.author, '阿秋');
  assert.equal(guide.authorId, authorId);
  assert.equal(guide.status, 'published');
  assert.equal(guide.source, 'user');
  assert.deepEqual(guide.tags, payload.tags);
});

test('builds a published food create payload from a staged submission', () => {
  const authorId = new Types.ObjectId();
  const payload: FoodSubmissionPayload = {
    name: '成都小面',
    province: '四川',
    city: '成都',
    address: '春熙路',
    type: '小吃',
    price: '¥35/人',
    description: '适合旅行途中快速补能。',
    image: 'https://example.com/noodles.jpg',
    tags: ['川味'],
  };

  const food = buildPublishedFoodFromSubmission({
    payload,
    author: '小唐',
    authorId,
    riskScore: 0,
    riskLabels: [],
    moderationReason: 'approved',
  });

  assert.equal(food.name, payload.name);
  assert.equal(food.author, '小唐');
  assert.equal(food.authorId, authorId);
  assert.equal(food.status, 'published');
  assert.equal(food.source, 'user');
  assert.equal(food.rating, 0);
  assert.deepEqual(food.reviewsList, []);
});
