import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** 统一空状态：图标 + 标题 + 描述 + 可选操作 */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-gray-200 dark:border-stone-700 p-8 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-600 dark:text-stone-300 mb-1">{title}</p>
      {description && <p className="text-xs text-gray-400 dark:text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
