// Vendas (Fase 1B): canal, pagamento e comprador de cada venda.
// Valor e data continuam no item (venda_valor, venda_data), então caixa, lucro
// e giro saem das mesmas fórmulas de calculo.ts. A moto (capital) aparece na
// lista, mas entra no caixa e não conta em faturamento, lucro, ticket nem margem.

import { custoItem, diasEntre, lucroItem, type ItemCalc } from "./calculo";
import { paraBusca } from "./formato";

export const CANAIS = [
  { id: "marketplace", rotulo: "Marketplace" },
  { id: "olx", rotulo: "OLX" },
  { id: "grupos", rotulo: "Grupos" },
  { id: "whatsapp", rotulo: "WhatsApp" },
  { id: "indicacao", rotulo: "Indicação" },
  { id: "outro", rotulo: "Outro" },
] as const;
export type Canal = (typeof CANAIS)[number]["id"];

export const PAGAMENTOS = [
  { id: "pix", rotulo: "Pix" },
  { id: "dinheiro", rotulo: "Dinheiro" },
  { id: "cartao", rotulo: "Cartão" },
  { id: "transferencia", rotulo: "Transferência" },
  { id: "troca", rotulo: "Troca" },
  { id: "outro", rotulo: "Outro" },
] as const;
export type Pagamento = (typeof PAGAMENTOS)[number]["id"];

export const ENTREGAS_VENDA = [
  { id: "retirada", rotulo: "Retirou" },
  { id: "entreguei", rotulo: "Entreguei" },
] as const;
export type EntregaVenda = (typeof ENTREGAS_VENDA)[number]["id"];

export const NAO_INFORMADO = "Não informado";

export type Venda = {
  item_id: string;
  canal: Canal | null;
  pagamento: Pagamento | null;
  comprador_nome: string | null;
  comprador_contato: string | null;
  cidade: string | null;
  entrega: EntregaVenda | null;
  gasto_entrega_id: string | null;
  obs: string | null;
  criado_em: string;
};

export const ehCanal = (v: unknown): v is Canal => CANAIS.some((c) => c.id === v);
export const ehPagamento = (v: unknown): v is Pagamento => PAGAMENTOS.some((p) => p.id === v);
export const ehEntregaVenda = (v: unknown): v is EntregaVenda => ENTREGAS_VENDA.some((e) => e.id === v);

export const rotuloCanal = (c: Canal | null | undefined) =>
  CANAIS.find((x) => x.id === c)?.rotulo ?? NAO_INFORMADO;
export const rotuloPagamento = (p: Pagamento | null | undefined) =>
  PAGAMENTOS.find((x) => x.id === p)?.rotulo ?? NAO_INFORMADO;

// ---------- Lista de vendas ----------

export type ItemVenda = ItemCalc & {
  id: string;
  nome: string;
  categoria?: string | null;
  preco_alvo: number | null;
  venda: Pick<Venda, "canal" | "pagamento" | "comprador_nome" | "comprador_contato" | "cidade"> | null;
};

export type LinhaVenda = {
  id: string;
  nome: string;
  categoria: string | null;
  data: string; // AAAA-MM-DD
  capital: boolean;
  canal: Canal | null;
  pagamento: Pagamento | null;
  comprador: string | null;
  contato: string | null;
  cidade: string | null;
  custo: number;
  valor: number;
  /** null na moto (entra no caixa). */
  lucro: number | null;
  /** Lucro ÷ custo, fração. null sem custo ou na moto. */
  margem: number | null;
  precoAnunciado: number | null;
  /** Preço anunciado − vendido (negativo se vendeu acima). null sem preço anunciado. */
  desconto: number | null;
  dias: number | null;
};

