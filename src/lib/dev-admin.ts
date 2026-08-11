// 개발자 겸 관리자 테스트 계정. DB 권한(team_members.role)은 다른 owner와 완전히 동일하다 —
// 이 계정만 UI 표기를 "감독" 대신 "관리자"로 바꿔서 실제 팀 감독과 구분해 보여준다.
// dues 페이지의 감독/회원 화면 전환 토글도 같은 계정 기준으로 동작한다(dues/page.tsx).
export const PLATFORM_ADMIN_EMAIL = "hsp400@naver.com";
