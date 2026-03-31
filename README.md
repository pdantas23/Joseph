# Joseph Atelier

Sistema interno e público da marca **Joseph Atelier** — atelier de moda feminina.

Stack: **Vite + React 19 + TypeScript + Tailwind 4 + Express + Supabase**

---

## Visão geral

O projeto contempla:

| Área           | Tipo     | Acesso                     |
|----------------|----------|----------------------------|
| Home (`/`)     | Pública  | Todos                      |
| Catálogo (`/catalogo`) | Pública | Todos              |
| Comercial (`/comercial`) | Restrita | `admin`, `comercial` |
| Marketing (`/marketing`) | Restrita | `admin`, `marketing` |
| Login (`/login`) | Pública | Todos                    |

---

## Stack utilizada

| Camada      | Tecnologia                            |
|-------------|---------------------------------------|
| Frontend    | React 19 + TypeScript + Vite          |
| Estilização | Tailwind CSS 4 + inline styles        |
| Roteamento  | Wouter                                |
| Backend     | Express 5 + TypeScript (tsx)          |
| Banco       | Supabase (PostgreSQL + RLS)           |
| Auth        | Supabase Auth                         |
| Storage     | Supabase Storage (bucket público)     |
| UI base     | Radix UI + componentes customizados   |

---

## Requisitos

| Ferramenta | Versão mínima |
|------------|---------------|
| Node.js    | 20.x          |
| npm        | 10.x          |
| Conta Supabase | Plano gratuito funciona |

---

## Como rodar o projeto

```bash
# 1. Descompactar e entrar no diretório
unzip joseph_atelier.zip
cd joseph_atelier

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env   # edite o .env com suas chaves

# 4. Rodar migrations no Supabase (ver seção abaixo)

# 5. Criar bucket no Supabase Storage (ver seção abaixo)

# 6. Iniciar o projeto
npm run dev
```

Acesse em:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

---

## Variáveis de ambiente

```env
# Supabase
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key

SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# CORS
CORS_ORIGIN=http://localhost:3000

# WhatsApp (opcional)
VITE_WHATSAPP_NUMBER=5500999999999
VITE_WHATSAPP_MESSAGE=Olá! Gostaria de um atendimento personalizado.
```

**Onde encontrar as chaves Supabase:** `Project Settings → API`

---

## Como conectar ao Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em `Project Settings → API`
4. Copie a **URL**, **anon key** e **service role key**
5. Cole no arquivo `.env`

---

## Migrations

Execute no Supabase: `SQL Editor → New query` → cole e execute **na ordem**:

### Migration 1 — `supabase/migrations/001_joseph_atelier.sql`

Cria:
- Tabela `profiles_drystore` com roles: `admin`, `marketing`, `comercial`
- Tabela `produtos_drystore` com categorias de moda feminina
- Trigger de criação automática de perfil ao registrar usuário
- Trigger `updated_at` em ambas as tabelas
- Todas as políticas RLS
- Políticas de Storage para o bucket `products_drystore`
- Índices de performance
- Dados de exemplo (6 peças da coleção)

### Migration 2 — `supabase/migrations/002_produto_imagens.sql`

Cria:
- Tabela `produtos_imagens_drystore` (imagens adicionais por produto)
- FK com `ON DELETE CASCADE` para `produtos_drystore`
- Índice por `produto_id` e `ordem`
- Políticas RLS

---

## Bucket de imagens

1. No Supabase → **Storage → New bucket**
2. Nome: **`products_drystore`**
3. Marque **Public bucket** ✅
4. Clique em **Save**

---

## Roles e permissões

| Role       | Acesso                                      |
|------------|---------------------------------------------|
| `admin`    | `/comercial` + `/marketing` (acesso total)  |
| `marketing`| `/marketing` (visualização e divulgação)    |
| `comercial`| `/comercial` (cadastro e edição de peças)   |

### Como atribuir roles

Após criar usuários no painel **Authentication → Users**, execute no SQL Editor:

