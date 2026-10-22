import { describe, expect, it } from "vitest";
import { exportarCSV, exportarJSON, lerImportacao } from "./backup";
import { REGRAS_PADRAO } from "./calculo";

describe("importação", () => {
  it("lê reais e datas no formato brasileiro e infere vendido", () => {
    const { itens, regras } = lerImportacao(
      JSON.stringify({
        itens: [
          {
            nome: "Bicicleta aro 29",
            compra_valor: 300,
            compra_data: "01/10/2026",
            venda_valor: "550,00",
            venda_data: "2026-10-11",
            gastos: [{ descricao: "Pneu", valor: 48.5 }],
          },
        ],
        regras: { margem_min_pct: 25, lucro_min: 100 },
      }),
    );
    expect(itens[0]).toMatchObject({
      nome: "Bicicleta aro 29",
      tipo: "revenda",
      situacao: "vendido",
      compra_valor: 30000,
      compra_data: "2026-10-01",
      venda_valor: 55000,
      gastos: [{ descricao: "Pneu", valor: 4850, data: "2026-10-01" }],
    });
    expect(regras).toEqual({ margem_min_pct: 25, lucro_min: 10000 });
  });

  it("aceita lista direta e acusa erro com o nome do item", () => {
    expect(lerImportacao('[{"nome":"Geladeira"}]').itens[0].situacao).toBe("comprado");
    expect(() => lerImportacao('[{"nome":"X","compra_valor":"abc"}]')).toThrow(/Item 1 \(X\)/);
    expect(() => lerImportacao("{")).toThrow(/JSON válido/);
  });

  it("exportar e importar de volta dá o mesmo", () => {
    const item = {
      nome: "Moto", categoria: "Moto", tipo: "capital" as const, situacao: "comprado" as const,
      compra_valor: 0, compra_data: "2026-10-20", compra_local: null, preco_alvo: 1500000,
      venda_valor: null, venda_data: null, nota: "Documento; atrasado",
      gastos: [{ descricao: "Transferência", valor: 25050, data: "2026-10-20" }],
    };
    const json = exportarJSON([item], REGRAS_PADRAO, "2026-10-20");
    const volta = lerImportacao(json);
    expect(volta.itens[0]).toEqual(item);
    expect(volta.regras).toEqual(REGRAS_PADRAO);
    const csv = exportarCSV([item], "2026-10-20");
    expect(csv).toContain('"Documento; atrasado"');
    expect(csv).toContain("250,50");
  });
});
