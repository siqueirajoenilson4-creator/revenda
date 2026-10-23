// Anúncios (Fase 2): texto do anúncio, situação por canal, lembrete de renovar
// e histórico de preço. No Facebook o dono publica à mão (copiar e colar) ou
// pela extensão do robô (ver lib/robo.ts); a ferramenta guarda o texto e o link.

import { listaTexto } from "./formato";
import { somarDias } from "./periodo";

/** As mesmas opções do Marketplace (textos de out/2026), para copiar sem traduzir. */
export const ESTADOS = [
  { id: "novo", rotulo: "Novo" },
  { id: "como_novo", rotulo: "Usado — estado de novo" },
  { id: "bom", rotulo: "Usado — em boas condições" },
  { id: "razoavel", rotulo: "Usado — em condições razoáveis" },
] as const;
export type EstadoConservacao = (typeof ESTADOS)[number]["id"];

export const ENTREGAS = [
  { id: "retirada", rotulo: "Só retirada" },
  { id: "entrego", rotulo: "Entrego na região" },
  { id: "ambos", rotulo: "Retirada ou entrega" },
] as const;
export type Entrega = (typeof ENTREGAS)[number]["id"];

/** renovaDias: o Marketplace e os grupos derrubam o anúncio na lista depois de uma semana. */
export const CANAIS_ANUNCIO = [
  { id: "marketplace", rotulo: "Facebook Marketplace", renovaDias: 7 },
  { id: "olx", rotulo: "OLX", renovaDias: null },
  { id: "grupos", rotulo: "Grupos do Facebook", renovaDias: 7 },
  { id: "whatsapp", rotulo: "WhatsApp", renovaDias: null },
  { id: "outro", rotulo: "Outro", renovaDias: null },
] as const;
export type CanalAnuncio = (typeof CANAIS_ANUNCIO)[number]["id"];

export const SITUACOES_PUBLICACAO = [
  { id: "rascunho", rotulo: "Rascunho" },
  { id: "publicado", rotulo: "Publicado" },
  { id: "pausado", rotulo: "Pausado" },
  { id: "vendido", rotulo: "Vendido" },
] as const;
export type SituacaoPublicacao = (typeof SITUACOES_PUBLICACAO)[number]["id"];

export const ehEstado = (v: unknown): v is EstadoConservacao => ESTADOS.some((e) => e.id === v);
export const ehEntrega = (v: unknown): v is Entrega => ENTREGAS.some((e) => e.id === v);
export const ehCanalAnuncio = (v: unknown): v is CanalAnuncio => CANAIS_ANUNCIO.some((c) => c.id === v);
export const ehSituacaoPublicacao = (v: unknown): v is SituacaoPublicacao =>
  SITUACOES_PUBLICACAO.some((s) => s.id === v);

export const rotuloEstado = (e: EstadoConservacao | null | undefined) => ESTADOS.find((x) => x.id === e)?.rotulo ?? null;
export const rotuloEntrega = (e: Entrega | null | undefined) => ENTREGAS.find((x) => x.id === e)?.rotulo ?? null;
export const rotuloCanalAnuncio = (c: CanalAnuncio) => CANAIS_ANUNCIO.find((x) => x.id === c)!.rotulo;
export const rotuloSituacaoPublicacao = (s: SituacaoPublicacao) => SITUACOES_PUBLICACAO.find((x) => x.id === s)!.rotulo;

export type Publicacao = {
  id: string;
  anuncio_id: string;
  canal: CanalAnuncio;
  situacao: SituacaoPublicacao;
  id_externo: string | null;
  link: string | null;
  publicado_em: string | null; // timestamptz
  renovar_em: string | null; // AAAA-MM-DD
};

export type PrecoHistorico = { id: string; anuncio_id: string; preco: number; data: string; criado_em: string };

export type Anuncio = {
  id: string;
  item_id: string;
  titulo: string;
  descricao: string;
  preco: number | null;
  categoria: string | null;
  cidade: string | null;
  estado_conservacao: EstadoConservacao | null;
  aceita_troca: boolean;
  entrega: Entrega | null;
  criado_em: string;
  atualizado_em: string;
  publicacoes: Publicacao[];
  precos: PrecoHistorico[];
};

// ---------- Gerador de texto ----------

/** Cabe na OLX e no Marketplace sem cortar. */
export const LIMITE_TITULO = 70;

export type DadosTexto = {
  nome: string;
  estado?: EstadoConservacao | null;
  /** O que mais chama atenção ("documento em dia", "pouco uso"). */
  pontoForte?: string | null;
  /** Descrições dos gastos do item; deslocamento e taxas ficam de fora sozinhos. */
  gastos?: string[];
  cidade?: string | null;
  entrega?: Entrega | null;
  aceitaTroca?: boolean;
};

