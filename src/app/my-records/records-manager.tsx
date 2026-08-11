import Link from "next/link";
import { formatMatchRecordDate, formatMatchRecordScore, type TeamMatchRecord } from "@/lib/records";

type Props = {
  records: TeamMatchRecord[];
};

// 경기 기록 목록: 클릭하면 /my-records/[eventId] 상세 페이지로 이동한다.
// 참여자/MOM투표/기록입력은 상세 페이지(match-record-detail.tsx)에서 처리한다.
export default function RecordsManager({ records }: Props) {
  if (records.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">지난 경기 기록이 아직 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {records.map((record) => (
        <Link
          key={record.id}
          href={`/my-records/${record.id}`}
          className="flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm transition-colors hover:bg-black/[.02] dark:border-white/[.1] dark:bg-white/[.03] dark:hover:bg-white/[.06]"
        >
          <p className="text-sm text-zinc-500">{formatMatchRecordDate(record.starts_at)}</p>
          <h2 className="text-lg font-semibold">vs {record.opponent_name ?? "상대 미입력"}</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{formatMatchRecordScore(record)}</span>
            <span className="text-xs text-zinc-400">참여 {record.attendees.length}명</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
