// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("测试崩溃");
}

describe("ErrorBoundary", () => {
  it("正常内容正常渲染", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary><div>正常内容</div></ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText("正常内容")).toBeTruthy();
  });

  it("子组件抛错时显示兜底 UI", () => {
    // 用 spyOn console.error 抑制预期错误日志
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <ErrorBoundary><Bomb /></ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText("页面出错了")).toBeTruthy();
    expect(screen.getByText("返回首页")).toBeTruthy();
    spy.mockRestore();
  });
});
