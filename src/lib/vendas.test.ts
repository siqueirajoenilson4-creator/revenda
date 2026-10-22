import { describe, expect, it } from "vitest";
import {
  csvVendas,
  filtrarVendas,
  linhasVendas,
  metaDoMes,
  ordenarVendas,
  porCanal,
  previaVenda,
  totaisVendas,
  type Canal,
  type ItemVenda,
} from "./vendas";

const r$ = (v: number) => Math.round(v * 100);

let n = 0;
function item(p: Partial<ItemVenda>): ItemVenda {
  n++;
  return {
    id: `i${n}`,
    nome: `Item ${n}`,
    categoria: null,
    tipo: "revenda",
    situacao: "vendido",
    compra_valor: r$(100),
    compra_data: "2026-10-01",
    preco_alvo: null,
    venda_valor: r$(200),
    venda_data: "2026-10-10",
    gastos: [],
    venda: null,
    ...p,
  };
}

const venda = (canal: Canal, extra: Partial<NonNullable<ItemVenda["venda"]>> = {}) => ({
  canal,
  pagamento: "pix" as const,
  comprador_nome: null,
  comprador_contato: null,
  cidade: null,
  ...extra,
});

describe("linhasVendas", () => {
  it("só vendidos, do mais novo ao mais antigo, com lucro, margem sobre o custo, desconto e dias", () => {
    const linhas = linhasVendas([
      item({ nome: "Bike", compra_valor: r$(300), gastos: [{ valor: r$(50) }], preco_alvo: r$(600), venda_valor: r$(550), venda_data: "2026-10-11" }),
      item({ nome: "Parado", situacao: "anunciado", venda_valor: null, venda_data: null }),
      item({ nome: "Antiga", venda_data: "2026-09-01", compra_data: "2026-08-20" }),
    ]);
    expect(linhas.map((l) => l.nome)).toEqual(["Bike", "Antiga"]);
    const bike = linhas[0];
    expect(bike.custo).toBe(r$(350));
    expect(bike.lucro).toBe(r$(200));
    expect(bike.margem).toBeCloseTo(200 / 350);
    expect(bike.desconto).toBe(r$(50));
    expect(bike.dias).toBe(10);
    expect(bike.canal).toBeNull(); // venda antiga: "Não informado"
  });

  it("a moto (capital) entra sem lucro, sem margem e sem desconto", () => {
    const [moto] = linhasVendas([
      item({ tipo: "capital", compra_valor: 0, gastos: [{ valor: r$(300) }], preco_alvo: r$(15000), venda_valor: r$(14000) }),
    ]);
    expect(moto.capital).toBe(true);
    expect(moto.lucro).toBeNull();
    expect(moto.margem).toBeNull();
    expect(moto.desconto).toBeNull();
  });
});

describe("totais", () => {
  const linhas = linhasVendas([
    item({ compra_valor: r$(100), preco_alvo: r$(250), venda_valor: r$(200), venda: venda("marketplace") }),
    item({ compra_valor: r$(300), preco_alvo: r$(500), venda_valor: r$(500), venda: venda("marketplace") }),
    item({ compra_valor: r$(200), venda_valor: r$(300), venda: venda("olx") }), // sem preço anunciado
    item({ compra_valor: r$(50), venda_valor: r$(100) }), // sem canal
    item({ tipo: "capital", compra_valor: 0, venda_valor: r$(14000), venda: venda("marketplace") }),
  ]);

  it("ticket médio, margem sobre o custo e desconto médio (ponderado pelo preço anunciado), sem a moto", () => {
    const t = totaisVendas(linhas);
    expect(t.quantidade).toBe(4);
    expect(t.faturamento).toBe(r$(1100));
    expect(t.lucro).toBe(r$(450));
    expect(t.ticketMedio).toBe(r$(275));
    expect(t.margemMedia).toBeCloseTo(450 / 650);
    // (250−200) + (500−500) = 50 sobre 750 anunciados
    expect(t.descontoMedio).toBeCloseTo(50 / 750);
    expect(t.capitalQtd).toBe(1);
    expect(t.capitalValor).toBe(r$(14000));
  });

  it("totais por canal: do que mais faturou ao que menos, 'Não informado' por último, sem a moto", () => {
    const c = porCanal(linhas);
    expect(c.map((x) => [x.rotulo, x.quantidade, x.valor])).toEqual([
      ["Marketplace", 2, r$(700)],
      ["OLX", 1, r$(300)],
      ["Não informado", 1, r$(100)],
    ]);
    expect(c[0].lucro).toBe(r$(300));
    expect(c[0].diasMedio).toBe(9);
  });

  it("sem vendas não divide por zero", () => {
    const t = totaisVendas([]);
    expect(t.ticketMedio).toBeNull();
    expect(t.margemMedia).toBeNull();
    expect(t.descontoMedio).toBeNull();
    expect(porCanal([])).toEqual([]);
  });
});

