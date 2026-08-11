import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { reportErrorRemote } from "../lib/api";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/** 全局错误边界：页面崩溃时兜底，避免白屏 */
export default class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : "未知错误" };
  }

  componentDidCatch(err: unknown) {
    console.error("[ErrorBoundary]", err);
    // 上报错误（Sentry-lite）
    reportErrorRemote({
      message: err instanceof Error ? err.message : "unknown error",
      stack: err instanceof Error ? err.stack : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      type: "react-boundary",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white dark:bg-stone-950 flex flex-col items-center justify-center px-6">
          <div className="text-6xl mb-4">🧭</div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-stone-100 mb-2">页面出错了</h1>
          <p className="text-sm text-gray-500 dark:text-stone-400 mb-6 max-w-md text-center">
            {this.state.message || "发生了一些意外，请刷新重试"}
          </p>
          <Link
            to="/"
            className="px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors"
          >
            返回首页
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
