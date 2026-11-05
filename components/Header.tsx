import ThemeToggle from "./ThemeToggle";
import { formatCentral } from "@/lib/feed";
import type { FeedError } from "@/hooks/useQuakeFeed";
import type { FeedStatus } from "@/lib/usgs";

type Props = {
  status: FeedStatus;
  lastUpdated: Date | null;
  nextRefreshIn: number | null;
  error: FeedError | null;
  onToggleLive: () => void;
};

function nextLabel({ status, nextRefreshIn, error }: Pick<Props, "status" | "nextRefreshIn" | "error">) {
  if (status === "paused") return "Actualización detenida";
  if (status === "loading") return "Consultando…";
  if (status === "error") {
    return error?.retryIn == null ? "Error · sin conexión" : `Error · reintento en ${error.retryIn} s`;
  }
  return `Siguiente consulta en ${nextRefreshIn ?? 0} s`;
}

export default function Header({ status, lastUpdated, nextRefreshIn, error, onToggleLive }: Props) {
  const paused = status === "paused";
  return (
    <header className="app-header">
      <div className="brand">
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" style={{ flex: "none" }}>
          <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="none" stroke="var(--line)" />
          <path
            d="M4 17h5l2-6 3 12 3-16 3 13 2-3h6"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ minWidth: 0 }}>
          <h1>Sismos MX en vivo</h1>
          <p className="muted">Proyecto open source · datos del USGS, recorte a la República Mexicana</p>
          <span className="mono muted act">
            Act. {lastUpdated ? formatCentral(lastUpdated).slice(-8) : "—"} · {nextLabel({ status, nextRefreshIn, error })}
          </span>
        </div>
      </div>

      <div className="updated">
        <span className="muted updated-label">Última actualización</span>
        <span className="mono">
          {lastUpdated ? formatCentral(lastUpdated) : "—"} <span className="muted">(hora del centro)</span>
        </span>
      </div>

      <div className="header-actions">
        <span className="mono muted next">{nextLabel({ status, nextRefreshIn, error })}</span>
        <button type="button" className={`pill ${paused ? "pill-paused" : "pill-live"}`} aria-pressed={!paused} onClick={onToggleLive}>
          <span className={paused ? "pill-dot" : "pill-dot blink"} />
          {paused ? "Pausado" : "En vivo"}
        </button>
        <ThemeToggle />
        <a className="source-link" href="https://github.com/hermescortesm/sismos-mx-en-vivo">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
          </svg>
          Código fuente
        </a>
      </div>
    </header>
  );
}
