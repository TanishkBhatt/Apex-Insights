"use client";

import { useEffect, useState } from "react";

/** Tracks whether the `.dark` class is active so client components can adapt
 *  values that cannot be expressed with CSS variables (e.g. Recharts SVG props). */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