/** Vendas da mais nova para a mais antiga. */
export function linhasVendas(itens: ItemVenda[]): LinhaVenda[] {
  return itens
    .filter((i) => i.situacao === "vendido" && i.venda_valor != null && i.venda_data)
    .map((i): LinhaVenda => {
      const custo = custoItem(i);
      const lucro = lucroItem(i);
      const capital = i.tipo === "capital";
      return {
        id: i.id,
        nome: i.nome,
        categoria: i.categoria ?? null,
        data: i.venda_data!,
        capital,
        canal: i.venda?.canal ?? null,
        pagamento: i.venda?.pagamento ?? null,
        comprador: i.venda?.comprador_nome ?? null,
        contato: i.venda?.comprador_contato ?? null,
        cidade: i.venda?.cidade ?? null,
        custo,
        valor: i.venda_valor!,
        lucro,
        margem: lucro != null && custo > 0 ? lucro / custo : null,
        precoAnunciado: i.preco_alvo,
        desconto: !capital && i.preco_alvo ? i.preco_alvo - i.venda_valor! : null,
        dias: i.compra_data ? Math.max(0, diasEntre(i.compra_data, i.venda_data!)) : null,
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data) || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** "nao_informado" filtra as vendas sem canal (ou sem pagamento). */
export type FiltroVendas = {
  de?: string | null;
  ate?: string | null;
  canal?: Canal | "nao_informado" | null;
  pagamento?: Pagamento | "nao_informado" | null;
  busca?: string | null;
};

export function filtrarVendas(linhas: LinhaVenda[], f: FiltroVendas): LinhaVenda[] {
  const termo = paraBusca(f.busca);
  return linhas.filter(
    (l) =>
      (!f.de || l.data >= f.de) &&
      (!f.ate || l.data <= f.ate) &&
      (!f.canal || (f.canal === "nao_informado" ? l.canal == null : l.canal === f.canal)) &&
      (!f.pagamento || (f.pagamento === "nao_informado" ? l.pagamento == null : l.pagamento === f.pagamento)) &&
      (!termo || paraBusca(`${l.nome} ${l.categoria ?? ""} ${l.comprador ?? ""}`).includes(termo)),
  );
}

export type TotaisVendas = {
  /** Só revenda. */
  faturamento: number;
  lucro: number;
  quantidade: number;
  ticketMedio: number | null;
  /** Lucro ÷ custo dos vendidos, fração. */
  margemMedia: number | null;
  /** Σ desconto ÷ Σ preço anunciado, nas vendas com preço anunciado. Fração. */
  descontoMedio: number | null;
  /** Vendas de capital próprio (a moto): entram no caixa, ficam fora das contas acima. */
  capitalQtd: number;
  capitalValor: number;
};

export function totaisVendas(linhas: LinhaVenda[]): TotaisVendas {
  const revenda = linhas.filter((l) => !l.capital);
  const capital = linhas.filter((l) => l.capital);
  const faturamento = revenda.reduce((s, l) => s + l.valor, 0);
  const lucro = revenda.reduce((s, l) => s + (l.lucro ?? 0), 0);
  const custo = revenda.reduce((s, l) => s + l.custo, 0);
  const comPreco = revenda.filter((l) => l.precoAnunciado != null && l.precoAnunciado > 0);
  const anunciado = comPreco.reduce((s, l) => s + l.precoAnunciado!, 0);
  const desconto = comPreco.reduce((s, l) => s + (l.desconto ?? 0), 0);
  return {
    faturamento,
    lucro,
    quantidade: revenda.length,
    ticketMedio: revenda.length ? Math.round(faturamento / revenda.length) : null,
    margemMedia: custo > 0 ? lucro / custo : null,
    descontoMedio: anunciado > 0 ? desconto / anunciado : null,
    capitalQtd: capital.length,
    capitalValor: capital.reduce((s, l) => s + l.valor, 0),
  };
}

export type TotalCanal = {
  canal: Canal | null;
  rotulo: string;
  quantidade: number;
  valor: number;
  lucro: number;
  /** Média de dias da compra até a venda. */
  diasMedio: number | null;
};

/** "De onde vêm as vendas": só revenda, do canal que mais faturou ao que menos; "Não informado" por último. */
export function porCanal(linhas: LinhaVenda[]): TotalCanal[] {
  const grupos = new Map<Canal | null, LinhaVenda[]>();
  for (const l of linhas) {
    if (l.capital) continue;
    grupos.set(l.canal, [...(grupos.get(l.canal) ?? []), l]);
  }
  return [...grupos.entries()]
    .map(([canal, ls]): TotalCanal => {
      const dias = ls.map((l) => l.dias).filter((d): d is number => d != null);
      return {
        canal,
        rotulo: rotuloCanal(canal),
        quantidade: ls.length,
        valor: ls.reduce((s, l) => s + l.valor, 0),
        lucro: ls.reduce((s, l) => s + (l.lucro ?? 0), 0),
        diasMedio: dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : null,
      };
    })
    .sort((a, b) => (a.canal == null ? 1 : 0) - (b.canal == null ? 1 : 0) || b.valor - a.valor);
}

export type OrdemVendas = "data" | "nome" | "canal" | "pagamento" | "custo" | "valor" | "lucro" | "margem" | "dias";

/** Ordena sem mudar a lista original. Vazios (null) sempre no fim. */
export function ordenarVendas(linhas: LinhaVenda[], por: OrdemVendas, crescente: boolean): LinhaVenda[] {
  const chave = (l: LinhaVenda): string | number | null => {
    switch (por) {
      case "nome": return paraBusca(l.nome);
      case "canal": return l.canal ? rotuloCanal(l.canal) : null;
      case "pagamento": return l.pagamento ? rotuloPagamento(l.pagamento) : null;
      default: return l[por];
    }
  };
  return [...linhas].sort((a, b) => {
    const x = chave(a);
    const y = chave(b);
    if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1;
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR");
    return crescente ? c : -c;
  });
}

// ---------- Meta do mês e prévia da venda ----------

export type Meta = { meta: number; lucro: number; fracao: number | null; falta: number; batida: boolean };

/** Quanto do lucro do mês já foi feito. fracao pode passar de 1 (meta batida). */
export function metaDoMes(lucroMes: number, meta: number): Meta {
  return {
    meta,
    lucro: lucroMes,
    fracao: meta > 0 ? Math.max(0, lucroMes) / meta : null,
    falta: Math.max(0, meta - lucroMes),
    batida: meta > 0 && lucroMes >= meta,
  };
}

export type PreviaVenda = {
  capital: boolean;
  /** Custo do item somado ao custo da entrega (que vira gasto). */
  custoTotal: number;
  lucro: number | null;
  margem: number | null;
  desconto: number | null;
  descontoPct: number | null;
};

/** O que aparece ao vivo enquanto ele digita o valor da venda. */
export function previaVenda(
  item: { tipo: "revenda" | "capital"; custo: number; preco_alvo: number | null },
  valor: number | null,
  custoEntrega = 0,
): PreviaVenda {
  const capital = item.tipo === "capital";
  const custoTotal = item.custo + Math.max(0, custoEntrega);
  const lucro = capital || valor == null ? null : valor - custoTotal;
  const desconto = !capital && valor != null && item.preco_alvo ? item.preco_alvo - valor : null;
  return {
    capital,
    custoTotal,
    lucro,
    margem: lucro != null && custoTotal > 0 ? lucro / custoTotal : null,
    desconto,
    descontoPct: desconto != null && item.preco_alvo ? desconto / item.preco_alvo : null,
  };
}

// ---------- Exportar o filtro ----------

const celula = (v: unknown) => {
  if (v == null) return "";
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const decimal = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
const pct = (f: number | null) => (f == null ? "" : (f * 100).toFixed(1).replace(".", ","));

/** CSV com ponto e vírgula e vírgula decimal (abre direto no Excel em português). */
export function csvVendas(linhas: LinhaVenda[]): string {
  const cab = [
    "data", "item", "categoria", "tipo", "canal", "pagamento", "comprador", "contato", "cidade",
    "custo", "preco_anunciado", "vendeu", "desconto", "lucro", "margem_sobre_custo_pct", "dias",
  ];
  const corpo = linhas.map((l) =>
    [
      l.data, l.nome, l.categoria, l.capital ? "capital" : "revenda", rotuloCanal(l.canal), rotuloPagamento(l.pagamento),
      l.comprador, l.contato, l.cidade, decimal(l.custo), decimal(l.precoAnunciado), decimal(l.valor),
      decimal(l.desconto), decimal(l.lucro), pct(l.margem), l.dias,
    ].map(celula).join(";"),
  );
  return "﻿" + [cab.join(";"), ...corpo].join("\r\n");
}
