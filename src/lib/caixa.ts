// Caixa e giro (especificação 4.5). Não existe tabela de movimentos: o extrato
// sai dos itens. Entra o que foi vendido (a moto também), sai a compra de
// revenda e todo gasto, cada um na sua data. O saldo final é o caixaLivre de calculo.ts.

import { custoItem, lucroPorMes, type ItemCalc, type Regras, type Situacao } from "./calculo";
import { precisaRenovar, type Publicacao } from "./anuncios";
import { esperandoDemais, minutosEsperando, type Contato } from "./interessados";
import { metaDoMes, type Meta } from "./vendas";

export type GastoCaixa = { id?: string; descricao: string; valor: number; data: string };

export type ItemCaixa = Omit<ItemCalc, "gastos"> & {
  id: string;
  nome: string;
  preco_alvo?: number | null;
  gastos: GastoCaixa[];
};

export type TipoMovimento = "saldo_inicial" | "compra" | "gasto" | "venda";

export const ROTULO_MOVIMENTO: Record<TipoMovimento, string> = {
  saldo_inicial: "Saldo inicial",
  compra: "Compra",
  gasto: "Gasto",
  venda: "Venda",
};

export type Movimento = {
  id: string;
  /** AAAA-MM-DD. null no saldo inicial e em compra ou venda sem data: contam antes de tudo. */
  data: string | null;
  tipo: TipoMovimento;
  /** "Compra · Bicicleta Caloi", "Gasto · Pneu traseiro — Bicicleta Caloi", "Venda · Sofá". */
  descricao: string;
  /** O que vem depois do tipo: o nome do item ou, no gasto, com o quê. */
  detalhe: string;
  itemId: string | null;
  itemNome: string | null;
  capital: boolean;
  /** Centavos: positivo entra, negativo sai. */
  valor: number;
  /** Saldo do caixa logo depois deste movimento. */
  saldo: number;
};

// No mesmo dia: compra, depois o trato, depois a venda.
const ORDEM: Record<TipoMovimento, number> = { saldo_inicial: 0, compra: 1, gasto: 2, venda: 3 };

/** Todos os movimentos do caixa, do mais novo ao mais antigo, com o saldo depois de cada um. */
export function movimentos(itens: ItemCaixa[], r: Pick<Regras, "saldo_inicial">): Movimento[] {
  const lista: Omit<Movimento, "saldo">[] = [];
  if (r.saldo_inicial !== 0) {
    lista.push({
      id: "saldo-inicial",
      data: null,
      tipo: "saldo_inicial",
      descricao: ROTULO_MOVIMENTO.saldo_inicial,
      detalhe: "definido em Regras",
      itemId: null,
      itemNome: null,
      capital: false,
      valor: r.saldo_inicial,
    });
  }

  for (const i of itens) {
    const doItem = { itemId: i.id, itemNome: i.nome, capital: i.tipo === "capital" };
    // A moto (capital) não tem compra: já era dele.
    if (i.tipo === "revenda" && i.compra_valor !== 0) {
      lista.push({
        ...doItem,
        id: `compra-${i.id}`,
        data: i.compra_data,
        tipo: "compra",
        descricao: `Compra · ${i.nome}`,
        detalhe: i.nome,
        valor: -i.compra_valor,
      });
    }
    i.gastos.forEach((g, k) => {
      if (g.valor === 0) return;
      const com = g.descricao.trim() || "sem descrição";
      lista.push({
        ...doItem,
        id: `gasto-${g.id ?? `${i.id}-${k}`}`,
        data: g.data,
        tipo: "gasto",
        descricao: `Gasto · ${com} — ${i.nome}`,
        detalhe: com,
        valor: -g.valor,
      });
    });
    if (i.situacao === "vendido" && i.venda_valor != null && i.venda_valor !== 0) {
      lista.push({
        ...doItem,
        id: `venda-${i.id}`,
        data: i.venda_data,
        tipo: "venda",
        descricao: `Venda · ${i.nome}`,
        detalhe: i.nome,
        valor: i.venda_valor,
      });
    }
  }

  lista.sort(
    (a, b) =>
      (a.data ?? "").localeCompare(b.data ?? "") ||
      ORDEM[a.tipo] - ORDEM[b.tipo] ||
      (a.itemNome ?? "").localeCompare(b.itemNome ?? "", "pt-BR") ||
      a.id.localeCompare(b.id),
  );
  let saldo = 0;
  return lista.map((m) => ({ ...m, saldo: (saldo += m.valor) })).reverse();
}

