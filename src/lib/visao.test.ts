import { describe, expect, it } from "vitest";
import { REGRAS_PADRAO as R } from "./calculo";
import { inicioSemana, somarDias } from "./periodo";
import {
  arredondarEixo,
  avisos,
  barrasMensais,
  barrasSemanais,
  comparar,
  dataCurta,
  dataPorExtenso,
  eixo,
  intervalos,
  margemSobreCusto,
  nomeAnterior,
  numeros,
  patio,
  reaisEixo,
  ticketMedio,
  ultimasVendas,
  type ItemVisao,
} from "./visao";

const r$ = (v: number) => Math.round(v * 100);
// Intl separa "R$" do número com espaço que não quebra.
const sp = <T extends { texto: string }>(x: T): T => ({ ...x, texto: x.texto.replace(/\s/g, " ") });
const HOJE = "2026-10-22"; // quinta-feira

let seq = 0;
function item(p: Partial<ItemVisao>): ItemVisao {
  return {
    id: `i${++seq}`,
    nome: "Item",
    tipo: "revenda",
    situacao: "comprado",
    compra_valor: 0,
    compra_data: null,
    preco_alvo: null,
    venda_valor: null,
    venda_data: null,
    gastos: [],
    ...p,
  };
}

const vendido = (compra: number, venda: number, venda_data: string, extra: Partial<ItemVisao> = {}) =>
  item({ situacao: "vendido", compra_valor: r$(compra), venda_valor: r$(venda), venda_data, compra_data: "2026-01-01", ...extra });

describe("datas", () => {
  it("semana começa na segunda", () => {
    expect(inicioSemana("2026-10-22")).toBe("2026-10-19");
    expect(inicioSemana("2026-10-19")).toBe("2026-10-19");
    expect(inicioSemana("2026-10-25")).toBe("2026-10-19"); // domingo
    expect(inicioSemana("2026-10-22", 2)).toBe("2026-10-05");
  });
  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("escreve a data por extenso e curta", () => {
    expect(dataPorExtenso(HOJE)).toBe("quinta, 22 de outubro");
    expect(dataCurta("2026-10-05", HOJE)).toBe("05/10");
    expect(dataCurta("2025-12-30", HOJE)).toBe("30/12/25");
  });
});

describe("intervalos", () => {
  it("mês: até hoje, contra o mesmo trecho do mês passado", () => {
    expect(intervalos("mes", HOJE)).toEqual({
      atual: { de: "2026-10-01", ate: HOJE },
      anterior: { de: "2026-09-01", ate: "2026-09-22" },
    });
  });
  it("mês: dia 31 contra o fim de um mês mais curto", () => {
    expect(intervalos("mes", "2026-03-31").anterior).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
    expect(intervalos("mes", "2026-01-15").anterior).toEqual({ de: "2025-12-01", ate: "2025-12-15" });
  });
  it("semana: de segunda até hoje, contra os mesmos dias da semana passada", () => {
    expect(intervalos("semana", HOJE)).toEqual({
      atual: { de: "2026-10-19", ate: HOJE },
      anterior: { de: "2026-10-12", ate: "2026-10-15" },
    });
  });
  it("ano: 29 de fevereiro vira 28 no ano anterior", () => {
    expect(intervalos("ano", "2028-02-29")).toEqual({
      atual: { de: "2028-01-01", ate: "2028-02-29" },
      anterior: { de: "2027-01-01", ate: "2027-02-28" },
    });
  });
  it("nomeia o período anterior", () => {
    expect(nomeAnterior("mes", HOJE)).toBe("setembro");
    expect(nomeAnterior("mes", "2026-01-10")).toBe("dezembro");
    expect(nomeAnterior("semana", HOJE)).toBe("a semana passada");
    expect(nomeAnterior("ano", HOJE)).toBe("2025");
  });
});

