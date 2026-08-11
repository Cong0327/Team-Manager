import { ImageResponse } from "next/og";

// 홈 화면 아이콘(512x512). icon-192.png와 동일한 디자인, 큰 사이즈용.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16a34a",
          fontSize: 300,
        }}
      >
        ⚽
      </div>
    ),
    { width: 512, height: 512 }
  );
}
