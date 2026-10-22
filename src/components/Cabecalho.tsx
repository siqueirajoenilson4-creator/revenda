import type { ReactNode } from "react";
import { Numero } from "./Numero";

/** Título da página, com uma linha pequena em cima (data, contexto), subtítulo e ações à direita. */
export function Cabecalho({
  titulo,
  sobre,
  sub,
  acoes,
}: {
  titulo: ReactNode;
  sobre?: ReactNode;
  sub?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <header className="entra mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6">
      <div className="min-w-0">
        {sobre && <p className="sobrescrito mb-0.5 text-[12px]">{sobre}</p>}
        <h1 className="titulo-pagina">{titulo}</h1>
        {sub && <p className="mt-0.5 text-[15px] text-suave">{sub}</p>}
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
    <div
      className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-borda-forte bg-superficie p-0.5"
      role="tablist"
    >
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === valor}
          onClick={() => aoMudar(o.id)}
          className={`min-h-9 shrink-0 rounded-md px-3.5 text-sm transition-[background-color,color] duration-200 ${
            o.id === valor ? "bg-texto font-semibold text-superficie" : "font-medium text-suave hover:bg-superficie-2 hover:text-texto"
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

const TOM = { bom: "text-bom", ruim: "text-ruim", atencao: "text-atencao" } as const;

/** Cartão de indicador: rótulo em caixa alta, número grande (conta até o valor) e uma linha de detalhe. */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom,
  tomDetalhe,
  destaque,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: keyof typeof TOM;
  tomDetalhe?: keyof typeof TOM;
  destaque?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-3.5 md:p-4 ${
        destaque ? "border-lateral bg-lateral text-white" : "border-borda bg-superficie shadow-(--sombra)"
      }`}
    >
      <div className={`sobrescrito truncate ${destaque ? "text-lateral-fraco" : ""}`}>{rotulo}</div>
      <div
        className={`numero mt-1 truncate text-[26px] leading-[1.05] md:text-[32px] ${
          tom && !destaque ? TOM[tom] : ""
        } ${destaque && tom === "ruim" ? "text-[#ff9b90]" : ""}`}
      >
        {typeof valor === "string" ? <Numero texto={valor} /> : valor}
      </div>
      {detalhe && (
        <div
          className={`mt-1 truncate text-[13px] ${
            destaque ? "text-lateral-texto" : tomDetalhe ? `font-semibold ${TOM[tomDetalhe]}` : "text-suave"
          }`}
        >
          {detalhe}
        </div>
      )}
    </div>
  );
}
