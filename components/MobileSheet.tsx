"use client";

import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export type SheetTab = "lista" | "filtros";

type Props = {
  open: boolean;
  tab: SheetTab;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: SheetTab) => void;
  lista: ReactNode;
  filtros: ReactNode;
  /** Strip rendered just above the sheet, for example the selected event. */
  above?: ReactNode;
};

const TABS: { id: SheetTab; label: string }[] = [
  { id: "lista", label: "Últimos 20" },
  { id: "filtros", label: "Filtros" },
];

export default function MobileSheet({ open, tab, onOpenChange, onTabChange, lista, filtros, above }: Props) {
  const tabRefs = useRef<Record<SheetTab, HTMLButtonElement | null>>({ lista: null, filtros: null });

  const select = (id: SheetTab) => {
    onTabChange(id);
    onOpenChange(true);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tab === "lista" ? "filtros" : "lista";
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={`sheet ${open ? "sheet-open" : ""}`}>
      {above && <div className="sheet-above">{above}</div>}
      <div className="sheet-bar">
        <button
          type="button"
          className="sheet-toggle"
          aria-expanded={open}
          aria-controls="sheet-panel"
          aria-label={open ? "Contraer panel" : "Expandir panel"}
          onClick={() => onOpenChange(!open)}
        >
          <span className="sheet-grabber" aria-hidden="true" />
        </button>
        <div role="tablist" aria-label="Paneles" className="sheet-tabs" onKeyDown={onKeyDown}>
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="sheet-panel"
              tabIndex={tab === t.id ? 0 : -1}
              className="sheet-tab"
              onClick={() => select(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div id="sheet-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} hidden={!open} className="sheet-panel">
        {tab === "lista" ? lista : filtros}
      </div>
    </div>
  );
}
