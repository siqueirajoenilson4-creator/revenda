import { describe, expect, it } from "vitest";
import {
  esperandoDemais,
  haQuanto,
  lerDataHora,
  linkWhatsApp,
  minutosEsperando,
  ordenarContatos,
  paraCampoDataHora,
  preencherResposta,
  quandoTexto,
  retornoVencido,
  type Contato,
} from "./interessados";

const AGORA = new Date("2026-10-22T18:00:00Z"); // 15:00 em São Paulo

function contato(p: Partial<Contato>): Contato {
  return {
    id: "c",
    item_id: null,
    canal: "marketplace",
    nome: "Ana",
    telefone: null,
    oferta: null,
    situacao: "novo",
    proximo_passo: null,
    retorno_em: null,
    aguardando_desde: null,
    criado_em: "2026-10-22T10:00:00Z",
    atualizado_em: "2026-10-22T10:00:00Z",
    mensagens: [],
    ...p,
  };
}

describe("esperando resposta", () => {
  it("conta os minutos e passa do limite em 2 horas", () => {
    const c = contato({ aguardando_desde: "2026-10-22T16:00:00Z" });
    expect(minutosEsperando(c, AGORA)).toBe(120);
    expect(esperandoDemais(c, AGORA)).toBe(true);
    expect(esperandoDemais(contato({ aguardando_desde: "2026-10-22T16:01:00Z" }), AGORA)).toBe(false);
  });

  it("quem já comprou ou foi perdido não conta", () => {
    expect(minutosEsperando(contato({ situacao: "perdido", aguardando_desde: "2026-10-20T10:00:00Z" }), AGORA)).toBeNull();
    expect(minutosEsperando(contato({}), AGORA)).toBeNull();
  });

  it("retorno vencido só para contato ativo", () => {
    expect(retornoVencido(contato({ retorno_em: "2026-10-22T17:59:00Z" }), AGORA)).toBe(true);
    expect(retornoVencido(contato({ retorno_em: "2026-10-22T18:30:00Z" }), AGORA)).toBe(false);
    expect(retornoVencido(contato({ situacao: "comprou", retorno_em: "2026-10-20T10:00:00Z" }), AGORA)).toBe(false);
  });

  it("ordem: quem espera há mais tempo, retornos vencidos, ativos recentes, encerrados", () => {
    const lista = [
      contato({ id: "encerrado", situacao: "comprou", atualizado_em: "2026-10-22T17:00:00Z" }),
      contato({ id: "ativo", atualizado_em: "2026-10-22T12:00:00Z" }),
      contato({ id: "espera-pouco", aguardando_desde: "2026-10-22T17:30:00Z" }),
      contato({ id: "retorno", retorno_em: "2026-10-22T12:00:00Z" }),
      contato({ id: "espera-muito", aguardando_desde: "2026-10-22T09:00:00Z" }),
    ];
    expect(ordenarContatos(lista, AGORA).map((c) => c.id)).toEqual(["espera-muito", "espera-pouco", "retorno", "ativo", "encerrado"]);
  });

  it("texto de há quanto tempo", () => {
    expect([0, 25, 60, 185, 60 * 24, 60 * 50].map(haQuanto)).toEqual(["agora", "há 25 min", "há 1 h", "há 3 h", "há 1 dia", "há 2 dias"]);
  });
});

describe("respostas prontas", () => {
  it("troca os marcadores", () => {
    expect(
      preencherResposta("Oi, {nome}! Está disponível sim. {item} por {preco}.", { nome: "Carlos", item: "Sofá 3 lugares", preco: "R$ 450" }),
    ).toBe("Oi, Carlos! Está disponível sim. Sofá 3 lugares por R$ 450.");
  });

  it("sem nome some a vírgula; sem cidade não sobra espaço", () => {
    expect(preencherResposta("Oi, {nome}! Está disponível.", {})).toBe("Oi! Está disponível.");
    expect(preencherResposta("A retirada é em {cidade}.", { cidade: null })).toBe("A retirada é em.");
  });
});

describe("WhatsApp", () => {
  it("monta o link com DDI 55 e o texto", () => {
    expect(linkWhatsApp("(43) 99999-1234")).toBe("https://wa.me/5543999991234");
    expect(linkWhatsApp("043 9999-1234", "Oi!")).toBe("https://wa.me/554399991234?text=Oi!");
    expect(linkWhatsApp("+55 43 99999-1234")).toBe("https://wa.me/5543999991234");
  });

  it("número curto ou vazio não vira link", () => {
    expect(linkWhatsApp("9999-1234")).toBeNull();
    expect(linkWhatsApp(null)).toBeNull();
  });
});

describe("data e hora de São Paulo", () => {
  it("campo datetime-local ida e volta", () => {
    expect(paraCampoDataHora("2026-10-22T18:00:00Z")).toBe("2026-10-22T15:00");
    expect(lerDataHora("2026-10-22T15:00")).toBe("2026-10-22T15:00:00-03:00");
    expect(new Date(lerDataHora("2026-10-22T15:00")!).toISOString()).toBe("2026-10-22T18:00:00.000Z");
    expect(lerDataHora("")).toBeNull();
    expect(paraCampoDataHora(null)).toBe("");
  });

  it("hoje, amanhã, ontem ou a data", () => {
    expect(quandoTexto("2026-10-22T20:30:00Z", AGORA)).toBe("hoje 17:30");
    expect(quandoTexto("2026-10-23T12:00:00Z", AGORA)).toBe("amanhã 09:00");
    expect(quandoTexto("2026-10-21T21:10:00Z", AGORA)).toBe("ontem 18:10");
    expect(quandoTexto("2026-10-25T13:00:00Z", AGORA)).toBe("25/10 10:00");
    // 01:00 UTC do dia 23 ainda é dia 22 em São Paulo
    expect(quandoTexto("2026-10-23T01:00:00Z", AGORA)).toBe("hoje 22:00");
  });
});
