import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LIGHT = {
  bgTop: "#F5F0E6",
  bgBottom: "#EDE4D3",
  ink: "#3A3226",
  muted: "#8C8272",
  surface: "#FBF8F1",
  chipBorder: "rgba(27,42,65,0.25)",
  // Couleurs d'accent, identiques dans les deux thèmes
  navy: "#1B2A41",
  navyShadow: "#0F1A29",
  burgundy: "#7B2D26",
  burgundyShadow: "#4A130F",
  forest: "#3F5B4A",
  forestShadow: "#1A2B21",
  gold: "#D9C48A",
  goldDeep: "#B08D57",
};

const DARK = {
  bgTop: "#141C28",
  bgBottom: "#0B121C",
  ink: "#EDE4D3",
  muted: "#9AA3AE",
  surface: "#1C2733",
  chipBorder: "rgba(217,196,138,0.3)",
  navy: "#2A3E5C",
  navyShadow: "#0F1A29",
  burgundy: "#8C382F",
  burgundyShadow: "#4A130F",
  forest: "#4E6E58",
  forestShadow: "#1A2B21",
  gold: "#D9C48A",
  goldDeep: "#C9A24B",
};

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof LIGHT;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Chargement de la préférence sauvegardée, une seule fois au démarrage
  useEffect(() => {
    AsyncStorage.getItem("flashcards_theme").then((value) => {
      if (value === "dark") setIsDark(true);
      setLoaded(true);
    });
  }, []);

  // Sauvegarde à chaque changement, mais seulement après le premier chargement
  // (sinon on écraserait la vraie valeur sauvegardée par la valeur initiale "false")
  useEffect(() => {
    if (loaded) AsyncStorage.setItem("flashcards_theme", isDark ? "dark" : "light");
  }, [isDark, loaded]);

  function toggleTheme() {
    setIsDark((prev) => !prev);
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors: isDark ? DARK : LIGHT }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé à l'intérieur de ThemeProvider");
  return ctx;
}