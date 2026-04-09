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

// 2. CORS DINÂMICO: Aceita com e sem WWW
const allowedOrigins = [
  "https://josephatelier.com.br",
  "https://www.josephatelier.com.br"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS: Origem não permitida pelo servidor"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200 // Resolve o erro de status 204 no Safari
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