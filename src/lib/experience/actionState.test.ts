import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { ActionButton } from '../../components/ActionButton';
import { getActionState, type ActionName } from './actionState';

const expectedStates: Record<ActionName, {
  idle: { label: string; icon: string; liveMessage: string };
  pending: { label: string; icon: string; liveMessage: string };
}> = {
  'plan-route': {
    idle: { label: '规划路线', icon: 'map-pin', liveMessage: '' },
    pending: { label: '正在规划路线', icon: 'route', liveMessage: '正在规划路线，请稍候' },
  },
  'publish-guide': {
    idle: { label: '发布攻略', icon: 'file-up', liveMessage: '' },
    pending: { label: '正在提交审核', icon: 'shield-check', liveMessage: '攻略正在提交审核' },
  },
  'publish-food': {
    idle: { label: '推荐美食', icon: 'file-up', liveMessage: '' },
    pending: { label: '正在提交审核', icon: 'shield-check', liveMessage: '美食推荐正在提交审核' },
  },
  'submit-review': {
    idle: { label: '提交评价', icon: 'send', liveMessage: '' },
    pending: { label: '正在提交评价', icon: 'clock-3', liveMessage: '正在提交评价，请稍候' },
  },
  'approve-submission': {
    idle: { label: '通过发布', icon: 'shield-check', liveMessage: '' },
    pending: { label: '正在发布', icon: 'shield-check', liveMessage: '正在审核通过并发布内容，请稍候' },
  },
  'reject-submission': {
    idle: { label: '驳回删除', icon: 'shield-x', liveMessage: '' },
    pending: { label: '正在驳回', icon: 'shield-x', liveMessage: '正在驳回并删除投稿，请稍候' },
  },
  'search-price': {
    idle: { label: '搜索价格', icon: 'search', liveMessage: '' },
    pending: { label: '正在搜索价格', icon: 'search', liveMessage: '正在搜索价格，请稍候' },
  },
  'upload-avatar': {
    idle: { label: '上传头像', icon: 'upload', liveMessage: '' },
    pending: { label: '正在上传头像', icon: 'upload', liveMessage: '正在上传头像，请稍候' },
  },
  'sign-in': {
    idle: { label: '登录', icon: 'log-in', liveMessage: '' },
    pending: { label: '正在登录', icon: 'log-in', liveMessage: '正在登录，请稍候' },
  },
};

for (const [action, expected] of Object.entries(expectedStates) as [ActionName, (typeof expectedStates)[ActionName]][]) {
  test(`${action} returns its idle state`, () => {
    assert.deepEqual(getActionState(action, false), {
      label: expected.idle.label,
      icon: expected.idle.icon,
      liveMessage: expected.idle.liveMessage,
    });
  });

  test(`${action} returns its pending state`, () => {
    assert.deepEqual(getActionState(action, true), {
      label: expected.pending.label,
      icon: expected.pending.icon,
      liveMessage: expected.pending.liveMessage,
    });
  });
}

test('renders pending action controls with an external polite live status', () => {
  const markup = renderToStaticMarkup(
    createElement(ActionButton, { action: 'plan-route', pending: true }),
  );

  assert.match(markup, /<button[^>]*type="button"/);
  assert.match(markup, /<button[^>]*aria-busy="true"/);
  assert.match(markup, /<button[^>]*disabled=""/);
  assert.match(markup, />正在规划路线</);
  assert.match(markup, /lucide-route/);
  assert.match(markup, /aria-live="polite"/);
  assert.ok(markup.indexOf('aria-live="polite"') > markup.indexOf('</button>'));
});

test('updates each action between idle and pending states without changing button geometry', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    pretendToBeVisual: true,
  });
  const originals = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    SVGElement: globalThis.SVGElement,
    Node: globalThis.Node,
  };
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    SVGElement: dom.window.SVGElement,
    Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  dom.window.matchMedia = () => ({
    matches: true,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });

  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);

  try {
    for (const [action, expected] of Object.entries(expectedStates) as [ActionName, (typeof expectedStates)[ActionName]][]) {
      await act(async () => {
        root.render(createElement(ActionButton, { action, pending: false }));
      });

      const idleButton: HTMLButtonElement | null = container.querySelector('button');
      const idleIcon: HTMLElement | null = container.querySelector('[data-action-button-icon]');
      const idleLabel: HTMLElement | null = container.querySelector('[data-action-button-label]');
      assert.ok(idleButton && idleIcon && idleLabel);
      assert.match(idleButton.textContent ?? '', new RegExp(expected.idle.label));
      assert.ok(idleButton.querySelector(`.lucide-${expected.idle.icon}`));
      const buttonClass: string = idleButton.className;
      const buttonStyle: string | null = idleButton.getAttribute('style');
      const iconStyle: string | null = idleIcon.getAttribute('style');
      const labelMinInlineSize: string = idleLabel.style.minInlineSize;

      await act(async () => {
        root.render(createElement(ActionButton, { action, pending: true }));
      });

      const pendingButton: HTMLButtonElement | null = container.querySelector('button');
      const pendingIcon: HTMLElement | null = container.querySelector('[data-action-button-icon]');
      const pendingLabel: HTMLElement | null = container.querySelector('[data-action-button-label]');
      assert.ok(pendingButton && pendingIcon && pendingLabel);
      assert.match(pendingButton.textContent ?? '', new RegExp(expected.pending.label));
      assert.ok(pendingButton.querySelector(`.lucide-${expected.pending.icon}`));
      assert.equal(pendingButton.className, buttonClass);
      assert.equal(pendingButton.getAttribute('style'), buttonStyle);
      assert.equal(pendingIcon.getAttribute('style'), iconStyle);
      assert.equal(pendingLabel.style.minInlineSize, labelMinInlineSize);
    }
  } finally {
    await act(async () => {
      root.unmount();
    });
    Object.assign(globalThis, originals);
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    }
    dom.window.close();
  }
});
