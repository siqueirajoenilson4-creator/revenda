"use client";

import { useId } from "react";
import { camposDoTipo, TIPOS, type Campo, type Detalhes, type TipoProduto } from "@/lib/detalhes";

function CampoFicha({ c, valor, mudar }: { c: Campo; valor: string; mudar: (v: string) => void }) {
  const id = useId();
  if (c.tipo === "simnao") {
    return (
      <fieldset className="min-w-0">
        <legend className="rotulo">{c.rotulo}</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {(["sim", "nao"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={valor === v}
              onClick={() => mudar(valor === v ? "" : v)}
              className={`min-h-11 rounded-lg border px-3 text-[15px] font-semibold transition-colors md:min-h-10 ${
                valor === v ? "border-texto bg-superficie-2" : "border-borda-forte hover:bg-superficie-2"
              }`}
            >
              {v === "sim" ? "Sim" : "Não"}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="rotulo">
        {c.rotulo}
      </label>
      {c.tipo === "escolha" ? (
        <select id={id} value={valor} onChange={(e) => mudar(e.target.value)} className="campo">
          <option value="">—</option>
          {c.opcoes.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <div className="relative">
          <input
            id={id}
            value={valor}
            onChange={(e) => mudar(e.target.value)}
            inputMode={c.tipo === "numero" ? "numeric" : undefined}
            placeholder={c.exemplo ? `Ex.: ${c.exemplo}` : undefined}
            autoComplete="off"
            className={`campo ${c.sufixo ? "pr-12" : ""}`}
          />
          {c.sufixo && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[15px] text-suave" aria-hidden>
              {c.sufixo}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Tipo do produto e os campos que o comprador procura nesse tipo. */
export function Ficha({
  tipo,
  detalhes,
  mudar,
}: {
  tipo: TipoProduto | "";
  detalhes: Detalhes;
  mudar: (parcial: { tipo?: TipoProduto | ""; detalhes?: Detalhes }) => void;
}) {
  const idTipo = useId();
  const campos = camposDoTipo(tipo);
  const preenchidos = campos.filter((c) => detalhes[c.id]?.trim()).length;

  return (
    <div className="rounded-lg border border-borda p-3 md:p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor={idTipo} className="rotulo">
            Tipo de produto
          </label>
          <select
            id={idTipo}
            value={tipo}
            onChange={(e) => mudar({ tipo: e.target.value as TipoProduto | "" })}
            className="campo"
          >
            <option value="">Escolha</option>
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </div>
        {campos.length > 0 && (
          <span className="text-[13px] text-suave">
            {preenchidos} de {campos.length} preenchidos · quanto mais, melhor o texto
          </span>
        )}
      </div>
      {campos.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {campos.map((c) => (
            <CampoFicha
              key={c.id}
              c={c}
              valor={detalhes[c.id] ?? ""}
              mudar={(v) => mudar({ detalhes: { ...detalhes, [c.id]: v } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
