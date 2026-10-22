import { describe, expect, it } from "vitest";
import { capitalProprio, extrato, movimentos, numerosMenu, type ItemCaixa } from "./caixa";
import { REGRAS_PADRAO as R, caixaLivre } from "./calculo";

const r$ = (v: number) => Math.round(v * 100);

let n = 0;
function item(p: Partial<ItemCaixa>): ItemCaixa {
  n++;
  return {
    id: `i${n}`,
    nome: `Item ${n}`,
    tipo: "revenda",
    situacao: "comprado",
    compra_valor: r$(100),
    compra_data: "2026-10-01",
    venda_valor: null,
    venda_data: null,
    preco_alvo: null,
    gastos: [],
    ...p,
  };
}

const bicicleta = item({
  id: "bike",
  nome: "Bicicleta Caloi",
  compra_valor: r$(250),
  compra_data: "2026-09-10",
  situacao: "vendido",
  venda_valor: r$(580),
  venda_data: "2026-10-20",
  gastos: [
    { id: "g1", descricao: "Pneu traseiro", valor: r$(60), data: "2026-09-12" },
    { id: "g2", descricao: "Deslocamento", valor: r$(12), data: "2026-09-10" },
  ],
});
const sofa = item({ id: "sofa", nome: "Sofá", compra_valor: r$(300), compra_data: "2026-10-05" });
const moto = item({
  id: "moto",
  nome: "Honda CB300R",
  tipo: "capital",
  compra_valor: 0,
  compra_data: "2026-08-01",
  preco_alvo: r$(14000),
  gastos: [{ id: "g3", descricao: "Transferência", valor: r$(350), data: "2026-10-02" }],
});
const itens = [bicicleta, sofa, moto];
const regras = { ...R, saldo_inicial: r$(1000) };

describe("movimentos", () => {
  const lista = movimentos(itens, regras);

  it("monta compra, gastos e venda de cada item, mais o saldo inicial", () => {
    expect(lista.map((m) => m.descricao)).toEqual([
      "Venda · Bicicleta Caloi",
      "Compra · Sofá",
      "Gasto · Transferência — Honda CB300R",
      "Gasto · Pneu traseiro — Bicicleta Caloi",
      "Gasto · Deslocamento — Bicicleta Caloi",
      "Compra · Bicicleta Caloi",
      "Saldo inicial",
    ]);
  });

  it("entrada positiva, saída negativa, do mais novo ao mais antigo", () => {
    expect(lista[0]).toMatchObject({ tipo: "venda", data: "2026-10-20", valor: r$(580), itemId: "bike" });
    expect(lista[1]).toMatchObject({ tipo: "compra", valor: -r$(300) });
    expect(lista.at(-1)).toMatchObject({ tipo: "saldo_inicial", data: null, valor: r$(1000), itemId: null });
  });

  it("no mesmo dia a compra vem antes do gasto (ordem cronológica)", () => {
    const dia = lista.filter((m) => m.data === "2026-09-10");
    // Lista do mais novo ao mais antigo: o gasto do dia aparece em cima da compra.
    expect(dia.map((m) => m.tipo)).toEqual(["gasto", "compra"]);
  });

  it("a moto não tem compra, mas os gastos dela saem e a venda entra", () => {
    expect(lista.some((m) => m.tipo === "compra" && m.itemId === "moto")).toBe(false);
    expect(lista.find((m) => m.itemId === "moto")).toMatchObject({ capital: true, valor: -r$(350) });
  });

  it("saldo acumulado depois de cada movimento", () => {
    const crescente = [...lista].reverse();
    expect(crescente.map((m) => m.saldo / 100)).toEqual([1000, 750, 738, 678, 328, 28, 608]);
  });

  it("o saldo final bate com o caixa livre", () => {
    expect(lista[0].saldo).toBe(caixaLivre(itens, regras));

    const motoVendida = { ...moto, situacao: "vendido" as const, venda_valor: r$(13500), venda_data: "2026-10-21" };
    const semData = item({ compra_valor: r$(80), compra_data: null });
    const deGraca = item({ compra_valor: 0, gastos: [{ descricao: "Limpeza", valor: r$(15), data: "2026-10-03" }] });
    const outros = [bicicleta, sofa, motoVendida, semData, deGraca];
    for (const r of [regras, R, { ...R, saldo_inicial: -r$(50) }]) {
      const l = movimentos(outros, r);
      expect(l[0].saldo).toBe(caixaLivre(outros, r));
    }
  });

  it("sem itens e sem saldo inicial, nada a mostrar", () => {
    expect(movimentos([], R)).toEqual([]);
  });

  it("compra sem data entra antes de tudo", () => {
    const l = movimentos([item({ id: "x", compra_data: null }), sofa], R);
    expect(l.at(-1)).toMatchObject({ id: "compra-x", data: null });
  });
});

