import type { MetadataRoute } from "next";

// 앱스토어 없이 "홈 화면에 추가"로 설치형 웹앱처럼 쓸 수 있게 하는 매니페스트.
// Next.js가 이 파일을 자동으로 /manifest.webmanifest로 빌드하고 <head>에 링크를 넣어준다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Team Manager",
    short_name: "팀매니저",
    description: "축구 팀 관리 - 명단, 투표, 일정, 사진첩",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
