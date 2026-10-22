"use client";

import { useState } from "react";
import { mesCurto, reais } from "@/lib/formato";

/**
 * Lucro realizado por mês. Uma série só, uma cor só: mês com prejuízo
 * aparece abaixo da linha do zero (posição, não cor).
 */
export function GraficoLucro({ meses }: { meses: { mes: string; lucro: number }[] }) {
  const [foco, setFoco] = useState<number | null>(null);
  const max = Math.max(0, ...meses.map((m) => m.lucro));
  const min = Math.min(0, ...meses.map((m) => m.lucro));
  const faixa = max - min || 1;
  const ALTURA = 160;
  const zero = (max / faixa) * ALTURA; // distância do topo até a linha do zero
  const ultimo = meses.length - 1;
  const destaque = foco ?? ultimo;

  return (
    <figure>
      <div className="mb-2 h-10 text-sm" aria-live="polite">
        <div className="text-suave">{mesCurto(meses[destaque].mes)}</div>
        <div className="font-semibold tabular-nums">{reais(meses[destaque].lucro, true)}</div>
      </div>
      <div className="relative" style={{ height: ALTURA }} onMouseLeave={() => setFoco(null)}>
        <div className="absolute inset-x-0 border-t border-borda" style={{ top: zero }} aria-hidden />
        <div className="absolute inset-0 flex">
          {meses.map((m, i) => {
            const h = (Math.abs(m.lucro) / faixa) * ALTURA;
            const positivo = m.lucro >= 0;
            return (
              <button
                key={m.mes}
                type="button"
                className="relative h-full flex-1 px-[1px] outline-none"
                onMouseEnter={() => setFoco(i)}
                onFocus={() => setFoco(i)}
                onClick={() => setFoco(i)}
                aria-label={`${mesCurto(m.mes)}: ${reais(m.lucro, true)}`}
              >
                {foco === i && <span className="absolute inset-0 rounded-md bg-texto/5" aria-hidden />}
                <span
                  className={`absolute inset-x-[18%] bg-grafico ${positivo ? "rounded-t" : "rounded-b"} ${
                    destaque === i ? "opacity-100" : "opacity-80"
                  }`}
                  style={positivo ? { bottom: ALTURA - zero, height: Math.max(h, m.lucro ? 2 : 0) } : { top: zero, height: h }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex text-[11px] text-suave" aria-hidden>
        {meses.map((m, i) => (
          <span key={m.mes} className="flex-1 truncate text-center">
            {meses.length <= 6 || i % 2 === ultimo % 2 ? mesCurto(m.mes) : ""}
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-suave">Ver em tabela</summary>
        <table className="mt-2 w-full">
          <tbody>
            {meses.map((m) => (
              <tr key={m.mes} className="border-b border-borda last:border-0">
                <td className="py-1">{mesCurto(m.mes)}</td>
                <td className="py-1 text-right tabular-nums">{reais(m.lucro, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
