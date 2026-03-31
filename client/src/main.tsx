import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider }  from "@/features/auth/AuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/*
      ThemeProvider:
        - defaultTheme="light"  → força tema claro (padrão)
        - switchable={true}     → ativa o toggle de dark mode (opcional por projeto)
    */}
    <ThemeProvider defaultTheme="light" switchable={false}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
