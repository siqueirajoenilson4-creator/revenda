import { describe, expect, it } from "vitest";
import {
  REGRAS_PADRAO as R,
  arredondarDez,
  caixaLivre,
  custoItem,
  diasParado,
  limitePorItem,
  lucroItem,
  lucroPorMes,
  recebeLiquido,
  resumo,
  simular,
  type ItemCalc,
} from "./calculo";
import { hoje, lerReais, paraCampo, reais } from "./formato";

const r$ = (v: number) => Math.round(v * 100);

describe("recebe", () => {
  it("desconta a pechincha", () => {
    expect(recebeLiquido(r$(1000), R)).toBe(r$(900));
  });
  it("desconta a taxa sobre o valor já pechinchado", () => {
    // 1000 − 100 − 900 × 5% = 855
    expect(recebeLiquido(r$(1000), { ...R, taxa_pct: 5 })).toBe(r$(855));
  });
});

describe("pague no máximo", () => {
  it("usa o menor entre margem e lucro mínimo e arredonda de 10 em 10", () => {
    // venda 1000 → recebe 900; trato 50; 40 km × 0,30 = 12; outros 0 → custos 62
    // margem: 900 / 1,3 − 62 = 630,31; lucro mín: 900 − 62 − 80 = 758 → 630,31 → 630
    const s = simular({ venda: r$(1000), trato: r$(50), km: 40, outros: 0 }, R);
    expect(s.recebe).toBe(r$(900));
    expect(s.deslocamento).toBe(r$(12));
    expect(s.custos).toBe(r$(62));
    expect(s.pagueNoMax).toBe(r$(630));
  });

  it("quando o lucro mínimo é o limite", () => {
    // venda 300 → recebe 270; margem: 207,69; lucro mín: 270 − 80 = 190 → 190
    const s = simular({ venda: r$(300), trato: 0, km: 0, outros: 0 }, R);
    expect(s.pagueNoMax).toBe(r$(190));
  });

  it("devolve null (Não compensa) quando dá zero ou negativo", () => {
    const s = simular({ venda: r$(100), trato: r$(20), km: 0, outros: 0 }, R);
    expect(s.pagueNoMax).toBeNull();
  });

  it("roteiro de teste da Fase 1: 359,38 vira R$ 350 (para baixo)", () => {
    // venda 600 → recebe 540; custos 50 + 20 km × 0,30 = 56
    // margem: 540 / 1,3 − 56 = 359,38; lucro mín: 540 − 56 − 80 = 404
    const s = simular({ venda: r$(600), trato: r$(50), km: 20, outros: 0, pedido: r$(300) }, R);
    expect(s.pagueNoMaxBruto).toBe(35938);
    expect(s.pagueNoMax).toBe(r$(350));
    expect(s.pedido!.lucroEsperado).toBe(r$(184));
    expect(s.pedido!.veredito).toBe("bom");
  });

  it("arredonda para baixo, nunca para cima", () => {
    expect(arredondarDez(r$(639.99))).toBe(r$(630));
    expect(arredondarDez(r$(640))).toBe(r$(640));
  });
});

describe("veredito com preço pedido", () => {
  const base = { venda: r$(1000), trato: r$(50), km: 40, outros: 0 };
  it("Bom negócio quando o lucro alcança o alvo", () => {
    // pedido 600: lucro 900 − 62 − 600 = 238; alvo max(662 × 30% = 198,6, 80) = 198,60
    const s = simular({ ...base, pedido: r$(600) }, R);
    expect(s.pedido!.lucroEsperado).toBe(r$(238));
    expect(s.pedido!.lucroAlvo).toBe(r$(198.6));
    expect(s.pedido!.veredito).toBe("bom");
  });
  it("Apertado quando dá lucro abaixo do alvo", () => {
    const s = simular({ ...base, pedido: r$(780) }, R);
    expect(s.pedido!.lucroEsperado).toBe(r$(58));
    expect(s.pedido!.veredito).toBe("apertado");
  });
  it("Prejuízo quando não sobra nada", () => {
    const s = simular({ ...base, pedido: r$(838) }, R);
    expect(s.pedido!.lucroEsperado).toBe(0);
    expect(s.pedido!.veredito).toBe("prejuizo");
  });
  it("sem preço pedido não há veredito", () => {
    expect(simular(base, R).pedido).toBeNull();
  });
});

