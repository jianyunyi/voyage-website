export const AUTH_RULES = {
  email: {
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    minLength: 6,
    maxLength: 32,
    /** 至少包含一个字母和一个数字 */
    pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
  },
  name: {
    minLength: 2,
    maxLength: 20,
    /** 中文、字母、数字、下划线、空格 */
    pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_\s]+$/,
  },
} as const;

export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}

export type AuthField = keyof AuthFormData;

export type AuthFieldErrors = Partial<Record<AuthField, string>>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function validateEmail(email: string): string | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) return '请输入邮箱地址';
  if (normalized.length > AUTH_RULES.email.maxLength) return '邮箱地址过长';
  if (!AUTH_RULES.email.pattern.test(normalized)) return '请输入有效的邮箱地址';
  return undefined;
}

function validatePassword(password: string, isRegister: boolean): string | undefined {
  if (!password) return '请输入密码';
  if (password.length < AUTH_RULES.password.minLength) {
    return `密码至少需要 ${AUTH_RULES.password.minLength} 个字符`;
  }
  if (password.length > AUTH_RULES.password.maxLength) {
    return `密码不能超过 ${AUTH_RULES.password.maxLength} 个字符`;
  }
  if (isRegister && !AUTH_RULES.password.pattern.test(password)) {
    return '密码需同时包含字母和数字';
  }
  return undefined;
}

function validateName(name: string | undefined): string | undefined {
  const normalized = normalizeName(name ?? '');
  if (!normalized) return '请输入昵称';
  if (normalized.length < AUTH_RULES.name.minLength) {
    return `昵称至少需要 ${AUTH_RULES.name.minLength} 个字符`;
  }
  if (normalized.length > AUTH_RULES.name.maxLength) {
    return `昵称不能超过 ${AUTH_RULES.name.maxLength} 个字符`;
  }
  if (!AUTH_RULES.name.pattern.test(normalized)) {
    return '昵称只能包含中文、字母、数字、下划线和空格';
  }
  return undefined;
}

function validateConfirmPassword(password: string, confirmPassword: string | undefined): string | undefined {
  if (!confirmPassword) return '请再次输入密码';
  if (password !== confirmPassword) return '两次输入的密码不一致';
  return undefined;
}

export function validateLoginForm(data: AuthFormData): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(data.password, false);
  if (passwordError) errors.password = passwordError;

  return errors;
}

export function validateRegisterForm(data: AuthFormData): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(data.password, true);
  if (passwordError) errors.password = passwordError;

  const confirmError = validateConfirmPassword(data.password, data.confirmPassword);
  if (confirmError) errors.confirmPassword = confirmError;

  const nameError = validateName(data.name);
  if (nameError) errors.name = nameError;

  return errors;
}

export function hasFieldErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function getFirstFieldError(errors: AuthFieldErrors): string {
  return errors.email ?? errors.password ?? errors.confirmPassword ?? errors.name ?? '请检查表单输入';
}
