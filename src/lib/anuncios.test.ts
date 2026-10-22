import { describe, expect, it } from "vitest";
import { cortarTitulo, gerarAnuncio, historicoPreco, LIMITE_TITULO, precisaRenovar, renovarEm, situacaoAnuncio } from "./anuncios";

describe("gerador de texto", () => {
  it("título com o ponto forte quando cabe; descrição com estado, trato, entrega, troca e pagamento", () => {
    const { titulo, descricao } = gerarAnuncio({
      nome: "Bicicleta Caloi aro 29",
      estado: "bom",
      pontoForte: "câmbio Shimano",
      gastos: ["Deslocamento (12 km)", "Pneu traseiro", "Regulagem dos freios", "Pneu traseiro"],
      cidade: "Cambé",
      entrega: "ambos",
      aceitaTroca: false,
    });
    expect(titulo).toBe("Bicicleta Caloi aro 29 – câmbio Shimano");
    expect(descricao).toBe(
      [
        "Bicicleta Caloi aro 29",
        "Estado: usado, em bom estado.\nCâmbio Shimano.\nO que foi feito: pneu traseiro e regulagem dos freios.",
        "Retirada em Cambé ou entrego em Londrina e região.\nNão aceito troca.\nPix ou dinheiro.",
      ].join("\n\n"),
    );
  });

  it("sem dados extras fica só o essencial, sem linhas vazias", () => {
    const { titulo, descricao } = gerarAnuncio({ nome: "  Fogão   4 bocas ", aceitaTroca: true });
    expect(titulo).toBe("Fogão 4 bocas");
    expect(descricao).toBe("Fogão 4 bocas\n\nAceito troca.\nPix ou dinheiro.");
  });

  it("gastos que não são trato (documento, transferência, frete) ficam fora", () => {
    const { descricao } = gerarAnuncio({ nome: "Honda CB300R", gastos: ["Documento atrasado", "Transferência", "Kit relação"] });
    expect(descricao).toContain("O que foi feito: kit relação.");
    expect(descricao).not.toMatch(/documento|transfer/i);
  });

  it("só retirada sem cidade vira 'a combinar'; entrego fala da região", () => {
    expect(gerarAnuncio({ nome: "X", entrega: "retirada" }).descricao).toContain("Retirada a combinar.");
    expect(gerarAnuncio({ nome: "X", entrega: "entrego" }).descricao).toContain("Entrego em Londrina e região.");
  });

  it("título nunca passa do limite e não corta palavra no meio", () => {
    const longo = "Guarda-roupa casal 6 portas 3 gavetas com espelho madeira maciça cor imbuia muito conservado";
    const t = cortarTitulo(longo);
    expect(t.length).toBeLessThanOrEqual(LIMITE_TITULO);
    expect(longo.startsWith(t)).toBe(true);
    expect(longo[t.length]).toBe(" ");
    // ponto forte que não cabe fica só na descrição
    expect(gerarAnuncio({ nome: "Guarda-roupa casal 6 portas", pontoForte: "madeira maciça cor imbuia, montado e sem nenhum risco" }).titulo).toBe(
      "Guarda-roupa casal 6 portas",
    );
  });
});

describe("renovar", () => {
  it("Marketplace e grupos renovam em 7 dias; OLX e WhatsApp não", () => {
    expect(renovarEm("marketplace", "2026-10-22T13:00:00Z")).toBe("2026-10-29");
    expect(renovarEm("grupos", "2026-10-28")).toBe("2026-11-04");
    expect(renovarEm("olx", "2026-10-22")).toBeNull();
    expect(renovarEm("whatsapp", "2026-10-22")).toBeNull();
  });

  it("precisa renovar só se publicado e a data chegou", () => {
    expect(precisaRenovar({ situacao: "publicado", renovar_em: "2026-10-22" }, "2026-10-22")).toBe(true);
    expect(precisaRenovar({ situacao: "publicado", renovar_em: "2026-10-23" }, "2026-10-22")).toBe(false);
    expect(precisaRenovar({ situacao: "pausado", renovar_em: "2026-10-01" }, "2026-10-22")).toBe(false);
    expect(precisaRenovar({ situacao: "publicado", renovar_em: null }, "2026-10-22")).toBe(false);
  });
});

it("histórico de preço do mais novo ao mais antigo, com a diferença", () => {
  const h = historicoPreco([
    { id: "b", anuncio_id: "a", preco: 54000, data: "2026-10-15", criado_em: "2026-10-15T10:00:00Z" },
    { id: "a", anuncio_id: "a", preco: 60000, data: "2026-10-01", criado_em: "2026-10-01T10:00:00Z" },
  ]);
  expect(h.map((x) => [x.preco, x.diferenca])).toEqual([
    [54000, -6000],
    [60000, null],
  ]);
});

it("situação geral do anúncio: publicado ganha de pausado, que ganha de rascunho", () => {
  const p = (situacao: "rascunho" | "publicado" | "pausado" | "vendido") => ({ situacao }) as never;
  expect(situacaoAnuncio(null)).toBe("sem_anuncio");
  expect(situacaoAnuncio({ publicacoes: [] })).toBe("rascunho");
  expect(situacaoAnuncio({ publicacoes: [p("rascunho"), p("pausado")] })).toBe("pausado");
  expect(situacaoAnuncio({ publicacoes: [p("pausado"), p("publicado")] })).toBe("publicado");
});