```sql
UPDATE public.profiles_drystore SET role = 'admin'
  WHERE email = 'admin@josephatelier.com';

UPDATE public.profiles_drystore SET role = 'marketing'
  WHERE email = 'marketing@josephatelier.com';

UPDATE public.profiles_drystore SET role = 'comercial'
  WHERE email = 'comercial@josephatelier.com';
```

### Regras de acesso por rota

| Rota          | Sem login | `comercial` | `marketing` | `admin` |
|---------------|-----------|-------------|-------------|---------|
| `/`           | ✅        | ✅          | ✅          | ✅      |
| `/catalogo`   | ✅        | ✅          | ✅          | ✅      |
| `/comercial`  | ❌ → login| ✅          | ❌ → `/`    | ✅      |
| `/marketing`  | ❌ → login| ❌ → `/`    | ✅          | ✅      |

---

## Áreas do sistema

### Home (`/`)
Página pública com:
- Navegação com identidade da marca
- Hero com título editorial e CTAs
- Carrossel dinâmico: exibe produtos marcados como "destaque" do Supabase; se não houver, exibe slides editoriais de fallback
- Grid com até 4 produtos em destaque da coleção
- Bloco de brand statement
- Cards de CTA (WhatsApp e Catálogo)
- Footer com navegação

### Catálogo (`/catalogo`)
Página pública com:
- Header sticky com logotipo e botão de filtros
- Painel de filtros expansível: busca por texto, categoria, faixa de preço, apenas destaques
- Grid de produtos 2–4 colunas (responsivo)
- Cards com imagem em proporção 3:4, nome, categoria e preço
- Badge "Destaque" para produtos em promoção
- Badge com contador de imagens adicionais
- Modal de produto: galeria com navegação por teclado (←/→/Esc), thumbnails, dados completos, CTA WhatsApp
- Link `?produto=<id>` abre modal diretamente (vindo da Home)

### Comercial (`/comercial`)
Área restrita (`admin` + `comercial`) com:
- Lista de todos os produtos (inclusive inativos)
- Busca por nome/descrição
- Cadastro e edição de peças via modal
- Upload múltiplo de imagens com preview instantâneo
- Definição de capa (estrela), remoção individual de imagens
- Campos: nome, descrição, preço, categoria, destaque, ativo/inativo
- Todas as operações autenticadas via API Express

### Marketing (`/marketing`)
Área restrita (`admin` + `marketing`) com:
- Cards de estatísticas (total de peças, destaques, status do catálogo)
- Link copiável do catálogo público
- Link de disparo WhatsApp pré-formatado com peças em destaque
- Lista de peças em destaque com link direto copiável por produto
- Grid completo de produtos com link copiável individual

---

## Como o catálogo e a Home consomem os dados

```
Supabase
  └── produtos_drystore (produtos ativos)
  └── produtos_imagens_drystore (imagens adicionais)
          ↓
  GET /api/products (Express)
    └── catalogService.ts
        └── monta URLs públicas do Storage
        └── junta imagens adicionais
          ↓
  catalogApi.ts (cliente)
    ├── listProducts({ ativo: true })         → Catálogo + Home
    ├── listProducts({ promocao: true })       → Carrossel da Home
    └── listProducts({ ativo: undefined })     → Área Comercial
```

---

## Estrutura do projeto