describe("limite por item", () => {
  it("é o menor entre caixa sem reserva e o máximo por item", () => {
    // caixa 2000: 80% = 1600; 30% = 600
    expect(limitePorItem(r$(2000), R)).toBe(r$(600));
    expect(limitePorItem(r$(2000), { ...R, max_item_pct: 90 })).toBe(r$(1600));
  });
  it("caixa zerado devolve null", () => {
    expect(limitePorItem(0, R)).toBeNull();
    expect(limitePorItem(-500, R)).toBeNull();
  });
});

const item = (p: Partial<ItemCalc>): ItemCalc => ({
  tipo: "revenda",
  situacao: "comprado",
  compra_valor: 0,
  compra_data: "2026-10-01",
  venda_valor: null,
  venda_data: null,
  gastos: [],
  ...p,
});

describe("estoque e caixa", () => {
  const bike = item({
    compra_valor: r$(300),
    gastos: [{ valor: r$(12) }, { valor: r$(48) }],
    situacao: "vendido",
    venda_valor: r$(550),
    venda_data: "2026-10-11",
  });
  const geladeira = item({ compra_valor: r$(400), gastos: [{ valor: r$(30) }], compra_data: "2026-09-01" });
  const moto = item({
    tipo: "capital",
    compra_valor: r$(9999),
    gastos: [{ valor: r$(250) }],
    compra_data: "2026-08-01",
  });

  it("custo do item soma compra e gastos; capital não tem compra", () => {
    expect(custoItem(bike)).toBe(r$(360));
    expect(custoItem(moto)).toBe(r$(250));
  });

  it("lucro só existe para revenda vendida", () => {
    expect(lucroItem(bike)).toBe(r$(190));
    expect(lucroItem(geladeira)).toBeNull();
    expect(lucroItem({ ...moto, situacao: "vendido", venda_valor: r$(15000), venda_data: "2026-10-20" })).toBeNull();
  });

  it("caixa livre = saldo + vendas − compras de revenda − todos os gastos", () => {
    const regras = { ...R, saldo_inicial: r$(1000) };
    // 1000 + 550 − 300 − 400 − (60 + 30 + 250) = 510
    expect(caixaLivre([bike, geladeira, moto], regras)).toBe(r$(510));
  });

  it("venda da moto (capital) entra no caixa mas não no lucro, margem ou giro", () => {
    const motoVendida = { ...moto, situacao: "vendido" as const, venda_valor: r$(15000), venda_data: "2026-10-20" };
    const res = resumo([bike, geladeira, motoVendida], R);
    expect(res.caixaLivre).toBe(r$(0 + 550 + 15000 - 300 - 400 - 340));
    expect(res.lucroRealizado).toBe(r$(190));
    expect(res.vendasRevenda).toBe(r$(550));
    expect(res.margemMedia).toBeCloseTo(190 / 550);
    expect(res.giroMedio).toBe(10);
    expect(res.vendidos).toBe(1);
    expect(res.empatado).toBe(r$(430));
    expect(res.empatadoQtd).toBe(1);
  });

  it("filtro de período vale para lucro, mas não para caixa e empatado", () => {
    const res = resumo([bike, geladeira, moto], R, { de: "2026-10-12" });
    expect(res.lucroRealizado).toBe(0);
    expect(res.margemMedia).toBeNull();
    expect(res.giroMedio).toBeNull();
    expect(res.caixaLivre).toBe(caixaLivre([bike, geladeira, moto], R));
    expect(res.empatado).toBe(r$(680));
  });

  it("dias parado conta até hoje, ou até a venda", () => {
    expect(diasParado(geladeira, "2026-10-20")).toBe(49);
    expect(diasParado(bike, "2026-10-20")).toBe(10);
  });

  it("lucro por mês", () => {
    expect([...lucroPorMes([bike, geladeira, moto])]).toEqual([["2026-10", r$(190)]]);
  });
});

describe("formato", () => {
  it("lê valores digitados em reais", () => {
    expect(lerReais("1.234,56")).toBe(123456);
    expect(lerReais("1234,5")).toBe(123450);
    expect(lerReais("1234.56")).toBe(123456);
    expect(lerReais("1.500")).toBe(150000);
    expect(lerReais("R$ 80")).toBe(8000);
    expect(lerReais("")).toBeNull();
    expect(lerReais("abc")).toBeNull();
  });
  it("formata em reais", () => {
    expect(reais(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(paraCampo(123450)).toBe("1234,50");
    expect(paraCampo(8000)).toBe("80");
  });
  it("hoje usa o fuso de São Paulo", () => {
    // 02:00 UTC de 21/10 ainda é 20/10 em São Paulo
    expect(hoje(new Date("2026-10-21T02:00:00Z"))).toBe("2026-10-20");
  });
});
