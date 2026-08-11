// 선수 포지션 선택지(축구 세부 포지션). 마이페이지 상세정보 폼과 명단관리 표가 함께 쓴다.
// 서버/클라이언트 양쪽에서 import하는 순수 상수라 서버 전용 모듈에 의존하지 않는다.
// 순서는 GK → 수비 → 미드필더 → 공격 흐름으로 둔다.
export const POSITIONS = [
  "GK",
  "RB",
  "LB",
  "RWB",
  "LWB",
  "CB",
  "CDM",
  "CM",
  "CAM",
  "RW",
  "LW",
  "CF",
  "ST",
] as const;

// 한 선수가 선택할 수 있는 최대 포지션 수.
export const MAX_POSITIONS = 2;
