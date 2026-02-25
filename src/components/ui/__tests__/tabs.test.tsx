import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs";

describe("Tabs", () => {
  function renderTabs() {
    return render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">タブ1</TabsTrigger>
          <TabsTrigger value="tab2">タブ2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">コンテンツ1</TabsContent>
        <TabsContent value="tab2">コンテンツ2</TabsContent>
      </Tabs>
    );
  }

  it("デフォルトタブのコンテンツが表示される", () => {
    renderTabs();
    expect(screen.getByText("コンテンツ1")).toBeInTheDocument();
  });

  it("タブをクリックするとコンテンツが切り替わる", async () => {
    renderTabs();
    await userEvent.click(screen.getByRole("tab", { name: "タブ2" }));
    expect(screen.getByText("コンテンツ2")).toBeInTheDocument();
  });

  it("TabsTrigger に正しい role が付与される", () => {
    renderTabs();
    expect(screen.getByRole("tab", { name: "タブ1" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "タブ2" })).toBeInTheDocument();
  });

  it("アクティブなタブが aria-selected=true になる", () => {
    renderTabs();
    expect(screen.getByRole("tab", { name: "タブ1" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
