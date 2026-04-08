import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter    from "./routes/authRoutes";
import catalogRouter from "./features/catalog/catalogRoutes";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/ping", (_req, res) => res.json({ ok: true }));

app.use("/auth",          authRouter);
app.use("/api/products",  catalogRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[ERROR]", err?.message ?? err);
  res.status(500).json({ error: err?.message ?? "Internal Server Error" });
});

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
