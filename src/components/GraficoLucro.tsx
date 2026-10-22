"use client";

import { useId, useState } from "react";
import { reais } from "@/lib/formato";
import { eixo, reaisEixo, type Barra } from "@/lib/visao";

const ALTURA = "h-44 md:h-52";

/**
 * Faturamento (cinza, contexto) e lucro (azul) lado a lado por semana ou mês.
 * Lucro negativo desce abaixo da linha do zero.
 */
export function GraficoLucro({ barras, titulo, sub, vazio }: { barras: Barra[]; titulo: string; sub: string; vazio: string }) {
  const id = useId();
  const [foco, setFoco] = useState<number | null>(null);
  const { topo, base, marcas } = eixo(barras.flatMap((b) => [b.faturamento, b.lucro]));
  const faixa = topo - base || 1;
  const y = (v: number) => ((topo - v) / faixa) * 100; // % a partir do topo
  const temVendas = barras.some((b) => b.faturamento !== 0 || b.lucro !== 0);

  return (
    <figure aria-labelledby={id} className="cartao flex h-full flex-col p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id={id} className="titulo-secao">{titulo}</h2>
          <p className="text-[13px] text-suave">{sub}</p>
        </div>
        <ul className="flex gap-4 pt-1 text-[13px] text-suave" aria-label="Legenda">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-grafico-2" aria-hidden />
            Faturamento
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-grafico" aria-hidden />
            Lucro
          </li>
        </ul>
      </div>

      {!temVendas ? (
        <div className={`flex ${ALTURA} flex-col justify-center rounded-lg bg-superficie-2 px-5`}>
          <p className="font-semibold">{vazio}</p>
          <p className="mt-0.5 text-[13px] text-suave">Quando um item for marcado como vendido no Pátio, ele entra aqui.</p>
        </div>
      ) : (
        <>
          <div className="flex pt-2">
            <div className={`relative w-15 shrink-0 ${ALTURA}`} aria-hidden>
              {marcas.map((m) => (
                <span
                  key={m}
                  className="absolute right-2.5 -translate-y-1/2 text-[11px] whitespace-nowrap text-suave"
                  style={{ top: `${y(m)}%` }}
                >
                  {reaisEixo(m)}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`relative ${ALTURA}`} onMouseLeave={() => setFoco(null)}>
                {marcas.map((m) => (
                  <div
                    key={m}
                    className={`absolute inset-x-0 border-t ${m === 0 ? "border-borda-forte" : "border-borda"}`}
                    style={{ top: `${y(m)}%` }}
                    aria-hidden
                  />
                ))}
                <div className="absolute inset-0 flex">
                  {barras.map((b, i) => (
                    <button
                      key={b.id}
                      type="button"
                      className="relative h-full min-w-0 flex-1 rounded-md"
                      aria-label={`${b.titulo}: faturamento ${reais(b.faturamento, true)}, lucro ${reais(b.lucro, true)}`}
                      onMouseEnter={() => setFoco(i)}
                      onFocus={() => setFoco(i)}
                      onBlur={() => setFoco(null)}
                      onClick={() => setFoco(i)}
                    >
                      <span
                        className={`absolute inset-y-0 inset-x-[6%] rounded-md transition-colors duration-150 ${foco === i ? "bg-texto/6" : ""}`}
                        aria-hidden
                      />
                      <span
                        className="absolute inset-y-0 left-1/2 flex w-[72%] max-w-[50px] -translate-x-1/2 justify-center gap-0.5"
                        aria-hidden
                      >
                        <Coluna valor={b.faturamento} faixa={faixa} zero={y(0)} cor="bg-grafico-2" atraso={Math.min(i * 25, 240)} />
                        <Coluna valor={b.lucro} faixa={faixa} zero={y(0)} cor="bg-grafico" atraso={Math.min(i * 25, 240) + 50} />
                      </span>
                    </button>
                  ))}
                </div>
                {foco != null && <Dica barra={barras[foco]} indice={foco} total={barras.length} />}
              </div>
              <div className="mt-1.5 flex" aria-hidden>
                {barras.map((b, i) => (
                  <span
                    key={b.id}
                    className={`min-w-0 flex-1 truncate text-center text-[11px] transition-colors ${
                      foco === i ? "font-semibold text-texto" : "text-suave"
                    }`}
                  >
                    {b.rotulo}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Empurra a tabela para o fim quando o cartão estica ao lado dos avisos. */}
          <div className="min-h-4 flex-1" />
          <details className="group/tabela border-t border-borda pt-1">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-[13px] font-semibold text-link md:min-h-9 [&::-webkit-details-marker]:hidden">
              <svg
                viewBox="0 0 24 24"
                className="size-4 transition-transform duration-200 group-open/tabela:rotate-90"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              Ver em tabela
            </summary>
            <table className="mb-1 w-full text-sm">
              <caption className="sr-only">{titulo}</caption>
              <thead>
                <tr className="border-b border-borda">
                  <th scope="col" className="sobrescrito py-2 text-left">Período</th>
                  <th scope="col" className="sobrescrito py-2 pl-3 text-right">Faturamento</th>
                  <th scope="col" className="sobrescrito py-2 pl-3 text-right">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {barras.map((b) => (
                  <tr key={b.id} className="border-b border-borda last:border-0">
                    <th scope="row" className="py-1.5 text-left font-normal first-letter:uppercase">{b.titulo}</th>
                    <td className="py-1.5 pl-3 text-right tabular-nums">{reais(b.faturamento, true)}</td>
                    <td className={`py-1.5 pl-3 text-right font-semibold tabular-nums ${b.lucro < 0 ? "text-ruim" : ""}`}>
                      {reais(b.lucro, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </figure>
  );
}

/** Uma barra: sobe do zero quando positiva, desce do zero quando negativa. */
function Coluna({ valor, faixa, zero, cor, atraso }: { valor: number; faixa: number; zero: number; cor: string; atraso: number }) {
  const positivo = valor >= 0;
  return (
    <span className="relative max-w-6 min-w-0 flex-1">
      <span
        className={`cresce-y absolute inset-x-0 ${cor} ${positivo ? "rounded-t" : "rounded-b"} transition-[top,bottom,height] duration-500 ease-saida`}
        style={{
          ...(positivo ? { bottom: `${100 - zero}%` } : { top: `${zero}%`, transformOrigin: "top" }),
          height: `${(Math.abs(valor) / faixa) * 100}%`,
          minHeight: valor ? 2 : 0,
          animationDelay: `${atraso}ms`,
        }}
      />
    </span>
  );
}

/** Os dois valores da barra em foco, ao lado dela (sem cobrir as próprias barras). */
function Dica({ barra, indice, total }: { barra: Barra; indice: number; total: number }) {
  const naEsquerda = indice < total / 2;
  const posicao = naEsquerda
    ? { left: `min(calc(${((indice + 1) / total) * 100}% + 6px), calc(100% - 10rem))` }
    : { right: `min(calc(${100 - (indice / total) * 100}% + 6px), calc(100% - 10rem))` };
  return (
    <div
      className="pointer-events-none absolute top-1 z-10 w-40 rounded-lg border border-lateral-borda bg-lateral px-3 py-2 text-white shadow-(--sombra-alta)"
      style={posicao}
      aria-hidden
    >
      <div className="text-[12px] text-lateral-fraco first-letter:uppercase">{barra.titulo}</div>
      <Linha cor="bg-grafico-2" rotulo="Faturamento" valor={reais(barra.faturamento, true)} />
      <Linha cor="bg-grafico" rotulo="Lucro" valor={reais(barra.lucro, true)} />
    </div>
  );
}

function Linha({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: string }) {
  return (
    <div className="mt-1 flex items-center gap-2 text-[13px]">
      <span className={`h-0.5 w-3 shrink-0 rounded-full ${cor}`} aria-hidden />
      <span className="text-lateral-texto">{rotulo}</span>
      <span className="ml-auto font-semibold tabular-nums">{valor}</span>
    </div>
  );
}