```
├── client/src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx      ← Contexto global de autenticação
│   │   │   ├── ProtectedRoute.tsx    ← Guarda de rotas por role
│   │   │   ├── authService.ts        ← Integração Supabase Auth
│   │   │   ├── authTypes.ts          ← Tipos: AppRole, UserProfile, etc.
│   │   │   └── useAuth.ts            ← Hook de acesso ao AuthContext
│   │   ├── catalog/
│   │   │   ├── catalogApi.ts         ← Chamadas à API Express
│   │   │   ├── catalogTypes.ts       ← Tipos de produtos e payloads
│   │   │   ├── components/
│   │   │   │   └── ProductForm.tsx   ← Formulário com upload de imagens
│   │   │   └── pages/
│   │   │       └── Catalog.tsx       ← Catálogo público com filtros e modal
│   │   ├── comercial/
│   │   │   └── pages/
│   │   │       └── Comercial.tsx     ← Gestão de peças (CRUD)
│   │   └── marketing/
│   │       └── pages/
│   │           └── Marketing.tsx     ← Visão de marketing + links
│   ├── pages/
│   │   ├── Home.tsx                  ← Página pública da marca
│   │   ├── Login.tsx                 ← Tela de login
│   │   └── NotFound.tsx              ← 404
│   ├── components/
│   │   └── DashboardLayout.tsx       ← Layout das áreas internas
│   ├── lib/
│   │   ├── roleRoutes.ts             ← Mapa role → rota padrão
│   │   └── supabase.ts               ← Cliente Supabase (frontend)
│   └── App.tsx                       ← Roteamento principal
│
├── server/
│   ├── features/catalog/
│   │   ├── catalogRoutes.ts          ← Endpoints REST + multer upload
│   │   ├── catalogService.ts         ← Lógica de negócio + Storage
│   │   └── catalogTypes.ts           ← Tipos do servidor
│   ├── middlewares/
│   │   └── requireAuth.ts            ← Middleware de autenticação JWT
│   ├── routes/
│   │   └── authRoutes.ts             ← Endpoints de autenticação
│   ├── services/
│   │   └── authService.ts            ← Validação de sessão Supabase
│   ├── lib/
│   │   └── supabase.ts               ← Cliente Supabase (servidor)
│   └── index.ts                      ← Entry point Express
│
├── shared/
│   └── const.ts                      ← Constantes compartilhadas
│
└── supabase/
    └── migrations/
        ├── 001_joseph_atelier.sql    ← Execute primeiro
        └── 002_produto_imagens.sql   ← Execute segundo
```

---

## Desenvolvimento

```bash
# Frontend + Backend juntos (recomendado)
npm run dev

# Separados
npm run dev:client   # http://localhost:3000
npm run dev:server   # http://localhost:3001

# Verificar tipos TypeScript
npm run check

# Formatar código
npm run format

# Build para produção
npm run build
```

---

## Identidade visual

O sistema segue a paleta e a linguagem visual da marca Joseph Atelier:

| Token      | Hex       | Uso                                       |
|------------|-----------|-------------------------------------------|
| Brown      | `#333333` | Texto principal, botões primários, marca  |
| Bege 1     | `#B3B3B3` | Labels, textos secundários                |
| Bege 2     | `#CCCCCC` | Bordas suaves, separadores                |
| Bege 3     | `#E6E6E6` | Bordas de cards, fundos de inputs         |
| Off-White  | `#F2F2F2` | Background de páginas                     |
| Branco     | `#FFFFFF` | Cards, modais, header                     |
| Rosé       | `#E8D5D0` | Acento suave, badges de destaque          |
| Rosé escuro| `#C9A89E` | Texto sobre fundo rosé                    |

Tipografia: `Georgia / Times New Roman` para títulos e logotipo; `Fira Sans / Helvetica Neue` para interface.

---

## Observações de manutenção

- **Bucket Storage**: o bucket `products_drystore` deve ser público. As URLs são montadas dinamicamente pelo `catalogService.ts` usando `SUPABASE_URL`.
- **Roles**: novos usuários recebem role `comercial` por padrão (via trigger). Altere manualmente no SQL Editor para `admin` ou `marketing`.
- **Categorias**: as categorias de produto estão definidas em `client/src/features/catalog/catalogTypes.ts` e `server/features/catalog/catalogTypes.ts` — altere em ambos os lugares e atualize a constraint no banco (`001_joseph_atelier.sql`).
- **WhatsApp**: o número é configurado via `VITE_WHATSAPP_NUMBER` no `.env`. Use o formato internacional sem `+` (ex: `5511999999999`).
- **Produtos inativos**: a área Comercial mostra todos os produtos; o Catálogo público mostra apenas os `ativo = true`.
