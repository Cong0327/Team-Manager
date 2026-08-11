// 생년월일(YYYY-MM-DD)로 만 나이를 계산한다. 서버/클라이언트 양쪽에서 쓰는 순수 함수라
// 서버 전용 모듈(next/headers 등)에 의존하지 않도록 별도 파일로 분리한다.
export function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  // 올해 생일이 아직 안 지났으면 한 살 뺀다.
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}
