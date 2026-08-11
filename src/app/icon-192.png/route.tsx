import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// 홈 화면 아이콘(192x192). public/kfc-logo.png(팀 로고)를 흰 배경 정사각형 캔버스
// 가운데에 맞춰 넣는다 — 로고 원본이 정사각형이 아니라(565x447) 그대로 쓰면
// manifest 아이콘 규격(정사각형)에 안 맞는다.
export async function GET() {
  const logoPath = path.join(process.cwd(), "public", "kfc-logo.png");
  const logoBuffer = await readFile(logoPath);
  const logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUrl} alt="" width={168} height={168} style={{ objectFit: "contain" }} />
      </div>
    ),
    { width: 192, height: 192 }
  );
}
