import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// iOS "홈 화면에 추가"는 manifest 아이콘이 아니라 이 파일(apple-touch-icon)을 쓴다.
// 없으면 페이지 스크린샷이 아이콘으로 잡힌다.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
        <img src={logoDataUrl} alt="" width={158} height={158} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size }
  );
}
