import DashboardShell from "@/components/DashboardShell";
import ThemeToggle from "@/components/ThemeToggle";

export default function Page() {
  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "14px 20px",
          borderBottom: "1px solid var(--line)",
          background: "var(--panel)",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Sismos MX en vivo</h1>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            Proyecto open source · datos del USGS, recorte a la República Mexicana
          </p>
        </div>
        <ThemeToggle />
      </header>
      <DashboardShell filters={<div style={{ padding: 16 }}>Filtros</div>} list={<div style={{ padding: 16 }}>Últimos sismos</div>}>
        <section className="panel" style={{ padding: 16, minHeight: 360 }}>
          Mapa
        </section>
      </DashboardShell>
    </>
  );
}
