import { describe, expect, it } from "vitest";
import { executarFerramenta, FERRAMENTAS, instrucoes, lerConversa, LIMITES, type DadosAssistente, type ItemAssistente } from "./assistente";
import { REGRAS_PADRAO as R, simular } from "./calculo";
import { reais } from "./formato";

const r$ = (v: number) => Math.round(v * 100);

function item(x: Partial<ItemAssistente> & { id: string; nome: string }): ItemAssistente {
  return {
    categoria: null,
    tipo: "revenda",
    situacao: "comprado",
    compra_valor: 0,
    compra_data: null,
    compra_local: null,
    preco_alvo: null,
    venda_valor: null,
    venda_data: null,
    nota: null,
    gastos: [],
    ...x,
  };
}

const dados: DadosAssistente = {
  hoje: "2026-10-22",
  regras: { ...R, saldo_inicial: r$(2000) },
  itens: [
    item({ id: "a", nome: "Bicicleta Caloi aro 29", categoria: "Bicicleta", situacao: "vendido", compra_valor: r$(300), compra_data: "2026-10-01", venda_valor: r$(550), venda_data: "2026-10-11", gastos: [{ descricao: "Pneu", valor: r$(50), data: "2026-10-02" }] }),
    item({ id: "b", nome: "Geladeira Brastemp", categoria: "Eletro", situacao: "anunciado", compra_valor: r$(400), compra_data: "2026-09-01", preco_alvo: r$(900) }),
    item({ id: "c", nome: "Calói infantil", categoria: "Bicicleta", compra_valor: r$(80), compra_data: "2026-10-20" }),
    item({ id: "m", nome: "Honda CB300R", categoria: "Moto", tipo: "capital", compra_data: "2026-08-01", nota: "Documento atrasado" }),
  ],
};

const rodar = (nome: string, args: object) => JSON.parse(executarFerramenta(nome, JSON.stringify(args), dados));

