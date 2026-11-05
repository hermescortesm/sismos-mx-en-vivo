import EmptyFiltered from "./EmptyFiltered";
import { MAX_ATTEMPTS } from "@/lib/feed";
import { emptyFilteredDetail } from "@/lib/feedState";
import type { FeedStateKind } from "@/lib/feedState";

type Props = {
  kind: FeedStateKind;
  /** Overrides the description line. */
  message?: string;
  /** Seconds to the next automatic retry; null when retries stopped. */
  retryIn?: number | null;
  onRetry?: () => void;
  onPause?: () => void;
  /** error: HTTP status and attempt number of the last failure. */
  httpStatus?: number | null;
  attempt?: number;
  /** error: time of the last valid data (hh:mm:ss); shown as a banner over the map when set. */
  lastValid?: string | null;
  /** filtered-empty */
  total?: number;
  summary?: string;
  /** false when the filters are already the defaults, so resetting would change nothing */
  canReset?: boolean;
};

const icon = { width: 22, height: 22, viewBox: "0 0 24 24", "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export default function FeedState({ kind, message, retryIn = null, onRetry, onPause, httpStatus = null, attempt = 1, lastValid = null, total = 0, summary = "", canReset = true }: Props) {
  if (kind === "loading") {
    return (
      <div className="state state-cover" role="status">
        <div className="state-row">
          <svg className="spin" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round">
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
          <strong>{message ?? "Cargando feed del USGS…"}</strong>
        </div>
        <div className="skeleton skeleton-map" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
        <p className="muted state-note">Esqueleto con la silueta del mapa; sin animar puntos hasta recibir el primer lote.</p>
      </div>
    );
  }

  if (kind === "empty") {
    return (
      <div className="state state-center" role="status">
        <div className="panel state-card">
          <svg {...icon} width={40} height={40} className="muted">
            <path d="M3 12h4l2-6 4 12 2-6h6" />
          </svg>
          <strong>Sin sismos registrados en México en las últimas 24 h</strong>
          <p className="muted">
            {message ?? "El feed respondió correctamente con 0 eventos dentro del área. Seguimos consultando cada 60 s."}
          </p>
        </div>
      </div>
    );
  }

  if (kind === "filtered-empty") {
    return (
      <div className="state state-center">
        <EmptyFiltered
          icon
          total={total}
          onReset={canReset ? onRetry : undefined}
          detail={emptyFilteredDetail(total, summary, canReset)}
        />
      </div>
    );
  }

  const exhausted = attempt >= MAX_ATTEMPTS;
  return (
    <div className={`state ${lastValid ? "state-banner" : "state-cover"}`}>
      <div className="panel state-card state-error" role="alert">
        <div className="state-row">
          <svg {...icon} style={{ color: "var(--danger)" }}>
            <path d="M12 3l10 18H2L12 3z" />
            <path d="M12 10v5M12 18v.01" />
          </svg>
          <strong>No se pudo actualizar el feed</strong>
        </div>
        <p className="muted state-desc">
          {message ??
            (exhausted
              ? "El servidor del USGS sigue sin responder. Los reintentos automáticos se detuvieron."
              : "El servidor del USGS respondió con un error. Reintento automático con espera exponencial.")}
        </p>
        <div className="mono state-mono">
          {httpStatus ? `HTTP ${httpStatus} · ` : ""}intento {attempt} de {MAX_ATTEMPTS}
          {!exhausted && retryIn !== null ? ` · siguiente en ${retryIn} s` : ""}
        </div>
        {lastValid && <p className="state-warn">Mostrando los últimos datos válidos ({lastValid}).</p>}
        <div className="state-actions">
          <button type="button" className="state-btn state-btn-primary" onClick={onRetry}>
            Reintentar ahora
          </button>
          {!exhausted && (
            <button type="button" className="state-btn" onClick={onPause}>
              Pausar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
