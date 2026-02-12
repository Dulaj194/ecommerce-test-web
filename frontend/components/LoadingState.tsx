export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
      {label}
    </div>
  );
}
