/**
 * slugify: tira acentos, põe em minúsculas e troca tudo que não for
 * [a-z0-9] por hífen. Usado pela API para gerar o slug do produto.
 */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
