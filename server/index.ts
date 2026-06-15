import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Rotas...
import authRouter from "./routes/authRoutes";
import catalogRouter from "./features/catalog/catalogRoutes";

const app = express();

// 1. TRUST PROXY: Essencial para cookies funcionarem no Safari/HTTPS
app.set("trust proxy", 1);

// 2. CORS DINÂMICO: origens de produção (com e sem WWW) + as definidas em CORS_ORIGIN
const defaultOrigins = [
  "https://josephatelier.com.br",
  "https://www.josephatelier.com.br",
];

// CORS_ORIGIN aceita múltiplas origens separadas por vírgula
const envOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];
const isDev = process.env.NODE_ENV !== "production";
const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Requisições sem Origin (curl, same-origin, apps) → permite
      if (!origin) return callback(null, true);
      // Allowlist explícita
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Em desenvolvimento, libera qualquer localhost/127.0.0.1
      if (isDev && localhostRegex.test(origin)) return callback(null, true);
      // Recusa de forma limpa: sem header CORS e SEM lançar erro (evita 500)
      return callback(null, false);
    },
    credentials: true,
    optionsSuccessStatus: 200, // Resolve o erro de status 204 no Safari
  })
);

app.use(express.json());
app.use(cookieParser());

// Rotas e restante do código...
app.use("/auth", authRouter);
app.use("/api/products", catalogRouter);

const PORT = 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend atualizado para Safari na porta ${PORT}`);
});