describe("filtrar e ordenar", () => {
  const linhas = linhasVendas([
    item({ nome: "Geladeira Brastemp", venda_data: "2026-10-05", venda: venda("olx", { comprador_nome: "João" }) }),
    item({ nome: "Sofá", venda_data: "2026-09-20", venda: venda("marketplace", { pagamento: "dinheiro" }) }),
    item({ nome: "Fogão", venda_data: "2026-10-15" }),
  ]);

  it("por período, canal, pagamento, 'não informado' e busca sem acento por item ou comprador", () => {
    expect(filtrarVendas(linhas, { de: "2026-10-01" }).map((l) => l.nome)).toEqual(["Fogão", "Geladeira Brastemp"]);
    expect(filtrarVendas(linhas, { canal: "olx" }).map((l) => l.nome)).toEqual(["Geladeira Brastemp"]);
    expect(filtrarVendas(linhas, { canal: "nao_informado" }).map((l) => l.nome)).toEqual(["Fogão"]);
    expect(filtrarVendas(linhas, { pagamento: "dinheiro" }).map((l) => l.nome)).toEqual(["Sofá"]);
    expect(filtrarVendas(linhas, { busca: "sofa" }).map((l) => l.nome)).toEqual(["Sofá"]);
    expect(filtrarVendas(linhas, { busca: "JOAO" }).map((l) => l.nome)).toEqual(["Geladeira Brastemp"]);
  });

  it("ordena por coluna nos dois sentidos, com vazios no fim", () => {
    expect(ordenarVendas(linhas, "nome", true).map((l) => l.nome)).toEqual(["Fogão", "Geladeira Brastemp", "Sofá"]);
    expect(ordenarVendas(linhas, "data", true).map((l) => l.nome)).toEqual(["Sofá", "Geladeira Brastemp", "Fogão"]);
    expect(ordenarVendas(linhas, "canal", true).map((l) => l.nome)).toEqual(["Sofá", "Geladeira Brastemp", "Fogão"]);
    expect(ordenarVendas(linhas, "canal", false).map((l) => l.nome)).toEqual(["Geladeira Brastemp", "Sofá", "Fogão"]);
  });
});

describe("meta do mês", () => {
  it("fração, quanto falta e meta batida", () => {
    expect(metaDoMes(r$(1500), r$(2000))).toEqual({ meta: r$(2000), lucro: r$(1500), fracao: 0.75, falta: r$(500), batida: false });
    const batida = metaDoMes(r$(2500), r$(2000));
    expect(batida.fracao).toBe(1.25);
    expect(batida.falta).toBe(0);
    expect(batida.batida).toBe(true);
  });

  it("prejuízo no mês não deixa a barra negativa; meta zero não divide", () => {
    expect(metaDoMes(-r$(100), r$(2000)).fracao).toBe(0);
    expect(metaDoMes(r$(100), 0).fracao).toBeNull();
  });
});

describe("prévia da venda", () => {
  it("lucro, margem sobre o custo (com a entrega) e desconto sobre o anúncio", () => {
    const p = previaVenda({ tipo: "revenda", custo: r$(350), preco_alvo: r$(600) }, r$(540), r$(20));
    expect(p.custoTotal).toBe(r$(370));
    expect(p.lucro).toBe(r$(170));
    expect(p.margem).toBeCloseTo(170 / 370);
    expect(p.desconto).toBe(r$(60));
    expect(p.descontoPct).toBeCloseTo(0.1);
  });

  it("a moto mostra 'entra no caixa' (sem lucro) e sem valor não calcula", () => {
    expect(previaVenda({ tipo: "capital", custo: r$(300), preco_alvo: r$(15000) }, r$(14000)).lucro).toBeNull();
    expect(previaVenda({ tipo: "revenda", custo: r$(300), preco_alvo: null }, null).lucro).toBeNull();
  });
});

it("CSV das vendas com ponto e vírgula, vírgula decimal e 'Não informado'", () => {
  const csv = csvVendas(linhasVendas([item({ nome: 'TV 50"', compra_valor: r$(1000.5), venda_valor: r$(1500) })]));
  const [cab, linha] = csv.replace("﻿", "").split("\r\n");
  expect(cab.split(";")[0]).toBe("data");
  expect(linha).toContain('"TV 50"""');
  expect(linha).toContain("Não informado");
  expect(linha).toContain("1000,50");
});
