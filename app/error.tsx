"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="state-page">
      <div className="panel state-card state-error" role="alert">
        <strong>No se pudo mostrar el panel</strong>
        <p className="muted">Ocurrió un error inesperado al cargar la página.</p>
        <div className="state-actions">
          <button type="button" className="state-btn state-btn-primary" onClick={reset}>
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
