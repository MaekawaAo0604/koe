import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Koe - テスティモニアル収集・管理SaaS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "48px",
        }}
      >
        {/* ロゴ */}
        <div
          style={{
            fontSize: 96,
            fontWeight: "bold",
            color: "white",
            letterSpacing: "-2px",
            marginBottom: 24,
          }}
        >
          Koe
        </div>

        {/* メインコピー */}
        <div
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: "rgba(255,255,255,0.95)",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          顧客の声を集めて売上に変える
        </div>

        {/* サブコピー */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.75)",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          フォームURL共有 → 自動収集 → scriptタグ1行埋め込み
        </div>

        {/* バッジ */}
        <div
          style={{
            display: "flex",
            marginTop: 40,
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: 40,
            padding: "10px 28px",
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "white",
            }}
          >
            テスティモニアル収集・管理SaaS
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