describe("números do período", () => {
  const itens = [
    vendido(300, 450, "2026-10-13"),
    vendido(180, 340, "2026-10-10"),
    vendido(100, 200, "2026-09-20"),
    // A moto entra no caixa, mas não no faturamento, lucro e margem.
    item({ tipo: "capital", situacao: "vendido", venda_valor: r$(9000), venda_data: "2026-10-05" }),
  ];

  it("ticket médio e margem sobre o custo", () => {
    expect(ticketMedio(r$(790), 2)).toBe(r$(395));
    expect(ticketMedio(0, 0)).toBeNull();
    // lucro 310 sobre custo 480
    expect(margemSobreCusto(r$(310), r$(790))).toBeCloseTo(310 / 480);
    expect(margemSobreCusto(0, 0)).toBeNull();
  });

  it("soma só a revenda vendida no intervalo", () => {
    const n = numeros(itens, R, intervalos("mes", HOJE).atual);
    expect(n).toEqual({
      faturamento: r$(790),
      lucro: r$(310),
      vendas: 2,
      ticketMedio: r$(395),
      margemCusto: 310 / 480,
    });
    expect(numeros(itens, R, intervalos("mes", HOJE).anterior).vendas).toBe(1);
  });

  it("compara em % ou, sem base positiva, em R$", () => {
    expect(comparar(r$(118), r$(100), "setembro")).toEqual({ texto: "+18% que setembro", tom: "bom" });
    expect(comparar(r$(50), r$(100), "a semana passada")).toEqual({ texto: "−50% que a semana passada", tom: "ruim" });
    expect(comparar(r$(100), r$(100), "a semana passada")).toEqual({ texto: "igual à semana passada" });
    expect(comparar(r$(100), r$(100), "2025")).toEqual({ texto: "igual a 2025" });
    expect(sp(comparar(r$(100), r$(-40), "setembro"))).toEqual({ texto: "R$ 140 a mais que setembro", tom: "bom" });
  });
});

describe("gráfico", () => {
  const itens = [
    vendido(300, 450, "2026-10-19"), // semana atual
    vendido(200, 150, "2026-10-25"), // domingo, ainda na semana atual (prejuízo)
    vendido(100, 200, "2026-10-18"), // domingo da semana anterior
    vendido(100, 160, "2025-11-03"), // novembro/25 é o primeiro dos 12 meses
    vendido(100, 160, "2025-10-31"), // fica de fora
    item({ tipo: "capital", situacao: "vendido", venda_valor: r$(9000), venda_data: "2026-10-20" }),
  ];

  it("agrupa por semana, da mais antiga para a atual, com lucro negativo", () => {
    const b = barrasSemanais(itens, HOJE, 8);
    expect(b).toHaveLength(8);
    expect(b[0].id).toBe("2026-08-31");
    expect(b[7]).toEqual({ id: "2026-10-19", rotulo: "19/10", titulo: "Semana de 19/10", faturamento: r$(600), lucro: r$(100) });
    expect(b[6]).toMatchObject({ id: "2026-10-12", faturamento: r$(200), lucro: r$(100) });
  });

  it("agrupa por mês nos últimos 12", () => {
    const b = barrasMensais(itens, HOJE);
    expect(b).toHaveLength(12);
    expect(b[0]).toMatchObject({ id: "2025-11", rotulo: "nov", titulo: "novembro de 2025", faturamento: r$(160) });
    expect(b[11]).toMatchObject({ id: "2026-10", faturamento: r$(800), lucro: r$(200) });
  });

  it("arredonda o eixo para números redondos", () => {
    expect(arredondarEixo(r$(1720))).toBe(r$(2000));
    expect(arredondarEixo(r$(2000))).toBe(r$(2000));
    expect(arredondarEixo(r$(2010))).toBe(r$(3000));
    expect(arredondarEixo(r$(6500))).toBe(r$(8000));
    expect(arredondarEixo(r$(420))).toBe(r$(500));
    expect(arredondarEixo(r$(3))).toBe(r$(10));
  });

  it("três marcas no lado maior; o negativo vai só até o valor", () => {
    expect(eixo([r$(1720), r$(560)])).toEqual({ topo: r$(2000), base: 0, marcas: [r$(2000), r$(1000), 0] });
    expect(eixo([r$(1720), r$(-50)])).toEqual({ topo: r$(2000), base: r$(-50), marcas: [r$(2000), r$(1000), 0] });
    expect(eixo([r$(10), r$(-700)])).toEqual({ topo: r$(10), base: r$(-800), marcas: [0, r$(-400), r$(-800)] });
  });

  it("escreve o eixo em R$ curto", () => {
    expect(reaisEixo(0)).toBe("R$ 0");
    expect(reaisEixo(r$(500))).toBe("R$ 500");
    expect(reaisEixo(r$(1500))).toBe("R$ 1,5 mil");
    expect(reaisEixo(r$(2000))).toBe("R$ 2 mil");
    expect(reaisEixo(r$(-400))).toBe("−R$ 400");
  });
});