describe("extrato do período", () => {
  const todos = movimentos(itens, regras);

  it("sem período mostra tudo e termina no caixa de hoje", () => {
    const e = extrato(todos);
    expect(e.movimentos).toHaveLength(todos.length);
    expect(e.saldoInicio).toBe(0);
    expect(e.saldoFim).toBe(caixaLivre(itens, regras));
  });

  it("com início, o saldo de antes vira o saldo no início", () => {
    const e = extrato(todos, { de: "2026-10-01" });
    expect(e.movimentos.map((m) => m.descricao)).toEqual([
      "Venda · Bicicleta Caloi",
      "Compra · Sofá",
      "Gasto · Transferência — Honda CB300R",
    ]);
    // 1000 − 250 − 12 − 60 = 678
    expect(e.saldoInicio).toBe(r$(678));
    expect(e.entradas).toBe(r$(580));
    expect(e.saidas).toBe(r$(650));
    expect(e.saldoFim).toBe(caixaLivre(itens, regras));
  });

  it("com fim, para no último dia", () => {
    const e = extrato(todos, { de: "2026-09-01", ate: "2026-09-30" });
    expect(e.movimentos).toHaveLength(3);
    expect(e.saldoInicio).toBe(r$(1000));
    expect(e.saldoFim).toBe(r$(678));
  });

  it("período sem movimento mantém o saldo", () => {
    const e = extrato(todos, { de: "2026-11-01" });
    expect(e.movimentos).toEqual([]);
    expect(e.saldoInicio).toBe(e.saldoFim);
    expect(e.saldoFim).toBe(caixaLivre(itens, regras));
  });
});

describe("capital próprio", () => {
  it("a moto no pátio: preço anunciado e gastos", () => {
    expect(capitalProprio(itens)).toEqual([
      {
        id: "moto",
        nome: "Honda CB300R",
        situacao: "comprado",
        vendido: false,
        venda_data: null,
        valor: r$(14000),
        gastos: r$(350),
        liquido: r$(13650),
      },
    ]);
  });

  it("a moto vendida: o valor da venda", () => {
    const vendida = { ...moto, situacao: "vendido" as const, venda_valor: r$(13500), venda_data: "2026-10-21" };
    expect(capitalProprio([vendida])[0]).toMatchObject({ vendido: true, venda_data: "2026-10-21", valor: r$(13500), liquido: r$(13150) });
  });

  it("sem preço, sem valor", () => {
    expect(capitalProprio([{ ...moto, preco_alvo: null }])[0]).toMatchObject({ valor: null, liquido: null });
  });

  it("só itens de capital", () => {
    expect(capitalProprio([bicicleta, sofa])).toEqual([]);
  });
});

describe("números do menu", () => {
  const agora = new Date("2026-10-22T15:00:00-03:00");
  const hoje = "2026-10-22";
  const pub = (situacao: "publicado" | "pausado" | "rascunho" | "vendido", renovar_em: string | null) => ({ situacao, renovar_em });

  it("pátio, anúncios para renovar, interessados e meta", () => {
    const anunciado = {
      ...sofa,
      situacao: "anunciado" as const,
      anuncio: { publicacoes: [pub("publicado", "2026-10-20"), pub("publicado", "2026-10-29"), pub("pausado", "2026-10-01")] },
    };
    const vendidoComAnuncio = { ...bicicleta, anuncio: { publicacoes: [pub("publicado", "2026-10-01")] } };
    const contatos = [
      { situacao: "novo" as const, aguardando_desde: "2026-10-22T14:30:00-03:00" },
      { situacao: "negociando" as const, aguardando_desde: "2026-10-22T11:00:00-03:00" },
      { situacao: "perdido" as const, aguardando_desde: "2026-10-20T11:00:00-03:00" },
      { situacao: "agendado" as const, aguardando_desde: null },
    ];
    const m = numerosMenu([anunciado, vendidoComAnuncio, moto], { meta_lucro_mes: r$(2000) }, contatos, hoje, agora);
    expect(m.patio).toBe(2);
    expect(m.renovar).toBe(1);
    expect(m.esperando).toBe(2);
    expect(m.esperandoDemais).toBe(1);
    // Bicicleta: 580 − 250 − 72 = 258 de lucro em outubro
    expect(m.meta).toMatchObject({ lucro: r$(258), meta: r$(2000), batida: false });
    expect(m.meta.fracao).toBeCloseTo(0.129);
    expect(m.mes).toBe("outubro");
  });

  it("lucro de outro mês não conta na meta", () => {
    const m = numerosMenu([{ ...bicicleta, venda_data: "2026-09-30" }], { meta_lucro_mes: r$(2000) }, [], hoje, agora);
    expect(m.meta.lucro).toBe(0);
    expect(m.patio).toBe(0);
  });
});
