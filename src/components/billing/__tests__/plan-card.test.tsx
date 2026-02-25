import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { PlanCard, FREE_FEATURES, PRO_FEATURES } from "../plan-card";

describe("PlanCard", () => {
  it("Freeプランカードが表示される", () => {
    render(
      <PlanCard
        plan="free"
        currentPlan="free"
        price="¥0"
        description="個人・小規模なテスティモニアル収集に"
        features={FREE_FEATURES}
      />
    );
    expect(screen.getByTestId("plan-card-free")).toBeInTheDocument();
    expect(screen.getByTestId("plan-name")).toHaveTextContent("Free");
    expect(screen.getByTestId("plan-price")).toHaveTextContent("¥0");
  });

  it("Proプランカードが表示される", () => {
    render(
      <PlanCard
        plan="pro"
        currentPlan="free"
        price="¥980"
        description="プロフェッショナルな活用に"
        features={PRO_FEATURES}
      />
    );
    expect(screen.getByTestId("plan-card-pro")).toBeInTheDocument();
    expect(screen.getByTestId("plan-name")).toHaveTextContent("Pro");
    expect(screen.getByTestId("plan-price")).toHaveTextContent("¥980");
  });

  it("現在のプランに「現在のプラン」バッジが表示される", () => {
    render(
      <PlanCard
        plan="free"
        currentPlan="free"
        price="¥0"
        description="テスト"
        features={FREE_FEATURES}
      />
    );
    expect(screen.getByTestId("current-plan-badge")).toBeInTheDocument();
    expect(screen.getByTestId("current-plan-badge")).toHaveTextContent("現在のプラン");
  });

  it("現在のプランでない場合「現在のプラン」バッジが表示されない", () => {
    render(
      <PlanCard
        plan="pro"
        currentPlan="free"
        price="¥980"
        description="テスト"
        features={PRO_FEATURES}
      />
    );
    expect(screen.queryByTestId("current-plan-badge")).not.toBeInTheDocument();
  });

  it("childrenが渡された場合に表示される", () => {
    render(
      <PlanCard
        plan="pro"
        currentPlan="free"
        price="¥980"
        description="テスト"
        features={PRO_FEATURES}
      >
        <button>アップグレード</button>
      </PlanCard>
    );
    expect(screen.getByRole("button", { name: "アップグレード" })).toBeInTheDocument();
  });

  it("Free featuresが表示される", () => {
    render(
      <PlanCard
        plan="free"
        currentPlan="free"
        price="¥0"
        description="テスト"
        features={FREE_FEATURES}
      />
    );
    expect(screen.getByText("1プロジェクト")).toBeInTheDocument();
  });

  it("Pro featuresが表示される", () => {
    render(
      <PlanCard
        plan="pro"
        currentPlan="free"
        price="¥980"
        description="テスト"
        features={PRO_FEATURES}
      />
    );
    expect(screen.getByText("プロジェクト無制限")).toBeInTheDocument();
  });
});
