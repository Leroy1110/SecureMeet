import { useEffect, useState } from "react";

export type LandingTheme = "dark" | "light";

function getInitialTheme(): LandingTheme {
  if (typeof window === "undefined") return "light";

  try {
    const saved = window.localStorage.getItem("sm-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // ignore
  }

  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useLandingTheme() {
  const [theme, setTheme] = useState<LandingTheme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("sm-dark");
    else root.classList.remove("sm-dark");

    try {
      window.localStorage.setItem("sm-theme", theme);
    } catch {
      // ignore
    }

    return () => {
      root.classList.remove("sm-dark");
    };
  }, [theme]);

  return { theme, setTheme };
}
