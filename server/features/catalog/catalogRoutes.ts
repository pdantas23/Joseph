import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  listProductsService,
  getProductByIdService,
  createProductService,
  updateProductService,
  deleteProductService,
  uploadProductImageService,
  deleteProductImageService,
} from "./catalogService";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Apenas imagens são permitidas."));
  },
});

// ─── GET /api/products ────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const search   = String(req.query.search ?? "");
    const promocao = req.query.promocao === "true" ? true : req.query.promocao === "false" ? false : undefined;
    const ativo    = req.query.ativo === "false" ? false : true;
    const result   = await listProductsService({ search, promocao, ativo });
    res.json(result);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Erro ao listar produtos" });
  }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const product = await getProductByIdService(req.params.id as string);
    res.json(product);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    res.status(404).json({ message: "Produto não encontrado" });
  }
});

// ─── POST /api/products/upload-image ─────────────────────────────────────────
router.post(
  "/upload-image",
  requireAuth(["admin", "comercial"]),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Nenhum arquivo enviado." });
      const path = await uploadProductImageService(req.file);
      return res.json({ path });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Erro ao fazer upload." });
    }
  }
);

// ─── POST /api/products ───────────────────────────────────────────────────────
router.post("/", requireAuth(["admin", "comercial"]), async (req, res) => {
  try {
    const { nome, descricao, preco, imagem_url, imagens_paths, categoria, promocao, ativo } = req.body;

    if (!nome?.trim())      return res.status(400).json({ message: "Nome é obrigatório." });
    if (!descricao?.trim()) return res.status(400).json({ message: "Descrição é obrigatória." });
    if (typeof preco !== "number" || preco < 0) return res.status(400).json({ message: "Preço inválido." });

    const product = await createProductService({
      nome, descricao, preco, imagem_url, categoria, promocao, ativo,
      imagens_paths: Array.isArray(imagens_paths) ? imagens_paths : [],
    });
    res.status(201).json(product);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Erro ao criar produto." });
  }
});

// ─── PATCH /api/products/:id ──────────────────────────────────────────────────
router.patch("/:id", requireAuth(["admin", "comercial"]), async (req, res) => {
  try {
    const { nome, descricao, preco, imagem_url, imagens_paths, categoria, promocao, ativo } = req.body;

    if (nome !== undefined && !nome.trim())           return res.status(400).json({ message: "Nome não pode ser vazio." });
    if (descricao !== undefined && !descricao.trim()) return res.status(400).json({ message: "Descrição não pode ser vazia." });
    if (preco !== undefined && (typeof preco !== "number" || preco < 0)) return res.status(400).json({ message: "Preço inválido." });

    const product = await updateProductService(req.params.id as string, {
      nome, descricao, preco, imagem_url, categoria, promocao, ativo,
      imagens_paths: Array.isArray(imagens_paths) ? imagens_paths : undefined,
    });
    res.json(product);
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Erro ao atualizar produto." });
  }
});

// ─── DELETE /api/products/delete-image ───────────────────────────────────────
router.delete("/delete-image", requireAuth(["admin", "comercial"]), async (req, res) => {
  try {
    const { path } = req.body;

    if (!path || typeof path !== "string") {
      return res.status(400).json({ message: "Path da imagem é obrigatório." });
    }

    await deleteProductImageService(path);
    return res.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover imagem:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Erro ao remover imagem.",
    });
  }
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
router.delete("/:id", requireAuth(["admin", "comercial"]), async (req, res) => {
  try {
    await deleteProductService(req.params.id as string);
    return res.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    const message = error instanceof Error ? error.message : "Erro ao excluir produto.";
    const status  = message === "Produto não encontrado." ? 404 : 500;
    return res.status(status).json({ message });
  }
});

export default router;