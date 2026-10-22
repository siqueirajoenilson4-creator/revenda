import type { Situacao } from "@/lib/calculo";

const SITUACAO: Record<Situacao, { texto: string; classe: string }> = {
  comprado: { texto: "Parado", classe: "bg-borda/70 text-suave" },
  anunciado: { texto: "Anunciado", classe: "bg-info-fundo text-info" },
  vendido: { texto: "Vendido", classe: "bg-bom-fundo text-bom" },
};

export function SeloSituacao({ situacao, capital }: { situacao: Situacao; capital?: boolean }) {
  const s = SITUACAO[situacao];
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${s.classe}`}>{s.texto}</span>
      {capital && (
        <span className="rounded-md bg-atencao-fundo px-1.5 py-0.5 text-[11px] font-semibold text-atencao">Capital</span>
      )}
    </span>
  );
}

/** Dias parado: amarelo depois de 15, vermelho depois de 30 (só para o que não vendeu). */
export function SeloDias({ dias, vendido }: { dias: number | null; vendido: boolean }) {
  if (dias == null) return <span className="text-suave">—</span>;
  const classe = vendido
    ? "text-suave"
    : dias > 30
      ? "bg-ruim-fundo text-ruim font-semibold"
      : dias > 15
        ? "bg-atencao-fundo text-atencao font-semibold"
        : "text-suave";
  return (
    <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${classe}`}>
      {dias} {dias === 1 ? "dia" : "dias"}
      {vendido ? " até vender" : ""}
    </span>
  );
}

export function Miniatura({ src, nome, tamanho = "size-14" }: { src?: string; nome: string; tamanho?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={nome} className={`${tamanho} shrink-0 rounded-lg border border-borda object-cover`} />
  ) : (
    <div className={`${tamanho} flex shrink-0 items-center justify-center rounded-lg bg-superficie-2 text-base font-semibold text-suave ring-1 ring-borda`}>
      {nome.slice(0, 1).toUpperCase()}
    </div>
  );
}
