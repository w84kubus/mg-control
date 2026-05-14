export default function AdminErrorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
        Logi błędów
      </h1>
      <div className="rounded-2xl flex items-center justify-center py-24"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>Etap 9 – Dziennik błędów</p>
      </div>
    </div>
  );
}
