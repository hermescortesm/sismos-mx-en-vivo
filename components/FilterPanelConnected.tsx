"use client";

import FilterPanel from "./FilterPanel";
import { useFilters } from "@/hooks/useFilters";

export default function FilterPanelConnected() {
  const { value, onChange, onReset } = useFilters();
  return <FilterPanel value={value} onChange={onChange} onReset={onReset} />;
}
