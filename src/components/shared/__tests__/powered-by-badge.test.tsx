import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { PoweredByBadge } from "../powered-by-badge";

describe("PoweredByBadge", () => {
  describe("リンク表示", () => {
    it("「Powered by」と「Koe」のテキストが表示される", () => {
      render(<PoweredByBadge />);
      expect(screen.getByText("Powered by")).toBeInTheDocument();
      expect(screen.getByText("Koe")).toBeInTheDocument();
    });

    it("デフォルトの utmSource は 'form' でリンクが生成される", () => {
      render(<PoweredByBadge />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/?utm_source=form&utm_medium=badge&utm_campaign=plg"
      );
    });

    it("utmSource prop でクエリパラメータが変わる", () => {
      render(<PoweredByBadge utmSource="widget" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/?utm_source=widget&utm_medium=badge&utm_campaign=plg"
      );
    });

    it("utmSource='wall' のとき正しいリンクが生成される", () => {
      render(<PoweredByBadge utmSource="wall" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/?utm_source=wall&utm_medium=badge&utm_campaign=plg"
      );
    });
  });

  describe("リンク属性", () => {
    it("target='_blank' が設定される", () => {
      render(<PoweredByBadge />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("rel='noopener noreferrer' が設定される", () => {
      render(<PoweredByBadge />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("UTMパラメータ構造", () => {
    it("utm_medium は常に 'badge'", () => {
      render(<PoweredByBadge utmSource="form" />);
      const link = screen.getByRole("link");
      const href = link.getAttribute("href") ?? "";
      expect(href).toContain("utm_medium=badge");
    });

    it("utm_campaign は常に 'plg'", () => {
      render(<PoweredByBadge utmSource="form" />);
      const link = screen.getByRole("link");
      const href = link.getAttribute("href") ?? "";
      expect(href).toContain("utm_campaign=plg");
    });
  });
});
