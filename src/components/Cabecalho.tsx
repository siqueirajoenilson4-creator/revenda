import type { ReactNode } from "react";

/** Título da página com subtítulo e ações à direita. */
export function Cabecalho({ titulo, sub, acoes }: { titulo: ReactNode; sub?: ReactNode; acoes?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="titulo-pagina">{titulo}</h1>
        {sub && <p className="mt-0.5 text-sm text-suave">{sub}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

/** Botões em grupo para escolher uma opção (filtro, período). */
export function Segmentos<T extends string>({
  opcoes,
  valor,
  aoMudar,
}: {
  opcoes: { id: T; rotulo: ReactNode }[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  return (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-borda/60 p-1" role="tablist">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === valor}
          onClick={() => aoMudar(o.id)}
          className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
            o.id === valor ? "bg-superficie text-texto shadow-sm" : "text-suave hover:text-texto"
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom,
  destaque,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: "ruim" | "bom";
  destaque?: boolean;
}) {
  return (
    <div className={`cartao min-w-0 ${destaque ? "border-marca/30 bg-marca-fundo" : ""}`}>
      <div className="text-[13px] font-medium text-suave">{rotulo}</div>
      <div
        className={`mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight ${
          tom === "ruim" ? "text-ruim" : tom === "bom" ? "text-bom" : ""
        }`}
      >
        {valor}
      </div>
      {detalhe && <div className="mt-1 truncate text-xs text-suave">{detalhe}</div>}
    </div>
  );
}
