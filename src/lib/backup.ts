// Formato de backup/importação. No arquivo, dinheiro vai em REAIS (ex.: 1234.5);
// no banco, em centavos. Datas em AAAA-MM-DD.

import { custoItem, diasParado, lucroItem, REGRAS_PADRAO, type Regras } from "./calculo";
import { lerReais } from "./formato";

export const FORMATO = "revenda-v1";

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
};

const paraReais = (c: number | null) => (c == null ? null : c / 100);

export function exportarJSON(itens: ItemBackup[], regras: Regras, geradoEm: string): string {
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
  }));
  const r: Record<string, number> = {};
  for (const [k, v] of Object.entries(regras)) r[k] = k.endsWith("_pct") ? v : v / 100;
  return JSON.stringify({ formato: FORMATO, gerado_em: geradoEm, regras: r, itens: lista }, null, 2);
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
    "dias_parado", "nota", "gastos_detalhe",
  ];
  const linhas = itens.map((i) => {
    return [
      i.nome, i.categoria, i.tipo, i.situacao, decimal(i.compra_valor), i.compra_data, i.compra_local,
      decimal(i.gastos.reduce((s, g) => s + g.valor, 0)), decimal(custoItem(i)),
      decimal(i.preco_alvo), decimal(i.venda_valor), i.venda_data, decimal(lucroItem(i)),
      diasParado(i, hojeIso), i.nota,
      i.gastos.map((g) => `${g.data} ${g.descricao} ${decimal(g.valor)}`).join(" | "),
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
    return {
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
