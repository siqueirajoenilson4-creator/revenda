"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { linkWhatsApp, preencherResposta, type DadosResposta, type Resposta } from "@/lib/interessados";
import { Icone } from "@/components/IconesItem";
import { BALAO, CERTO, COPIAR } from "./icones";
import { copiarTexto } from "./uteis";

const BOTAO = "botao-pequeno min-h-11 flex-1 text-sm md:min-h-9 md:text-[13px]";

/**
 * Respostas prontas já preenchidas para um interessado: copiar ou abrir no
 * WhatsApp com o texto. Quem envia é sempre o dono, no app.
 */
export function RespostasProntas({
  respostas,
  dados,
  telefone,
}: {
  respostas: Pick<Resposta, "id" | "titulo" | "texto">[];
  dados: DadosResposta;
  telefone?: string | null;
}) {
  const [copiada, setCopiada] = useState<string | null>(null);
  const [falhou, setFalhou] = useState<string | null>(null);

  useEffect(() => {
    if (!copiada) return;
    const t = setTimeout(() => setCopiada(null), 2000);
    return () => clearTimeout(t);
  }, [copiada]);

  if (!respostas.length)
    return (
      <p className="text-[15px] text-suave">
        Nenhuma resposta pronta.{" "}
        <Link href="/interessados/respostas" className="link">
          Criar respostas
        </Link>
      </p>
    );

  async function copiar(id: string, texto: string) {
    const ok = await copiarTexto(texto);
    setFalhou(ok ? null : id);
    setCopiada(ok ? id : null);
  }

  return (
    <>
      <ul className="space-y-2.5">
        {respostas.map((r) => {
          const texto = preencherResposta(r.texto, dados);
          const zap = linkWhatsApp(telefone, texto);
          const ok = copiada === r.id;
          return (
            <li key={r.id} className="rounded-lg border border-borda p-3">
              <p className="sobrescrito">{r.titulo}</p>
              <p className="mt-1 text-[15px] leading-snug break-words whitespace-pre-line">{texto}</p>
              {falhou === r.id && (
                <p className="mt-1.5 text-[13px] font-semibold text-ruim">Não deu para copiar. Segure o texto e copie.</p>
              )}
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  className={`${BOTAO} ${ok ? "border-bom/40 bg-bom-fundo text-bom hover:bg-bom-fundo" : ""}`}
                  onClick={() => copiar(r.id, texto)}
                >
                  <Icone>{ok ? CERTO : COPIAR}</Icone>
                  {ok ? "Copiado" : "Copiar"}
                </button>
                {zap && (
                  <a href={zap} target="_blank" rel="noopener noreferrer" className={BOTAO}>
                    <Icone className="size-4 text-canal-zap">{BALAO}</Icone>
                    Enviar no WhatsApp
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <span className="sr-only" aria-live="polite">
        {copiada ? "Copiado" : ""}
      </span>
    </>
  );
}
