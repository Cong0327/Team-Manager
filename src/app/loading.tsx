export default function Loading() {
  return (
    <main
      aria-label="페이지 불러오는 중"
      aria-busy="true"
      className="flex flex-1 flex-col gap-5 px-6 py-10"
    >
      <div className="h-7 w-36 animate-pulse rounded bg-black/[.08] dark:bg-white/[.1]" />
      <div className="h-4 w-24 animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
      <div className="mt-2 h-52 animate-pulse rounded-xl bg-black/[.04] dark:bg-white/[.06]" />
      <span className="sr-only">페이지를 불러오고 있습니다.</span>
    </main>
  );
}
