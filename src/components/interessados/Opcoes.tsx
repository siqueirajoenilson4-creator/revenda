"use client";

import { useState, type ReactNode } from "react";

/** Botões de escolha única (rádios de verdade por baixo, enviados com o formulário). */
export function Opcoes<T extends string>({
  nome,
  legenda,
  opcoes,
  inicial,
  colunas = "grid-cols-3",
}: {
  nome: string;
  legenda: ReactNode;
  opcoes: readonly { id: T; rotulo: string }[];
  inicial: T;
  colunas?: string;
}) {
  const [valor, setValor] = useState<T>(inicial);
  return (
    <fieldset className="min-w-0">
      <legend className="rotulo">{legenda}</legend>
      <div className={`grid gap-1.5 ${colunas}`}>
        {opcoes.map((o) => {
          const on = o.id === valor;
          return (
            <label key={o.id} className="min-w-0">
              <input
                type="radio"
                name={nome}
                value={o.id}
                checked={on}
                onChange={() => setValor(o.id)}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-sm leading-tight transition-[background-color,border-color,color] duration-150 select-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-grafico md:min-h-10 ${
                  on
                    ? "border-texto bg-texto font-semibold text-superficie"
                    : "border-borda-forte bg-superficie font-medium text-suave hover:bg-superficie-2 hover:text-texto"
                }`}
              >
                {o.rotulo}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
