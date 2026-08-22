"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("lumina-theme", next);
    setTheme(next);
  }

  const nextLabel = theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro";
  return (
    <button className="theme-toggle print-hide" type="button" onClick={toggleTheme} aria-label={nextLabel} title={nextLabel}>
      <span className="theme-toggle-track" aria-hidden="true">
        <i className="theme-sun">☼</i><i className="theme-moon">☾</i><b />
      </span>
      <span className="sr-only">{nextLabel}</span>
    </button>
  );
}
