/**
 * Nova tentativa curta para LEITURAS que falham por rede (ex.: "TypeError:
 * fetch failed" na conexão com o Supabase). Só para operações idempotentes;
 * erro de dados (coluna, permissão etc.) não é repetido.
 */
export function ehErroDeRede(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.message} ${String((err as any).cause ?? "")}` : String(err);
  return /fetch failed|ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|socket hang up|network/i.test(msg);
}

export async function comRetentativa<T>(fn: () => Promise<T>, esperasMs: number[] = [250, 750]): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= esperasMs.length || !ehErroDeRede(err)) throw err;
      console.warn(`Leitura falhou por rede, tentando de novo em ${esperasMs[i]} ms:`, err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, esperasMs[i]));
    }
  }
}