const ESTADO_FRASE: Record<EstadoConservacao, string> = {
  novo: "novo, sem uso",
  como_novo: "usado, como novo",
  bom: "usado, em bom estado",
  razoavel: "usado, com marcas de uso",
};

/** Gasto que não é trato no item (não vale contar no anúncio). */
const NAO_E_TRATO = /deslocamento|gasolina|combust[ií]vel|frete|taxa|transfer[eê]ncia|documento|despachante|entrega/i;

function frase(t: string): string {
  const limpo = t.trim().replace(/[.;,\s]+$/, "");
  return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) + "." : "";
}

/** Corta no limite sem quebrar palavra. */
export function cortarTitulo(t: string, limite = LIMITE_TITULO): string {
  const s = t.replace(/\s+/g, " ").trim();
  if (s.length <= limite) return s;
  const corte = s.slice(0, limite + 1);
  const ultimo = corte.lastIndexOf(" ");
  return (ultimo > limite * 0.6 ? corte.slice(0, ultimo) : s.slice(0, limite)).replace(/[\s,–-]+$/, "");
}

/**
 * Título e descrição prontos para colar. Texto simples, sem emoji e sem
 * exagero: quem compra usado confia mais em anúncio direto.
 */
export function gerarAnuncio(d: DadosTexto): { titulo: string; descricao: string } {
  const nome = d.nome.replace(/\s+/g, " ").trim();
  const ponto = d.pontoForte?.replace(/\s+/g, " ").trim() || null;
  const titulo = cortarTitulo(ponto && nome.length + ponto.length + 3 <= LIMITE_TITULO ? `${nome} – ${ponto}` : nome);

  const trato = [...new Set((d.gastos ?? []).map((g) => g.trim()).filter((g) => g && !NAO_E_TRATO.test(g)))].map(
    (g) => g.charAt(0).toLowerCase() + g.slice(1),
  );
  const cidade = d.cidade?.trim() || null;
  const retirada = cidade ? `Retirada em ${cidade}` : "Retirada a combinar";
  const entrega =
    d.entrega === "entrego"
      ? "Entrego em Londrina e região."
      : d.entrega === "ambos"
        ? `${retirada} ou entrego em Londrina e região.`
        : d.entrega === "retirada"
          ? `${retirada}.`
          : null;

  const blocos = [
    nome,
    [
      d.estado ? `Estado: ${ESTADO_FRASE[d.estado]}.` : null,
      ponto ? frase(ponto) : null,
      trato.length ? `O que foi feito: ${listaTexto(trato)}.` : null,
    ].filter(Boolean).join("\n"),
    [entrega, d.aceitaTroca ? "Aceito troca." : "Não aceito troca.", "Pix ou dinheiro."].filter(Boolean).join("\n"),
  ].filter(Boolean);

  return { titulo, descricao: blocos.join("\n\n") };
}

// ---------- Renovar e histórico ----------

/** Data (AAAA-MM-DD) para renovar no canal, ou null se o canal não pede renovação. */
export function renovarEm(canal: CanalAnuncio, publicadoEm: string): string | null {
  const dias = CANAIS_ANUNCIO.find((c) => c.id === canal)?.renovaDias;
  return dias ? somarDias(publicadoEm.slice(0, 10), dias) : null;
}

export function precisaRenovar(p: Pick<Publicacao, "situacao" | "renovar_em">, hoje: string): boolean {
  return p.situacao === "publicado" && p.renovar_em != null && p.renovar_em <= hoje;
}

export type MudancaPreco = PrecoHistorico & { anterior: number | null; diferenca: number | null };

/** Do mais novo para o mais antigo, com a diferença para o preço anterior. */
export function historicoPreco(precos: PrecoHistorico[]): MudancaPreco[] {
  const ordem = [...precos].sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  return ordem
    .map((p, i) => {
      const anterior = i > 0 ? ordem[i - 1].preco : null;
      return { ...p, anterior, diferenca: anterior == null ? null : p.preco - anterior };
    })
    .reverse();
}

/** Situação geral do anúncio para listas: o melhor estado entre os canais. */
export function situacaoAnuncio(a: Pick<Anuncio, "publicacoes"> | null): "sem_anuncio" | SituacaoPublicacao {
  if (!a) return "sem_anuncio";
  const s = a.publicacoes.map((p) => p.situacao);
  for (const x of ["publicado", "pausado", "vendido"] as const) if (s.includes(x)) return x;
  return "rascunho";
}
