import FeedState from "./FeedState";

/**
 * Server-rendered placeholder shown until the client dashboard is ready (it reads the URL query,
 * which is only available in the browser). Same grid and panels, so the layout does not jump.
 */
export default function PageSkeleton() {
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" style={{ flex: "none" }}>
            <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="none" stroke="var(--line)" />
            <path d="M4 17h5l2-6 3 12 3-16 3 13 2-3h6" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <h1>Sismos MX en vivo</h1>
            <p className="muted">Proyecto open source · datos del USGS, recorte a la República Mexicana</p>
          </div>
        </div>
      </header>
      <div className="shell" aria-busy="true">
        <aside className="panel shell-filters skeleton-panel" aria-hidden="true" />
        <main className="shell-main">
          <section className="panel map" aria-label="Mapa de sismos">
            <div className="map-area">
              <FeedState kind="loading" />
            </div>
          </section>
        </main>
        <aside className="panel shell-list skeleton-panel" aria-hidden="true" />
      </div>
    </>
  );
}
