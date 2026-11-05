import type { ReactNode } from "react";

type Props = { filters: ReactNode; list: ReactNode; children: ReactNode };

export default function DashboardShell({ filters, list, children }: Props) {
  return (
    <div className="shell">
      <aside className="panel shell-filters" aria-label="Filtros">{filters}</aside>
      <main className="shell-main">{children}</main>
      <aside className="panel shell-list" aria-label="Últimos sismos">{list}</aside>
    </div>
  );
}
