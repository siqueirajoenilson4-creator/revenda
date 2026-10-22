// Assistente com IA: instruções, ferramentas e a execução delas.
// Tudo aqui é só leitura e conta: a IA nunca grava nada no banco.
// As ferramentas usam as mesmas fórmulas das telas (lib/calculo.ts) e devolvem
// os valores já em R$, para a IA não ter de converter centavos nem fazer conta.

import {
  custoItem,
  diasParado,
  limitePorItem,
  lucroItem,
  lucroPorMes,
  resumo,
  simular,
  type Regras,
  type Situacao,
  type Tipo,
} from "./calculo";
import { dataBR, mesCurto, pctTexto, reais } from "./formato";
import { inicioMes, mesesEntre } from "./periodo";

/** O que as ferramentas precisam saber (o mesmo formato de lib/dados.ts, sem fotos). */
export type ItemAssistente = {
  id: string;
  nome: string;
  categoria: string | null;
  tipo: Tipo;
  situacao: Situacao;
  compra_valor: number;
  compra_data: string | null;
  compra_local: string | null;
  preco_alvo: number | null;
  venda_valor: number | null;
  venda_data: string | null;
  nota: string | null;
  gastos: { descricao: string; valor: number; data: string }[];
  fotos?: unknown[];
};

export type DadosAssistente = { itens: ItemAssistente[]; regras: Regras; hoje: string };

export type Mensagem = { papel: "usuario" | "assistente"; texto: string };

/** Onde o navegador guarda a conversa (apagada ao sair e na tela de login). */
export const CHAVE_CONVERSA = "revenda-assistente";

/** O que o navegador recebe de /api/assistente, uma linha JSON por evento. */
export type EventoChat =
  | { tipo: "texto"; texto: string }
  | { tipo: "ferramenta"; nome: string }
  | { tipo: "erro"; texto: string }
  | { tipo: "fim" };

// ---------- Conversa que chega do navegador ----------

export const LIMITES = { mensagens: 30, textoUsuario: 4000, textoAssistente: 12000, total: 80000 };

/** Confere o corpo do POST. Devolve as mensagens ou um texto de erro. */
export function lerConversa(corpo: unknown): { mensagens: Mensagem[] } | { erro: string } {
  const lista = (corpo as { mensagens?: unknown } | null)?.mensagens;
  if (!Array.isArray(lista) || lista.length === 0) return { erro: "Conversa vazia." };
  if (lista.length > LIMITES.mensagens) return { erro: "Conversa longa demais. Comece uma nova." };

  const mensagens: Mensagem[] = [];
  let total = 0;
  for (const m of lista) {
    const papel = (m as Mensagem)?.papel;
    const texto = (m as Mensagem)?.texto;
    if ((papel !== "usuario" && papel !== "assistente") || typeof texto !== "string") {
      return { erro: "Mensagem inválida." };
    }
    const max = papel === "usuario" ? LIMITES.textoUsuario : LIMITES.textoAssistente;
    if (texto.length > max) return { erro: "Mensagem longa demais." };
    total += texto.length;
    if (texto.trim()) mensagens.push({ papel, texto });
  }
  if (total > LIMITES.total) return { erro: "Conversa longa demais. Comece uma nova." };
  if (mensagens.at(-1)?.papel !== "usuario") return { erro: "A última mensagem tem de ser sua." };
  return { mensagens };
}

// ---------- Instruções ----------

function regrasTexto(r: Regras): string {
  return [
    `margem mínima ${r.margem_min_pct}% sobre o custo`,
    `lucro mínimo ${reais(r.lucro_min)} por item`,
    `pechincha do comprador ${r.pechincha_pct}%`,
    `taxa do anúncio ${r.taxa_pct}%`,
    `deslocamento ${reais(r.custo_km)} por km`,
    `reserva intocável ${r.reserva_pct}% do caixa`,
    `máximo ${r.max_item_pct}% do caixa num item só`,
    `saldo inicial ${reais(r.saldo_inicial)}`,
  ].join("; ");
}

