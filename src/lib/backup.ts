// Formato de backup/importação. No arquivo, dinheiro vai em REAIS (ex.: 1234.5);
// no banco, em centavos. Datas em AAAA-MM-DD.

import { ehTipo, limparDetalhes, type Detalhes, type TipoProduto } from "./detalhes";
import { custoItem, diasParado, lucroItem, REGRAS_PADRAO, type Regras } from "./calculo";
import { lerReais } from "./formato";
import { ehCanal, ehEntregaVenda, ehPagamento, rotuloCanal, rotuloPagamento, type Venda } from "./vendas";
import {
  ehCanalAnuncio,
  ehEntrega,
  ehEstado,
  ehSituacaoPublicacao,
  type Anuncio,
  type Publicacao,
} from "./anuncios";
import type { Contato, Resposta } from "./interessados";

export const FORMATO = "revenda-v1";

export type VendaBackup = Pick<
  Venda,
  "canal" | "pagamento" | "comprador_nome" | "comprador_contato" | "cidade" | "entrega" | "obs"
>;

export type AnuncioBackup = Pick<
  Anuncio,
  "titulo" | "descricao" | "preco" | "categoria" | "cidade" | "estado_conservacao" | "aceita_troca" | "entrega"
> & {
  tipo?: TipoProduto | null;
  detalhes?: Detalhes;
  publicacoes: Pick<Publicacao, "canal" | "situacao" | "link" | "publicado_em" | "renovar_em">[];
  precos: { preco: number; data: string }[];
};

export type ItemBackup = {
  nome: string;
  categoria: string | null;
  tipo: "revenda" | "capital";
  situacao: "comprado" | "anunciado" | "vendido";
  compra_valor: number;
  compra_data: string | null;
  compra_local: string | null;
  preco_alvo: number | null;
  venda_valor: number | null;
  venda_data: string | null;
  nota: string | null;
  gastos: { descricao: string; valor: number; data: string }[];
  /** Só aparece no arquivo quando existe. */
  venda?: VendaBackup | null;
  anuncio?: AnuncioBackup | null;
};

/** Interessados e respostas prontas vão no backup (só exportação). */
export type ExtrasBackup = {
  contatos?: (Contato & { item: string | null })[];
  respostas?: Pick<Resposta, "titulo" | "texto">[];
};

const paraReais = (c: number | null) => (c == null ? null : c / 100);

function vendaArquivo(v: VendaBackup): VendaBackup {
  const { canal, pagamento, comprador_nome, comprador_contato, cidade, entrega, obs } = v;
  return { canal, pagamento, comprador_nome, comprador_contato, cidade, entrega, obs };
}

function anuncioArquivo(a: AnuncioBackup): AnuncioBackup {
  return {
    titulo: a.titulo,
    descricao: a.descricao,
    preco: paraReais(a.preco),
    categoria: a.categoria,
    cidade: a.cidade,
    estado_conservacao: a.estado_conservacao,
    aceita_troca: a.aceita_troca,
    entrega: a.entrega,
    ...(a.tipo ? { tipo: a.tipo, detalhes: a.detalhes ?? {} } : {}),
    publicacoes: a.publicacoes.map(({ canal, situacao, link, publicado_em, renovar_em }) => ({
      canal, situacao, link, publicado_em, renovar_em,
    })),
    precos: a.precos.map((p) => ({ preco: p.preco / 100, data: p.data })),
  };
}

