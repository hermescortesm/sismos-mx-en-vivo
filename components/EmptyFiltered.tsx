type Props = { total: number; onReset: () => void };

/** Shown by the map and the list when the filters leave no events. */
export default function EmptyFiltered({ total, onReset }: Props) {
  return (
    <div className="panel map-empty-card">
      <div style={{ fontWeight: 600 }}>Ningún sismo coincide con los filtros</div>
      <p className="muted">
        El feed trae {total} eventos en México; amplía la magnitud, la profundidad o la ventana de tiempo.
      </p>
      <button type="button" className="empty-btn" onClick={onReset}>
        Restablecer filtros
      </button>
    </div>
  );
}
