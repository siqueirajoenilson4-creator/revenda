import type { Situacao } from "@/lib/calculo";
import { rotuloCanal, type Canal } from "@/lib/vendas";
import { rotuloSituacaoPublicacao, type SituacaoPublicacao } from "@/lib/anuncios";
import { rotuloSituacaoContato, type SituacaoContato } from "@/lib/interessados";

const SELO = "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase";

const CANAL: Record<Canal, string> = {
  marketplace: "bg-canal-mkt-fundo text-canal-mkt",
  olx: "bg-canal-olx-fundo text-canal-olx",
  grupos: "bg-canal-grupos-fundo text-canal-grupos",
  whatsapp: "bg-canal-zap-fundo text-canal-zap",
  indicacao: "bg-superficie-2 text-texto ring-1 ring-borda ring-inset",
  outro: "bg-superficie-2 text-suave ring-1 ring-borda ring-inset",
};

/** Canal de venda ou de contato. Sem canal (vendas antigas): "Não informado". */
export function SeloCanal({ canal }: { canal: Canal | null | undefined }) {
  const classe = canal ? CANAL[canal] : "bg-superficie-2 text-suave ring-1 ring-borda ring-inset";
  return <span className={`${SELO} whitespace-nowrap ${classe}`}>{rotuloCanal(canal)}</span>;
}

const PUBLICACAO: Record<SituacaoPublicacao, string> = {
  rascunho: "bg-superficie-2 text-suave ring-1 ring-borda-forte ring-inset",
  publicado: "bg-bom-fundo text-bom",
  pausado: "bg-atencao-fundo text-atencao",
  vendido: "bg-superficie-2 text-suave",
};

export function SeloPublicacao({ situacao }: { situacao: SituacaoPublicacao }) {
  return <span className={`${SELO} ${PUBLICACAO[situacao]}`}>{rotuloSituacaoPublicacao(situacao)}</span>;
}

const CONTATO: Record<SituacaoContato, string> = {
  novo: "bg-info-fundo text-info",
  negociando: "bg-marca text-marca-texto",
  agendado: "bg-bom-fundo text-bom",
  comprou: "bg-lateral text-white",
  perdido: "bg-superficie-2 text-suave ring-1 ring-borda ring-inset",
};

export function SeloContato({ situacao }: { situacao: SituacaoContato }) {
  return <span className={`${SELO} ${CONTATO[situacao]}`}>{rotuloSituacaoContato(situacao)}</span>;
}

const SITUACAO: Record<Situacao, { texto: string; classe: string }> = {
  comprado: { texto: "Parado", classe: "bg-superficie-2 text-suave ring-1 ring-borda-forte ring-inset" },
  anunciado: { texto: "Anunciado", classe: "bg-marca text-marca-texto" },
  vendido: { texto: "Vendido", classe: "bg-bom-fundo text-bom" },
};

export function SeloSituacao({ situacao, capital }: { situacao: Situacao; capital?: boolean }) {
  const s = SITUACAO[situacao];
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`${SELO} ${s.classe}`}>{s.texto}</span>
      {capital && <span className={`${SELO} bg-lateral text-white`}>Capital</span>}
    </span>
  );
}

/** Dias parado: amarelo depois de 15, vermelho depois de 30 (só para o que não vendeu). */
export function SeloDias({ dias, vendido }: { dias: number | null; vendido: boolean }) {
  if (dias == null) return <span className="text-suave">—</span>;
  const classe = vendido
    ? "text-suave"
    : dias > 30
      ? "bg-ruim text-white font-bold"
      : dias > 15
        ? "bg-marca text-marca-texto font-bold"
        : "bg-superficie-2 text-suave ring-1 ring-borda ring-inset";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${classe}`}>
      {dias} {dias === 1 ? "dia" : "dias"}
      {vendido ? " até vender" : ""}
    </span>
  );
}

export function Miniatura({ src, nome, tamanho = "size-14" }: { src?: string; nome: string; tamanho?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={nome} loading="lazy" className={`${tamanho} shrink-0 rounded-lg border border-borda bg-superficie-2 object-cover`} />
  ) : (
    <div
      className={`${tamanho} flex shrink-0 items-center justify-center rounded-lg bg-superficie-2 font-display text-lg font-bold text-suave ring-1 ring-borda ring-inset`}
      aria-hidden
    >
      {nome.slice(0, 1).toUpperCase()}
    </div>
  );
}
