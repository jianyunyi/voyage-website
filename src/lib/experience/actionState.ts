export type ActionName =
  | 'plan-route'
  | 'publish-guide'
  | 'publish-food'
  | 'submit-review'
  | 'approve-submission'
  | 'reject-submission'
  | 'search-price'
  | 'upload-avatar'
  | 'sign-in';

export interface ActionState {
  label: string;
  icon:
    | 'map-pin'
    | 'route'
    | 'file-up'
  | 'shield-check'
  | 'shield-x'
    | 'send'
    | 'clock-3'
    | 'search'
    | 'upload'
    | 'log-in';
  liveMessage: string;
}

const actionStates: Record<ActionName, { idle: ActionState; pending: ActionState }> = {
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

export function getActionState(action: ActionName, pending: boolean): ActionState {
  return actionStates[action][pending ? 'pending' : 'idle'];
}
