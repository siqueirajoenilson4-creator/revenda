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

  it("venda e anúncio vão e voltam; interessados e respostas saem no arquivo", () => {
    const item = {
      nome: "Sofá", categoria: null, tipo: "revenda" as const, situacao: "vendido" as const,
      compra_valor: 20000, compra_data: "2026-10-01", compra_local: null, preco_alvo: 45000,
      venda_valor: 42000, venda_data: "2026-10-12", nota: null, gastos: [],
      venda: {
        canal: "marketplace" as const, pagamento: "pix" as const, comprador_nome: "Ana",
        comprador_contato: null, cidade: "Cambé", entrega: "retirada" as const, obs: null,
      },
      anuncio: {
        titulo: "Sofá 3 lugares", descricao: "Retirada em Cambé.", preco: 45000, categoria: null, cidade: "Cambé",
        estado_conservacao: "bom" as const, aceita_troca: false, entrega: "retirada" as const,
        publicacoes: [{ canal: "marketplace" as const, situacao: "vendido" as const, link: "https://fb.com/x", publicado_em: "2026-10-02T12:00:00Z", renovar_em: null }],
        precos: [{ preco: 50000, data: "2026-10-01" }, { preco: 45000, data: "2026-10-08" }],
      },
    };
    const json = exportarJSON([item], REGRAS_PADRAO, "2026-10-20", {
      respostas: [{ titulo: "Aceito Pix", texto: "Aceito Pix." }],
    });
    expect(JSON.parse(json).respostas).toEqual([{ titulo: "Aceito Pix", texto: "Aceito Pix." }]);
    expect(JSON.parse(json).itens[0].anuncio.preco).toBe(450);
    expect(lerImportacao(json).itens[0]).toEqual(item);
    expect(exportarCSV([item], "2026-10-20")).toContain("Marketplace;Pix;Ana");
  });

  it("canal desconhecido na importação vira 'Não informado' em vez de erro", () => {
    const [i] = lerImportacao('[{"nome":"X","venda_valor":10,"venda":{"canal":"feira","pagamento":"pix"}}]').itens;
    expect(i.venda).toMatchObject({ canal: null, pagamento: "pix" });
  });
});