export type Extrato = {
  /** Só os do período, do mais novo ao mais antigo. */
  movimentos: Movimento[];
  /** Saldo antes do primeiro dia do período. */
  saldoInicio: number;
  /** Saldo no fim do período (sem fim: o caixa de hoje). */
  saldoFim: number;
  entradas: number;
  /** Soma das saídas, positiva. */
  saidas: number;
};

/** Recorta o extrato no período. O que não tem data conta como anterior a qualquer período. */
export function extrato(todos: Movimento[], p: { de?: string | null; ate?: string | null } = {}): Extrato {
  const antes = (m: Movimento) => !!p.de && (m.data == null || m.data < p.de);
  const depois = (m: Movimento) => !!p.ate && m.data != null && m.data > p.ate;
  const doPeriodo = todos.filter((m) => !antes(m) && !depois(m));
  const saldoInicio = todos.filter(antes).reduce((s, m) => s + m.valor, 0);
  const entradas = doPeriodo.reduce((s, m) => s + Math.max(0, m.valor), 0);
  const saidas = doPeriodo.reduce((s, m) => s + Math.max(0, -m.valor), 0);
  return { movimentos: doPeriodo, saldoInicio, saldoFim: saldoInicio + entradas - saidas, entradas, saidas };
}

// ---------- Capital próprio (a moto) ----------

export type Capital = {
  id: string;
  nome: string;
  situacao: Situacao;
  vendido: boolean;
  venda_data: string | null;
  /** Vendido: por quanto vendeu. Senão: o preço anunciado (null sem preço). */
  valor: number | null;
  /** Documento, transferência, conserto: já saíram do caixa. */
  gastos: number;
  /** Valor menos gastos: o que ele rendeu (ou vai render) de caixa. */
  liquido: number | null;
};

export function capitalProprio(itens: ItemCaixa[]): Capital[] {
  return itens
    .filter((i) => i.tipo === "capital")
    .map((i) => {
      const vendido = i.situacao === "vendido" && i.venda_valor != null;
      const valor = vendido ? i.venda_valor : (i.preco_alvo ?? null);
      const gastos = custoItem(i);
      return {
        id: i.id,
        nome: i.nome,
        situacao: i.situacao,
        vendido,
        venda_data: vendido ? i.venda_data : null,
        valor,
        gastos,
        liquido: valor == null ? null : valor - gastos,
      };
    });
}

// ---------- Números do menu ----------

export type NumerosMenu = {
  /** Itens no pátio (não vendidos). */
  patio: number;
  /** Publicações no Marketplace ou nos grupos que passaram do dia de renovar. */
  renovar: number;
  /** Interessados esperando resposta. */
  esperando: number;
  /** Desses, quantos esperam há mais de 2 h. */
  esperandoDemais: number;
  meta: Meta;
  /** Nome do mês ("outubro"). */
  mes: string;
};

type ItemMenu = ItemCalc & {
  anuncio?: { publicacoes: Pick<Publicacao, "situacao" | "renovar_em">[] } | null;
};

const NOME_MES = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });

export function numerosMenu(
  itens: ItemMenu[],
  r: Pick<Regras, "meta_lucro_mes">,
  contatos: Pick<Contato, "situacao" | "aguardando_desde">[],
  hoje: string,
  agora: Date,
): NumerosMenu {
  const noPatio = itens.filter((i) => i.situacao !== "vendido");
  const [y, m] = hoje.split("-").map(Number);
  return {
    patio: noPatio.length,
    renovar: noPatio.flatMap((i) => i.anuncio?.publicacoes ?? []).filter((p) => precisaRenovar(p, hoje)).length,
    esperando: contatos.filter((c) => minutosEsperando(c, agora) != null).length,
    esperandoDemais: contatos.filter((c) => esperandoDemais(c, agora)).length,
    meta: metaDoMes(lucroPorMes(itens).get(hoje.slice(0, 7)) ?? 0, r.meta_lucro_mes),
    mes: NOME_MES.format(Date.UTC(y, m - 1, 15)),
  };
}