export function exportarJSON(itens: ItemBackup[], regras: Regras, geradoEm: string, extras: ExtrasBackup = {}): string {
  const lista: ItemBackup[] = itens.map((i) => ({
    nome: i.nome,
    categoria: i.categoria,
    tipo: i.tipo,
    situacao: i.situacao,
    compra_valor: i.compra_valor / 100,
    compra_data: i.compra_data,
    compra_local: i.compra_local,
    preco_alvo: paraReais(i.preco_alvo),
    venda_valor: paraReais(i.venda_valor),
    venda_data: i.venda_data,
    nota: i.nota,
    gastos: i.gastos.map((g) => ({ descricao: g.descricao, valor: g.valor / 100, data: g.data })),
    ...(i.venda ? { venda: vendaArquivo(i.venda) } : {}),
    ...(i.anuncio ? { anuncio: anuncioArquivo(i.anuncio) } : {}),
  }));
  const r: Record<string, number> = {};
  for (const [k, v] of Object.entries(regras)) r[k] = k.endsWith("_pct") ? v : v / 100;
  const interessados = extras.contatos?.map((c) => ({
    item: c.item,
    canal: c.canal,
    nome: c.nome,
    telefone: c.telefone,
    oferta: paraReais(c.oferta),
    situacao: c.situacao,
    proximo_passo: c.proximo_passo,
    retorno_em: c.retorno_em,
    aguardando_desde: c.aguardando_desde,
    criado_em: c.criado_em,
    mensagens: c.mensagens.map(({ direcao, texto, enviada_em }) => ({ direcao, texto, enviada_em })),
  }));
  return JSON.stringify(
    {
      formato: FORMATO,
      gerado_em: geradoEm,
      regras: r,
      itens: lista,
      ...(interessados ? { interessados } : {}),
      ...(extras.respostas ? { respostas: extras.respostas.map(({ titulo, texto }) => ({ titulo, texto })) } : {}),
    },
    null,
    2,
  );
}

const celula = (v: unknown) => {
  if (v == null) return "";
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const decimal = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

/** CSV com ponto e vírgula e vírgula decimal (abre direto no Excel em português). */
export function exportarCSV(itens: ItemBackup[], hojeIso: string): string {
  const cab = [
    "nome", "categoria", "tipo", "situacao", "compra_valor", "compra_data", "compra_local",
    "gastos_total", "custo_total", "preco_anuncio", "venda_valor", "venda_data", "lucro",
    "dias_parado", "nota", "gastos_detalhe", "canal_venda", "pagamento", "comprador",
  ];
  const linhas = itens.map((i) => {
    const vendido = i.situacao === "vendido";
    return [
      i.nome, i.categoria, i.tipo, i.situacao, decimal(i.compra_valor), i.compra_data, i.compra_local,
      decimal(i.gastos.reduce((s, g) => s + g.valor, 0)), decimal(custoItem(i)),
      decimal(i.preco_alvo), decimal(i.venda_valor), i.venda_data, decimal(lucroItem(i)),
      diasParado(i, hojeIso), i.nota,
      i.gastos.map((g) => `${g.data} ${g.descricao} ${decimal(g.valor)}`).join(" | "),
      vendido ? rotuloCanal(i.venda?.canal) : null,
      vendido ? rotuloPagamento(i.venda?.pagamento) : null,
      i.venda?.comprador_nome,
    ].map(celula).join(";");
  });
  return "﻿" + [cab.join(";"), ...linhas].join("\r\n");
}

// ---------- Importação ----------

const dinheiro = (v: unknown, campo: string, onde: string): number | null => {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v * 100);
  if (typeof v === "string") {
    const c = lerReais(v);
    if (c != null) return c;
  }
  throw new Error(`${onde}: "${campo}" não é um valor em reais (${JSON.stringify(v)}).`);
};
const dataIso = (v: unknown, campo: string, onde: string): string | null => {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  }
  throw new Error(`${onde}: "${campo}" precisa ser data AAAA-MM-DD ou DD/MM/AAAA.`);
};
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const opcao = <T,>(v: unknown, eh: (x: unknown) => x is T): T | null => (eh(v) ? v : null);

function lerVenda(v: unknown): VendaBackup | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return {
    canal: opcao(o.canal, ehCanal),
    pagamento: opcao(o.pagamento, ehPagamento),
    comprador_nome: str(o.comprador_nome),
    comprador_contato: str(o.comprador_contato),
    cidade: str(o.cidade),
    entrega: opcao(o.entrega, ehEntregaVenda),
    obs: str(o.obs),
  };
}

