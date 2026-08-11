import { ImageResponse } from "next/og";

// 홈 화면 아이콘(192x192). 별도 로고 에셋 없이 코드로 생성한 임시 아이콘 —
// 실제 팀 로고가 생기면 이 파일만 교체하면 된다.
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
          fontSize: 110,
        }}
      >
        ⚽
      </div>
    ),
    { width: 192, height: 192 }
  );
}
