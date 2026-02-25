import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../card";

describe("Card", () => {
  it("Card コンテンツを表示する", () => {
    render(<Card>カード内容</Card>);
    expect(screen.getByText("カード内容")).toBeInTheDocument();
  });

  it("Card に正しいスタイルクラスが付与される", () => {
    const { container } = render(<Card />);
    expect(container.firstChild).toHaveClass("rounded-lg", "border", "bg-card");
  });

  it("CardHeader + CardTitle + CardDescription + CardContent + CardFooter が組み合わせて動作する", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>タイトル</CardTitle>
          <CardDescription>説明</CardDescription>
        </CardHeader>
        <CardContent>コンテンツ</CardContent>
        <CardFooter>フッター</CardFooter>
      </Card>
    );
    expect(screen.getByText("タイトル")).toBeInTheDocument();
    expect(screen.getByText("説明")).toBeInTheDocument();
    expect(screen.getByText("コンテンツ")).toBeInTheDocument();
    expect(screen.getByText("フッター")).toBeInTheDocument();
  });

  it("CardTitle にセマンティッククラスが適用される", () => {
    const { container } = render(<CardTitle>タイトル</CardTitle>);
    expect(container.firstChild).toHaveClass("font-semibold");
  });

  it("CardDescription にミュートスタイルが適用される", () => {
    const { container } = render(<CardDescription>説明</CardDescription>);
    expect(container.firstChild).toHaveClass("text-muted-foreground");
  });

  it("カスタムクラスが適用される", () => {
    const { container } = render(<Card className="custom-card" />);
    expect(container.firstChild).toHaveClass("custom-card");
  });
});
