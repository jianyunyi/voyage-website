// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Compare from "./Compare";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

function renderCompare() {
  return render(
    <MemoryRouter>
      <Compare />
    </MemoryRouter>,
  );
}

describe("Compare", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
  });

  it("renders the current hotel comparison contract", () => {
    renderCompare();

    expect(screen.getByRole("heading", { name: "全网综合比价" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "酒店住宿" })).toHaveClass("bg-gray-900");
    expect(screen.getByRole("button", { name: "搜索价格" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "去预订" })).toHaveLength(3);
  });

  it("updates the active category and preserves its local result list", () => {
    renderCompare();

    fireEvent.click(screen.getByRole("button", { name: "交通工具" }));

    expect(screen.getByRole("button", { name: "交通工具" })).toHaveClass("bg-gray-900");
    expect(screen.getByText("12306")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "去预订" })).toHaveLength(4);
  });

  it("navigates hotel bookings through the established hotel detail route", () => {
    renderCompare();

    fireEvent.click(screen.getAllByRole("button", { name: "去预订" })[0]);

    expect(navigateMock).toHaveBeenCalledWith("/hotel/hotel-3");
  });
});
