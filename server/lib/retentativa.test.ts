import { describe, expect, it, vi } from "vitest";
import { comRetentativa, ehErroDeRede } from "./retentativa";

describe("nova tentativa em leitura", () => {
  it("repete erro de rede e devolve o resultado", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("TypeError: fetch failed")).mockResolvedValueOnce("ok");
    await expect(comRetentativa(fn, [1, 1])).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it("não repete erro de dados", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("column produtos_joseph.slug does not exist"));
    await expect(comRetentativa(fn, [1, 1])).rejects.toThrow("slug");
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("desiste depois das tentativas", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fetch failed"));
    await expect(comRetentativa(fn, [1, 1])).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
    expect(ehErroDeRede(new Error("permission denied"))).toBe(false);
  });
});
