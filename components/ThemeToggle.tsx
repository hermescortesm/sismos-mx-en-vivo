"use client";

import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)" }}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