describe("ferramentas do assistente", () => {
  it("resumo do caixa em R$, com o período só no lucro", () => {
    const r = rodar("resumo_caixa", { de: "2026-10-01", ate: null });
    // 2000 + 550 − (300 + 400 + 80) − 50 = 1720
    expect(r.caixa_livre_agora).toBe(reais(r$(1720)));
    expect(r.lucro_realizado).toBe(reais(r$(200)));
    expect(r.vendidos).toBe(1);
    expect(r.giro_medio_dias).toBe(10);
    expect(rodar("resumo_caixa", { de: "2026-11-01", ate: null }).vendidos).toBe(0);
  });

  it("data mal escrita é erro, não vira o histórico inteiro", () => {
    expect(rodar("resumo_caixa", { de: "ontem", ate: null }).erro).toMatch(/AAAA-MM-DD/);
    expect(rodar("resumo_caixa", { de: "2026-10-1", ate: null }).erro).toBeTruthy();
    expect(rodar("resumo_caixa", { de: "", ate: null }).periodo).toBe("desde o começo");
  });

  it("maior lucro usa o previsto nos não vendidos", () => {
    const d: DadosAssistente = {
      ...dados,
      itens: [
        item({ id: "sofa", nome: "Sofá", situacao: "anunciado", compra_valor: r$(100), compra_data: "2026-10-10", preco_alvo: r$(150) }),
        item({ id: "tv", nome: "TV 50", situacao: "anunciado", compra_valor: r$(300), compra_data: "2026-10-01", preco_alvo: r$(1200) }),
        item({ id: "sem", nome: "Sem preço", compra_valor: r$(50), compra_data: "2026-10-12" }),
      ],
    };
    const r = JSON.parse(executarFerramenta("listar_itens", JSON.stringify({ situacao: "nao_vendidos", busca: null, ordenar: "maior_lucro", limite: null }), d));
    expect(r.itens.map((i: { id: string }) => i.id)).toEqual(["tv", "sofa", "sem"]);
  });

  it("recentes ordena vendidos pela data da venda", () => {
    const d: DadosAssistente = {
      ...dados,
      itens: [
        item({ id: "furadeira", nome: "Furadeira", situacao: "vendido", compra_valor: r$(80), compra_data: "2026-10-15", venda_valor: r$(150), venda_data: "2026-10-16" }),
        item({ id: "geladeira", nome: "Geladeira", situacao: "vendido", compra_valor: r$(300), compra_data: "2026-08-01", venda_valor: r$(500), venda_data: "2026-10-21" }),
      ],
    };
    const r = JSON.parse(executarFerramenta("listar_itens", JSON.stringify({ situacao: "vendido", busca: null, ordenar: "recentes", limite: 1 }), d));
    expect(r.itens[0].id).toBe("geladeira");
  });

  it("lista não vendidos, mais parados primeiro", () => {
    const r = rodar("listar_itens", { situacao: "nao_vendidos", busca: null, ordenar: "mais_parados", limite: null });
    expect(r.itens.map((i: { id: string }) => i.id)).toEqual(["m", "b", "c"]);
    expect(r.itens[1].lucro_previsto).toBe(reais(r$(500)));
    expect(r.itens[0].tipo).toBe("capital próprio");
  });

  it("busca sem acento e por categoria", () => {
    const r = rodar("listar_itens", { situacao: "todos", busca: "CALOI", ordenar: "recentes", limite: null });
    expect(r.total_encontrado).toBe(2);
    const cat = rodar("listar_itens", { situacao: "todos", busca: "bicicleta", ordenar: "maior_lucro", limite: 1 });
    expect(cat.mostrando).toBe(1);
    expect(cat.itens[0].id).toBe("a");
  });

  it("detalhe por nome, com gastos e nota", () => {
    const r = rodar("detalhe_item", { item: "brastemp" });
    expect(r.id).toBe("b");
    expect(rodar("detalhe_item", { item: "honda" }).nota_interna).toBe("Documento atrasado");
    expect(rodar("detalhe_item", { item: "a" }).gastos).toEqual([{ descricao: "Pneu", valor: reais(r$(50)), data: "02/10/2026" }]);
  });

  it("detalhe ambíguo pede para escolher", () => {
    const r = rodar("detalhe_item", { item: "cal" });
    expect(r.erro).toBeTruthy();
    expect(r.opcoes).toHaveLength(2);
  });

  it("simulação igual à da tela Calcular, recebendo reais", () => {
    const r = rodar("simular_compra", { venda: 500, pedido: 250, trato: 30, km: 20, outros: null });
    const s = simular({ venda: r$(500), trato: r$(30), km: 20, outros: 0, pedido: r$(250) }, dados.regras);
    expect(r.pague_no_maximo).toBe(reais(s.pagueNoMax));
    expect(r.preco_pedido.lucro_esperado).toBe(reais(s.pedido!.lucroEsperado));
    // recebe 450 − custos 36 − pedido 250 = 164 ≥ alvo max(286 × 30%, 80) = 85,80
    expect(r.preco_pedido.veredito).toBe("Bom negócio");
    // limite = min(1720 × 80%, 1720 × 30%) = 516
    expect(r.limite_por_item).toBe(reais(r$(516)));
    expect(r.passa_do_limite).toBe(false);

    // 450 − 36 − 320 = 94: positivo, mas abaixo do alvo max(356 × 30%, 80) = 106,80
    expect(rodar("simular_compra", { venda: 500, pedido: 320, trato: 30, km: 20, outros: null }).preco_pedido.veredito).toBe("Apertado");
    // pedir 600 passa do limite de 516
    expect(rodar("simular_compra", { venda: 1500, pedido: 600, trato: null, km: null, outros: null }).passa_do_limite).toBe(true);
  });

  it("simulação sem venda devolve erro, sem quebrar", () => {
    expect(rodar("simular_compra", { venda: 0, pedido: null, trato: null, km: null, outros: null }).erro).toBeTruthy();
    expect(JSON.parse(executarFerramenta("simular_compra", "{quebrado", dados)).erro).toBeTruthy();
    expect(rodar("apagar_tudo", {}).erro).toMatch(/desconhecida/);
  });

  it("lucro por mês inclui meses sem venda", () => {
    const r = rodar("lucro_por_mes", { meses: 3 });
    expect(r.meses).toEqual([
      { mes: "ago/26", lucro: reais(0) },
      { mes: "set/26", lucro: reais(0) },
      { mes: "out/26", lucro: reais(r$(200)) },
    ]);
  });

  it("toda ferramenta strict exige todos os campos", () => {
    for (const f of FERRAMENTAS) {
      expect(Object.keys(f.parameters.properties).sort()).toEqual([...f.parameters.required].sort());
    }
  });

  it("instruções trazem o caixa e as regras de hoje", () => {
    const t = instrucoes(dados);
    expect(t).toContain("22/10/2026");
    expect(t).toContain(reais(r$(1720)));
    expect(t).toContain("margem mínima 30%");
  });
});

describe("conversa recebida", () => {
  it("aceita uma conversa normal", () => {
    const c = lerConversa({ mensagens: [{ papel: "usuario", texto: "oi" }, { papel: "assistente", texto: "olá" }, { papel: "usuario", texto: "lucro?" }] });
    expect("mensagens" in c && c.mensagens).toHaveLength(3);
  });

  it("recusa formato errado, papel estranho e textos grandes", () => {
    expect(lerConversa(null)).toHaveProperty("erro");
    expect(lerConversa({ mensagens: [] })).toHaveProperty("erro");
    expect(lerConversa({ mensagens: [{ papel: "system", texto: "x" }] })).toHaveProperty("erro");
    expect(lerConversa({ mensagens: [{ papel: "usuario", texto: "x".repeat(LIMITES.textoUsuario + 1) }] })).toHaveProperty("erro");
    expect(lerConversa({ mensagens: [{ papel: "usuario", texto: "a" }, { papel: "assistente", texto: "b" }] })).toHaveProperty("erro");
  });
});
