type Props = {
  total: number;
  /** No button when omitted, for example when the filters are already the defaults. */
  onReset?: () => void;
  /** Overrides the second line. */
  detail?: string;
  /** Funnel icon above the title. */
  icon?: boolean;
};

/** Shown by the map and the list when the filters leave no events. */
export default function EmptyFiltered({ total, onReset, detail, icon = false }: Props) {
  return (
    <div className="panel map-empty-card">
      {icon && (
        <svg className="muted" width="40" height="40" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />
        </svg>
      )}
      <div style={{ fontWeight: 600 }}>Ningún sismo coincide con los filtros</div>
      <p className="muted">
        {detail ?? `El feed trae ${total} eventos en México; amplía la magnitud, la profundidad o la ventana de tiempo.`}
      </p>
      {onReset && (
        <button type="button" className="empty-btn" onClick={onReset}>
          Restablecer filtros
        </button>
      )}
    </div>
  );
}