export function instrucoes({ itens, regras, hoje }: DadosAssistente): string {
  const agora = resumo(itens, regras);
  const limite = limitePorItem(agora.caixaLivre, regras);
  const conta = (s: Situacao) => itens.filter((i) => i.situacao === s).length;

  return `Você é o assistente da Revenda, a ferramenta do negócio de compra e venda de usados do Joenilson em Londrina e região (Cambé, Cornélio Procópio até Curiúva). Responda em português do Brasil, curto e direto, como um sócio experiente que conhece os números.

O que você faz:
1. Responde perguntas sobre os números do negócio: caixa, dinheiro empatado, lucro, margem, giro, itens parados, vendas por mês.
2. Ajuda a decidir compras: quanto pagar no máximo, se o preço pedido é bom negócio, se cabe no caixa.
3. Escreve anúncios para OLX e Facebook Marketplace a partir dos dados do item.

Regras obrigatórias:
- Nunca invente números nem faça contas de cabeça. Use as ferramentas: elas aplicam as fórmulas do sistema e já devolvem os valores em R$. Repita os valores exatamente como vieram.
- Para decidir uma compra, use simular_compra. Se a pessoa não disse por quanto vende, pergunte, ou sugira um valor com base em itens parecidos já vendidos (listar_itens com busca) e deixe claro que é estimativa. Diga o "pague no máximo", o veredito quando houver preço pedido, e avise se passa do limite do caixa. Lembre do tempo que itens parecidos ficaram parados, se houver.
- Você não acessa a internet nem preços da OLX ou do Marketplace. Quando falar de preço de mercado, diga que é estimativa e que vale conferir anúncios parecidos.
- Você não grava nada. Para registrar, oriente pelo botão: compra em Calcular → "Comprei, registrar no estoque" (ou Estoque → "+ Novo item"); no item, "Vendi", "+ Gasto", "Anunciar" ou "Editar"; regras na tela Regras.
- Item do tipo "capital próprio" (como a CB300R) não tem custo de compra e não conta no lucro, na margem nem no giro; os gastos saem do caixa e a venda entra no caixa.

Anúncios:
- Antes de escrever, use detalhe_item para ler o item (nome, categoria, nota, gastos do trato, local).
- Entregue nesta ordem: **Título** (até 60 caracteres, com o que é, marca/modelo e o ponto forte; problemas vão na descrição, nunca no título), **Preço** (o preço de anúncio do item; se não houver, sugira e diga que é sugestão), **Descrição** (5 a 10 linhas: estado, o que foi feito no trato, o que acompanha, retirada em [bairro/cidade] ou entrega na região de Londrina). O mesmo texto serve para OLX e Marketplace.
- Seja honesto: não invente marca, tamanho, ano, estado nem acessórios que não estão nos dados. O que faltar, deixe entre colchetes para a pessoa completar, como [ano] ou [estado da pintura].
- Nunca coloque no anúncio quanto foi pago, o custo nem o lucro. A nota interna é para o dono: use dela só o que interessa ao comprador. Problemas reais do item (ex.: documento atrasado) devem ser ditos com clareza, nunca escondidos.

Formato: texto simples. Pode usar listas com "- " e **negrito**. Não use tabelas nem títulos com #.

Situação agora (${dataBR(hoje)}):
- Caixa livre: ${reais(agora.caixaLivre)}. Limite para um item só: ${limite == null ? "caixa zerado, não comprar antes de vender algo" : reais(limite)}.
- Empatado no estoque: ${reais(agora.empatado)} em ${agora.empatadoQtd} item(ns). Comprados: ${conta("comprado")}; anunciados: ${conta("anunciado")}; vendidos: ${conta("vendido")}.
- Regras: ${regrasTexto(regras)}.`;
}

// ---------- Ferramentas ----------

const texto = { type: "string" } as const;
const textoOuNulo = { type: ["string", "null"] } as const;
const numeroOuNulo = { type: ["number", "null"] } as const;

