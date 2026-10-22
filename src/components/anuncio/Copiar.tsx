"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/IconesItem";
import { COPIAR, FEITO } from "./icones";

/** Área de transferência; sem permissão (ou http), tenta o jeito antigo. */
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Botão grande de copiar, com "Copiado" por um instante. Se não der para copiar,
 * mostra o texto selecionado logo abaixo (ocupa a linha toda da grade) para copiar à mão.
 */
export function BotaoCopiar({
  rotulo,
  texto,
  vazio,
  className = "botao-secundario",
}: {
  rotulo: string;
  texto: string;
  /** Dica quando não há o que copiar (o botão fica desabilitado). */
  vazio?: string;
  className?: string;
}) {
  const [estado, setEstado] = useState<"" | "ok" | "falhou">("");
  const relogio = useRef<ReturnType<typeof setTimeout>>(undefined);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => clearTimeout(relogio.current), []);
  useEffect(() => {
    if (estado === "falhou") area.current?.select();
  }, [estado]);

  async function copiar() {
    clearTimeout(relogio.current);
    if (await copiarTexto(texto)) {
      setEstado("ok");
      relogio.current = setTimeout(() => setEstado(""), 1800);
    } else setEstado("falhou");
  }

  const ok = estado === "ok";
  return (
    <>
      <button
        type="button"
        onClick={copiar}
        disabled={!texto}
        title={!texto ? vazio : undefined}
        className={`${className} ${ok ? "border-bom/50 text-bom" : ""}`}
      >
        <Icone className="size-[18px]">{ok ? FEITO : COPIAR}</Icone>
        <span aria-live="polite" className="truncate">
          {ok ? (
            <span key="ok" className="aparece">
              Copiado
            </span>
          ) : (
            rotulo
          )}
        </span>
      </button>
      {estado === "falhou" && (
        <div className="aparece col-span-full basis-full space-y-1.5 rounded-lg bg-atencao-fundo p-3">
          <p className="text-[13px] font-semibold text-atencao">
            Não deu para copiar sozinho. O texto está selecionado: toque e segure para copiar.
          </p>
          <textarea
            ref={area}
            readOnly
            value={texto}
            rows={Math.min(8, texto.split("\n").length + 1)}
            aria-label={`${rotulo}: texto para copiar`}
            className="campo text-[14px]"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button type="button" className="botao-pequeno" onClick={() => setEstado("")}>
            Fechar
          </button>
        </div>
      )}
    </>
  );
}
