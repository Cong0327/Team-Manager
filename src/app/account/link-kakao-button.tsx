// 카카오톡(톡캘린더) 연동. Supabase Auth를 거치지 않고 앱이 직접 카카오 OAuth를 호출하는
// /api/kakao/link로 이동한다 — account_email 스코프와 무관해 심사 없이 바로 동작한다.
// 일반 링크 이동이라 클라이언트 JS가 필요 없다(서버 컴포넌트에서도 렌더 가능).
export default function LinkKakaoButton() {
  return (
    <a
      href="/api/kakao/link"
      className="rounded bg-[#FEE500] px-3 py-2 text-sm font-medium text-black"
    >
      카카오톡 연동하기
    </a>
  );
}
