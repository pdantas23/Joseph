import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter    from "./routes/authRoutes";
import catalogRouter from "./features/catalog/catalogRoutes";

const app = express();

// 1. Logs de Debug (Para ver no Easypanel exatamente o que está chegando)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 2. CORS Hardcoded (Para eliminar dúvida sobre variáveis de ambiente)
app.use(
  cors({
    origin: "https://josephatelier.com.br",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// 3. Rota de teste na raiz (Se essa não funcionar, o problema é o Easypanel)
app.get("/ping", (_req, res) => {
  console.log("Recebido PING com sucesso");
  res.send("pong");
});

app.use("/auth",          authRouter);
app.use("/api/products",  catalogRouter);

// 4. Middleware de erro robusto
app.use((err: any, req: any, res: any, _next: any) => {
  console.error("[SERVER ERROR]", {
    path: req.path,
    message: err?.message,
    stack: err?.stack
  });
  res.status(500).json({ error: err?.message ?? "Internal Server Error" });
});

// Força a porta 3001 para bater com o Easypanel
const PORT = 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 BACKEND ATIVO NA PORTA ${PORT}`);
});