/** Definições no formato de "function tools" da Responses API (modo strict). */
export const FERRAMENTAS = [
  {
    type: "function" as const,
    name: "resumo_caixa",
    description:
      "Caixa livre, dinheiro empatado, limite por item e, no período, lucro realizado, vendas, margem média, giro médio e quantidade vendida. Sem datas = desde o começo.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        de: { ...textoOuNulo, description: "Início do período, AAAA-MM-DD, ou null" },
        ate: { ...textoOuNulo, description: "Fim do período, AAAA-MM-DD, ou null" },
      },
      required: ["de", "ate"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "listar_itens",
    description:
      "Lista itens do estoque com custo, preço de anúncio, venda, lucro e dias parado. Use para perguntas sobre itens e para achar itens parecidos (busca por nome ou categoria).",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        situacao: {
          type: "string",
          enum: ["todos", "nao_vendidos", "comprado", "anunciado", "vendido"],
        },
        busca: { ...textoOuNulo, description: "Parte do nome ou da categoria, ou null" },
        ordenar: {
          type: "string",
          enum: ["recentes", "mais_parados", "maior_lucro", "maior_custo"],
          description:
            "recentes = vendidos pela data da venda e os demais pela data da compra, mais novo primeiro; maior_lucro = lucro realizado nos vendidos e previsto (preço de anúncio − custo) nos demais",
        },
        limite: { ...numeroOuNulo, description: "Quantos itens no máximo (padrão 30, máx. 100)" },
      },
      required: ["situacao", "busca", "ordenar", "limite"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "detalhe_item",
    description: "Tudo sobre um item: dados de compra, gastos do trato, nota, anúncio e venda. Aceita o id ou parte do nome.",
    strict: true,
    parameters: {
      type: "object",
      properties: { item: { ...texto, description: "id do item ou parte do nome" } },
      required: ["item"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "simular_compra",
    description:
      "Calculadora de compra do sistema: quanto pagar no máximo, veredito para o preço pedido (bom, apertado, prejuízo) e se cabe no limite do caixa. Valores em reais.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        venda: { type: "number", description: "Por quanto espera vender, em reais" },
        pedido: { ...numeroOuNulo, description: "Quanto o vendedor pede, em reais, ou null" },
        trato: { ...numeroOuNulo, description: "Gasto previsto com trato/peças, em reais, ou null" },
        km: { ...numeroOuNulo, description: "Km de ida e volta para buscar, ou null" },
        outros: { ...numeroOuNulo, description: "Outros gastos previstos, em reais, ou null" },
      },
      required: ["venda", "pedido", "trato", "km", "outros"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "lucro_por_mes",
    description: "Lucro realizado mês a mês (só revenda vendida), dos últimos meses até o atual.",
    strict: true,
    parameters: {
      type: "object",
      properties: { meses: { ...numeroOuNulo, description: "Quantos meses para trás (padrão 6, máx. 24)" } },
      required: ["meses"],
      additionalProperties: false,
    },
  },
];

export type NomeFerramenta = (typeof FERRAMENTAS)[number]["name"];

/** Nome amigável que o chat mostra enquanto a ferramenta roda. */
export const ROTULO_FERRAMENTA: Record<string, string> = {
  resumo_caixa: "Olhando o caixa",
  listar_itens: "Consultando o estoque",
  detalhe_item: "Lendo o item",
  simular_compra: "Fazendo a conta da compra",
  lucro_por_mes: "Somando o lucro por mês",
};

/** Sem acento e minúsculo, para a busca achar "Calói" com "caloi". */
function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const reaisParaCentavos = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? 0 : Math.round(v * 100);

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Preço de anúncio − custo, só para revenda ainda não vendida e com preço. */
function lucroPrevisto(i: ItemAssistente): number | null {
  return i.situacao !== "vendido" && i.tipo !== "capital" && i.preco_alvo != null ? i.preco_alvo - custoItem(i) : null;
}

function linhaItem(i: ItemAssistente, hoje: string) {
  const custo = custoItem(i);
  const lucro = lucroItem(i);
  const previsto = lucroPrevisto(i);
  const capital = i.tipo === "capital";
  return {
    id: i.id,
    nome: i.nome,
    categoria: i.categoria,
    tipo: capital ? "capital próprio" : "revenda",
    situacao: i.situacao,
    custo_total: reais(custo),
    preco_anuncio: reais(i.preco_alvo),
    vendido_por: i.situacao === "vendido" ? reais(i.venda_valor) : undefined,
    lucro: lucro != null ? reais(lucro) : undefined,
    lucro_previsto: previsto != null ? reais(previsto) : undefined,
    dias_parado: diasParado(i, hoje),
    comprado_em: i.compra_data ? dataBR(i.compra_data) : undefined,
    vendido_em: i.venda_data ? dataBR(i.venda_data) : undefined,
  };
}

function resumoCaixa(d: DadosAssistente, a: { de?: unknown; ate?: unknown }) {
  // Data mal escrita é erro: trocar por "desde o começo" daria o total como se fosse do período.
  const lerData = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const de = lerData(a.de);
  const ate = lerData(a.ate);
  if ((de && !DATA.test(de)) || (ate && !DATA.test(ate))) {
    return { erro: "Data inválida em de/ate. Use AAAA-MM-DD (ex.: 2026-10-01) ou null." };
  }
  const r = resumo(d.itens, d.regras, { de, ate });
  const limite = limitePorItem(r.caixaLivre, d.regras);
  return {
    periodo: de || ate ? `${de ? dataBR(de) : "começo"} até ${ate ? dataBR(ate) : "hoje"}` : "desde o começo",
    caixa_livre_agora: reais(r.caixaLivre),
    limite_por_item_agora: limite == null ? "caixa zerado: não comprar antes de vender" : reais(limite),
    empatado_agora: reais(r.empatado),
    itens_nao_vendidos_agora: r.empatadoQtd,
    lucro_realizado: reais(r.lucroRealizado),
    vendas_revenda: reais(r.vendasRevenda),
    margem_media: pctTexto(r.margemMedia),
    giro_medio_dias: r.giroMedio == null ? null : Math.round(r.giroMedio),
    vendidos: r.vendidos,
    observacao: "Caixa, limite e empatado são de agora; lucro, vendas, margem, giro e vendidos são do período.",
  };
}

function listarItens(
  d: DadosAssistente,
  a: { situacao?: unknown; busca?: unknown; ordenar?: unknown; limite?: unknown },
) {
  const situacao = typeof a.situacao === "string" ? a.situacao : "todos";
  const busca = typeof a.busca === "string" && a.busca.trim() ? normalizar(a.busca) : null;
  const limite = Math.min(100, Math.max(1, Math.round(Number(a.limite) || 30)));

  let lista = d.itens.filter((i) =>
    situacao === "todos" ? true : situacao === "nao_vendidos" ? i.situacao !== "vendido" : i.situacao === situacao,
  );
  if (busca) lista = lista.filter((i) => normalizar(`${i.nome} ${i.categoria ?? ""}`).includes(busca));

  const dias = (i: ItemAssistente) => diasParado(i, d.hoje) ?? -1;
  if (a.ordenar === "mais_parados") lista = [...lista].sort((x, y) => dias(y) - dias(x));
  else if (a.ordenar === "maior_lucro") {
    // Realizado nos vendidos, previsto nos demais (igual à tela Estoque); sem nenhum dos dois vai para o fim.
    const lucro = (i: ItemAssistente) => lucroItem(i) ?? lucroPrevisto(i) ?? Number.MIN_SAFE_INTEGER;
    lista = [...lista].sort((x, y) => lucro(y) - lucro(x));
  } else if (a.ordenar === "maior_custo") lista = [...lista].sort((x, y) => custoItem(y) - custoItem(x));
  else {
    // recentes: vendido pela data da venda, o resto pela data da compra.
    const quando = (i: ItemAssistente) => (i.situacao === "vendido" && i.venda_data) || i.compra_data || "";
    lista = [...lista].sort((x, y) => quando(y).localeCompare(quando(x)));
  }

  return {
    total_encontrado: lista.length,
    mostrando: Math.min(lista.length, limite),
    itens: lista.slice(0, limite).map((i) => linhaItem(i, d.hoje)),
  };
}

function detalheItem(d: DadosAssistente, a: { item?: unknown }) {
  const alvo = typeof a.item === "string" ? a.item.trim() : "";
  if (!alvo) return { erro: "Diga o id ou o nome do item." };
  let achados = d.itens.filter((i) => i.id === alvo);
  if (!achados.length) {
    const n = normalizar(alvo);
    achados = d.itens.filter((i) => normalizar(i.nome).includes(n));
  }
  if (!achados.length) return { erro: `Nenhum item com "${alvo}".` };
  if (achados.length > 1) {
    return {
      erro: "Mais de um item com esse nome. Pergunte qual é ou chame de novo com o id.",
      opcoes: achados.slice(0, 10).map((i) => ({ id: i.id, nome: i.nome, situacao: i.situacao })),
    };
  }
  const i = achados[0];
  return {
    ...linhaItem(i, d.hoje),
    compra: i.tipo === "capital" ? "capital próprio (sem custo de compra)" : reais(i.compra_valor),
    comprado_onde: i.compra_local,
    nota_interna: i.nota,
    gastos: i.gastos.map((g) => ({ descricao: g.descricao, valor: reais(g.valor), data: dataBR(g.data) })),
    fotos: i.fotos?.length ?? 0,
  };
}

function simularCompra(
  d: DadosAssistente,
  a: { venda?: unknown; pedido?: unknown; trato?: unknown; km?: unknown; outros?: unknown },
) {
  const venda = reaisParaCentavos(Number(a.venda));
  if (venda <= 0) return { erro: "Preciso do valor de venda esperado (maior que zero)." };
  const pedido = a.pedido == null ? null : reaisParaCentavos(Number(a.pedido));
  const s = simular(
    {
      venda,
      trato: reaisParaCentavos(Number(a.trato ?? 0)),
      km: Number.isFinite(Number(a.km)) ? Math.max(0, Number(a.km)) : 0,
      outros: reaisParaCentavos(Number(a.outros ?? 0)),
      pedido: pedido && pedido > 0 ? pedido : null,
    },
    d.regras,
  );
  const caixa = resumo(d.itens, d.regras).caixaLivre;
  const limite = limitePorItem(caixa, d.regras);
  const valorQueSai = s.pedido?.valor ?? s.pagueNoMax;
  const VEREDITO = { bom: "Bom negócio", apertado: "Apertado", prejuizo: "Prejuízo" };

  return {
    pague_no_maximo: s.pagueNoMax == null ? "Não compensa" : reais(s.pagueNoMax),
    voce_recebe_vendendo: reais(s.recebe),
    custos_alem_da_compra: reais(s.custos),
    preco_pedido: s.pedido
      ? {
          valor: reais(s.pedido.valor),
          veredito: VEREDITO[s.pedido.veredito],
          lucro_esperado: reais(s.pedido.lucroEsperado),
          lucro_alvo: reais(s.pedido.lucroAlvo),
        }
      : null,
    caixa_livre: reais(caixa),
    limite_por_item: limite == null ? "caixa zerado: não comprar antes de vender" : reais(limite),
    passa_do_limite: limite == null ? true : valorQueSai != null && valorQueSai > limite,
    conta: s.conta.map((l) => `${l.rotulo}: ${reais(l.valor)}${l.detalhe ? ` (${l.detalhe})` : ""}`),
  };
}

function lucroMensal(d: DadosAssistente, a: { meses?: unknown }) {
  const n = Math.min(24, Math.max(1, Math.round(Number(a.meses) || 6)));
  const porMes = lucroPorMes(d.itens);
  const meses = mesesEntre(inicioMes(d.hoje, n - 1).slice(0, 7), d.hoje.slice(0, 7));
  return { meses: meses.map((m) => ({ mes: mesCurto(m), lucro: reais(porMes.get(m) ?? 0) })) };
}

/** Roda a ferramenta pedida pela IA e devolve o resultado em JSON (texto). */
export function executarFerramenta(nome: string, argumentos: string, d: DadosAssistente): string {
  let a: Record<string, unknown>;
  try {
    a = JSON.parse(argumentos || "{}") ?? {};
  } catch {
    return JSON.stringify({ erro: "Argumentos inválidos." });
  }
  const saida =
    nome === "resumo_caixa" ? resumoCaixa(d, a)
    : nome === "listar_itens" ? listarItens(d, a)
    : nome === "detalhe_item" ? detalheItem(d, a)
    : nome === "simular_compra" ? simularCompra(d, a)
    : nome === "lucro_por_mes" ? lucroMensal(d, a)
    : { erro: `Ferramenta desconhecida: ${nome}` };
  return JSON.stringify(saida);
}
