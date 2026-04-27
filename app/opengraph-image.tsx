import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CUBO Shop — 피규어, 가방, 봉제인형 등 온라인 도매몰";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#7FD9C7",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          color: "#171717",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#E91E63",
            letterSpacing: -2,
          }}
        >
          CUBO
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            marginTop: 24,
            color: "#E91E63",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          인형뽑기 전문 도매샵
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            marginTop: 16,
            lineHeight: 1.15,
            letterSpacing: -2,
          }}
        >
          피규어, 가방, 봉제인형 등
          <br />
          <span style={{ color: "#E91E63" }}>온라인 도매몰.</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