function lerAnuncio(v: unknown, onde: string): AnuncioBackup | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const lista = (x: unknown) => (Array.isArray(x) ? x : []).map((y) => (y ?? {}) as Record<string, unknown>);
  return {
    titulo: str(o.titulo) ?? "",
    descricao: typeof o.descricao === "string" ? o.descricao : "",
    preco: dinheiro(o.preco, "anuncio.preco", onde),
    categoria: str(o.categoria),
    cidade: str(o.cidade),
    estado_conservacao: opcao(o.estado_conservacao, ehEstado),
    aceita_troca: o.aceita_troca === true,
    entrega: opcao(o.entrega, ehEntrega),
    ...(ehTipo(o.tipo) ? { tipo: o.tipo, detalhes: limparDetalhes(o.tipo, o.detalhes) } : {}),
    publicacoes: lista(o.publicacoes).flatMap((p) => {
      if (!ehCanalAnuncio(p.canal)) return [];
      return [{
        canal: p.canal,
        situacao: opcao(p.situacao, ehSituacaoPublicacao) ?? "rascunho",
        link: str(p.link),
        publicado_em: str(p.publicado_em),
        renovar_em: dataIso(p.renovar_em, "renovar_em", onde),
      }];
    }),
    precos: lista(o.precos).flatMap((p) => {
      const preco = dinheiro(p.preco, "precos.preco", onde);
      const data = dataIso(p.data, "precos.data", onde);
      return preco != null && data ? [{ preco, data }] : [];
    }),
  };
}

export function lerImportacao(bruto: string): { itens: ItemBackup[]; regras: Partial<Regras> | null } {
  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }
  const raiz = json as { itens?: unknown; regras?: unknown };
  const lista = Array.isArray(json) ? json : raiz.itens;
  if (!Array.isArray(lista)) throw new Error('Esperava uma lista de itens (ou { "itens": [...] }).');

  const itens = lista.map((x, n): ItemBackup => {
    const o = (x ?? {}) as Record<string, unknown>;
    const nome = str(o.nome);
    const onde = `Item ${n + 1}${nome ? ` (${nome})` : ""}`;
    if (!nome) throw new Error(`${onde}: falta o "nome".`);
    const venda = dinheiro(o.venda_valor, "venda_valor", onde);
    const vendaData = dataIso(o.venda_data, "venda_data", onde);
    const sit = str(o.situacao);
    const situacao =
      sit === "vendido" || sit === "anunciado" || sit === "comprado"
        ? sit
        : venda != null
          ? "vendido"
          : "comprado";
    if (situacao === "vendido" && venda == null) throw new Error(`${onde}: vendido sem "venda_valor".`);
    const gastosBrutos = Array.isArray(o.gastos) ? o.gastos : [];
    const compraData = dataIso(o.compra_data, "compra_data", onde);
    const vendaDetalhes = situacao === "vendido" ? lerVenda(o.venda) : null;
    const anuncio = lerAnuncio(o.anuncio, onde);
    return {
      ...(vendaDetalhes ? { venda: vendaDetalhes } : {}),
      ...(anuncio ? { anuncio } : {}),
      nome,
      categoria: str(o.categoria),
      tipo: o.tipo === "capital" ? "capital" : "revenda",
      situacao,
      compra_valor: dinheiro(o.compra_valor, "compra_valor", onde) ?? 0,
      compra_data: compraData,
      compra_local: str(o.compra_local),
      preco_alvo: dinheiro(o.preco_alvo, "preco_alvo", onde),
      venda_valor: situacao === "vendido" ? venda : null,
      venda_data: situacao === "vendido" ? (vendaData ?? compraData) : null,
      nota: str(o.nota),
      gastos: gastosBrutos.map((g, k) => {
        const gg = (g ?? {}) as Record<string, unknown>;
        const ondeG = `${onde}, gasto ${k + 1}`;
        const valor = dinheiro(gg.valor, "valor", ondeG);
        if (valor == null) throw new Error(`${ondeG}: falta o "valor".`);
        return {
          descricao: str(gg.descricao) ?? "Gasto",
          valor,
          data: dataIso(gg.data, "data", ondeG) ?? compraData ?? new Date().toISOString().slice(0, 10),
        };
      }),
    };
  });

  let regras: Partial<Regras> | null = null;
  if (!Array.isArray(json) && raiz.regras && typeof raiz.regras === "object") {
    regras = {};
    for (const k of Object.keys(REGRAS_PADRAO) as (keyof Regras)[]) {
      const v = (raiz.regras as Record<string, unknown>)[k];
      if (typeof v !== "number") continue;
      regras[k] = k.endsWith("_pct") ? v : Math.round(v * 100);
    }
  }
  return { itens, regras };
}