describe("vendas e pátio", () => {
  it("últimas vendas: mais recentes primeiro, margem sobre o custo e capital sem lucro", () => {
    const moto = item({ tipo: "capital", situacao: "vendido", venda_valor: r$(9000), venda_data: "2026-10-21", gastos: [{ valor: r$(300) }] });
    const v = ultimasVendas([vendido(300, 450, "2026-10-13"), moto, vendido(100, 200, "2026-10-01")], 2);
    expect(v.map((x) => x.id)).toEqual([moto.id, expect.any(String)]);
    expect(v[0]).toMatchObject({ capital: true, lucro: null, margem: null, custo: r$(300), venda: r$(9000) });
    expect(v[1]).toMatchObject({ lucro: r$(150), margem: 0.5, dias: 285 });
  });

  it("pátio: só o que não vendeu, do mais parado para o mais novo, com lucro previsto", () => {
    const p = patio(
      [
        item({ nome: "novo", compra_data: "2026-10-20", compra_valor: r$(90), preco_alvo: r$(180), gastos: [{ valor: r$(10) }] }),
        item({ nome: "velho", compra_data: "2026-09-01", compra_valor: r$(280) }),
        item({ nome: "moto", tipo: "capital", compra_data: HOJE, preco_alvo: r$(12000) }),
        vendido(100, 200, "2026-10-01"),
      ],
      HOJE,
    );
    expect(p.map((x) => x.nome)).toEqual(["velho", "novo", "moto"]);
    expect(p[0]).toMatchObject({ dias: 51, custo: r$(280), lucroPrevisto: null });
    expect(p[1]).toMatchObject({ dias: 2, custo: r$(100), lucroPrevisto: r$(80) });
    expect(p[2]).toMatchObject({ capital: true, lucroPrevisto: null });
  });
});

describe("precisa de você", () => {
  const dia = (n: number) => somarDias(HOJE, -n);

  it("30 dias ainda não avisa; 31 manda baixar 10%; 45 manda vender a preço de custo", () => {
    const a = avisos(
      [
        item({ nome: "trinta", compra_data: dia(30), preco_alvo: r$(260) }),
        item({ nome: "trinta e um", compra_data: dia(31), preco_alvo: r$(450) }),
        item({ nome: "quarenta e cinco", compra_data: dia(45), compra_valor: r$(280), gastos: [{ valor: r$(20) }] }),
      ],
      HOJE,
    ).map(sp);
    expect(a).toHaveLength(2);
    expect(a[0]).toMatchObject({ gravidade: "ruim", titulo: "Vender a preço de custo: quarenta e cinco", texto: "45 dias no pátio · custo R$ 300" });
    expect(a[1]).toMatchObject({ gravidade: "atencao", titulo: "Baixar 10%: trinta e um", texto: "31 dias no pátio · de R$ 450 para R$ 405" });
  });

  it("parado sem preço: anunciar", () => {
    const [a] = avisos([item({ nome: "mesa", compra_data: dia(40) })], HOJE);
    expect(a).toMatchObject({ gravidade: "atencao", titulo: "Anunciar: mesa" });
  });

  it("capital não entra nas regras de preço, mas pede os gastos da nota", () => {
    const moto = item({ nome: "Honda CB300R", tipo: "capital", compra_data: dia(60), nota: " Documento atrasado " });
    expect(avisos([moto], HOJE)).toEqual([
      { id: `${moto.id}-gastos`, itemId: moto.id, gravidade: "info", titulo: "Lançar gastos: Honda CB300R", texto: "Documento atrasado", dias: 60 },
    ]);
  });

  it("com gastos lançados, nota em branco ou já vendido, não pede gastos", () => {
    expect(
      avisos(
        [
          item({ nota: "Trocar pneu", gastos: [{ valor: r$(50) }], compra_data: HOJE }),
          item({ nota: "   ", compra_data: HOJE }),
          item({ nota: "Pendente", situacao: "vendido", venda_valor: r$(10), venda_data: HOJE, compra_data: dia(90) }),
        ],
        HOJE,
      ),
    ).toEqual([]);
  });

  it("ordena por gravidade e, dentro dela, pelo mais parado", () => {
    const a = avisos(
      [
        item({ nome: "nota", nota: "x", compra_data: dia(2) }),
        item({ nome: "35", compra_data: dia(35), preco_alvo: r$(100) }),
        item({ nome: "50", compra_data: dia(50) }),
        item({ nome: "40", compra_data: dia(40), preco_alvo: r$(100) }),
      ],
      HOJE,
    );
    expect(a.map((x) => x.titulo.split(": ")[1])).toEqual(["50", "40", "35", "nota"]);
  });
});
