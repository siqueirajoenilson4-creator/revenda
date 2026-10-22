"use client";

import { useState, useTransition } from "react";
import { renovarPublicacao } from "@/app/acoes";
import { Girando, Icone } from "@/components/IconesItem";
import { RENOVAR } from "./icones";

/** "Renovei": ele renovou no site; o lembrete anda mais 7 dias. */
export function BotaoRenovei({ id, className = "botao-pequeno" }: { id: string; className?: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  return (
    <>
      <button
        type="button"
        disabled={pendente}
        className={className}
        onClick={() =>
          iniciar(async () => {
            setErro(undefined);
            const r = await renovarPublicacao(id);
            if (r?.erro) setErro(r.erro);
          })
        }
      >
        {pendente ? <Girando /> : <Icone>{RENOVAR}</Icone>}
        {pendente ? "Salvando…" : "Renovei"}
      </button>
      {erro && (
        <p role="alert" className="col-span-full basis-full text-[13px] font-semibold text-ruim">
          {erro}
        </p>
      )}
    </>
  );
}
