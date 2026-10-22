"use client";

import { useEffect, useRef, useState } from "react";

// Primeiro número de um texto já formatado ("R$ 1.240", "-R$ 50,00", "47%", "12 dias").
const NUMERO = /(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?/;

function partes(texto: string) {
  const m = NUMERO.exec(texto);
  if (!m) return null;
  const decimais = m[2]?.length ?? 0;
  const valor = Number(m[1].replace(/\./g, "") + (decimais ? "." + m[2] : ""));
  return { antes: texto.slice(0, m.index), depois: texto.slice(m.index + m[0].length), valor, decimais };
}

function montar(p: NonNullable<ReturnType<typeof partes>>, v: number) {
  const n = v.toLocaleString("pt-BR", { minimumFractionDigits: p.decimais, maximumFractionDigits: p.decimais });
  return p.antes + n + p.depois;
}

const DURACAO = 700;
const suave = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Mostra o texto e, quando ele traz um número, conta até ele (na primeira vez a
 * partir de zero; depois, a partir do valor anterior). Sem número, mostra igual.
 */
export function Numero({ texto, className }: { texto: string; className?: string }) {
  // Começa do zero já no servidor, para não piscar o valor final antes da contagem.
  const [mostrado, setMostrado] = useState(() => {
    const p = partes(texto);
    return p ? montar(p, 0) : texto;
  });
  const anterior = useRef<number | null>(null);

  useEffect(() => {
    const p = partes(texto);
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const de = anterior.current ?? 0;
    anterior.current = p?.valor ?? null;
    const inicio = performance.now();
    let quadro = 0;
    // Sem número, sem movimento ou sem mudança: vai direto ao valor final (no próximo quadro).
    const direto = !p || reduzido || de === p.valor;
    const passo = (agora: number) => {
      const t = direto ? 1 : Math.min(1, (agora - inicio) / DURACAO);
      setMostrado(t >= 1 || !p ? texto : montar(p, de + (p.valor - de) * suave(t)));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [texto]);

  return (
    <span className={className} aria-label={texto}>
      <span aria-hidden>{mostrado}</span>
    </span>
  );
}
