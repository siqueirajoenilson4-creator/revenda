import type { Anuncio, Entrega, EstadoConservacao } from "@/lib/anuncios";
import { adivinharTipo, type Detalhes, type TipoProduto } from "@/lib/detalhes";
import { hoje as diaDe, lerReais, paraBusca, paraCampo } from "@/lib/formato";
import { dataCurta } from "@/lib/visao";

/** O que o editor precisa do item (pequeno e serializável). */
export type ItemAnuncio = {
  id: string;
  nome: string;
  categoria: string | null;
  preco_alvo: number | null;
  /** Descrições dos gastos, para o gerador contar o que foi feito. */
  gastos: string[];
};

export type FotoAnuncio = { id: string; assinada?: string };

export type CamposAnuncio = {
  titulo: string;
  descricao: string;
  preco: string;
  categoria: string;
  cidade: string;
  estado: EstadoConservacao | "";
  entrega: Entrega | "";
  aceitaTroca: boolean;
  tipo: TipoProduto | "";
  detalhes: Detalhes;
};

/** Valores do anúncio salvo; sem anúncio, começa com o preço e a categoria do item. */
export function camposDe(a: Anuncio | null, i: ItemAnuncio): CamposAnuncio {
  if (!a)
    return {
      titulo: "",
      descricao: "",
      preco: paraCampo(i.preco_alvo),
      categoria: i.categoria ?? "",
      cidade: "",
      estado: "",
      entrega: "",
      aceitaTroca: false,
      tipo: adivinharTipo(i.nome, i.categoria),
      detalhes: {},
    };
  return {
    titulo: a.titulo ?? "",
    descricao: a.descricao ?? "",
    preco: paraCampo(a.preco),
    categoria: a.categoria ?? "",
    cidade: a.cidade ?? "",
    estado: a.estado_conservacao ?? "",
    entrega: a.entrega ?? "",
    aceitaTroca: !!a.aceita_troca,
    tipo: a.tipo ?? adivinharTipo(i.nome, i.categoria),
    detalhes: a.detalhes ?? {},
  };
}

/** Compara como o servidor grava (sem espaços nas pontas, preço em centavos). */
export function mesmoTexto(a: CamposAnuncio, b: CamposAnuncio): boolean {
  const norm = (c: CamposAnuncio) =>
    JSON.stringify([
      c.titulo.trim(),
      c.descricao.trim(),
      lerReais(c.preco),
      c.categoria.trim(),
      c.cidade.trim(),
      c.estado,
      c.entrega,
      c.aceitaTroca,
      c.tipo,
      Object.entries(c.detalhes).filter(([, v]) => v.trim()).sort(([a], [b]) => a.localeCompare(b)),
    ]);
  return norm(a) === norm(b);
}

/** Preço só com o número, como o campo do Marketplace pede ("1800", "1234,50"). */
export function precoParaColar(preco: string): string {
  const c = lerReais(preco);
  return c != null && c > 0 ? paraCampo(c) : "";
}

/** timestamptz → dia (AAAA-MM-DD) em São Paulo. */
export const diaSP = (iso: string) => diaDe(new Date(iso));

export function quandoRenovar(renovarEm: string, hoje: string): { texto: string; vencido: boolean } {
  if (renovarEm < hoje) return { texto: `Renovar desde ${dataCurta(renovarEm, hoje)}`, vencido: true };
  if (renovarEm === hoje) return { texto: "Renovar hoje", vencido: true };
  return { texto: `Renovar em ${dataCurta(renovarEm, hoje)}`, vencido: false };
}

/** Link curto para mostrar: sem https:// e sem www. */
export function linkCurto(link: string): string {
  return link.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

/** Nome de arquivo das fotos: "honda-cb300r-1.jpg". */
export function nomeArquivo(nome: string, n: number): string {
  const base = paraBusca(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "foto";
  return `${base}-${n}.jpg`;
}

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
