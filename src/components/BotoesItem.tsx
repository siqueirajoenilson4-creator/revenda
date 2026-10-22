"use client";

import { useState, useTransition } from "react";
import { apagarGasto, desfazerVenda } from "@/app/acoes";
import { DESFAZER, FECHAR, Icone, LIXEIRA } from "./IconesItem";

const SO_ICONE =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-suave transition-[background-color,color,scale] duration-150 active:scale-[0.94] md:size-9";

/** Apagar gasto em dois toques: lixeira → "Apagar". */
export function ApagarGasto({ id }: { id: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [pendente, iniciar] = useTransition();
  if (!confirmar)
    return (
      <button
        type="button"
        aria-label="Apagar gasto"
        title="Apagar gasto"
        className={`${SO_ICONE} hover:bg-ruim-fundo hover:text-ruim`}
        onClick={() => setConfirmar(true)}
      >
        <Icone>{LIXEIRA}</Icone>
      </button>
    );
  return (
    <span className="aparece inline-flex items-center gap-0.5">
      <button
        type="button"
        disabled={pendente}
        className="botao-pequeno min-h-11 border-ruim/40 text-ruim md:min-h-9"
        onClick={() => iniciar(async () => void (await apagarGasto(id)))}
      >
        {pendente ? "Apagando…" : "Apagar"}
      </button>
      <button
        type="button"
        aria-label="Não apagar"
        className={`${SO_ICONE} hover:bg-superficie-2 hover:text-texto`}
        onClick={() => setConfirmar(false)}
      >
        <Icone>{FECHAR}</Icone>
      </button>
    </span>
  );
}

export function DesfazerVenda({ id }: { id: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  if (!confirmar)
    return (
      <button type="button" className="botao-secundario w-full sm:w-auto" onClick={() => setConfirmar(true)}>
        <Icone>{DESFAZER}</Icone>
        Desfazer venda
      </button>
    );
  return (
    <div className="aparece space-y-2.5">
      <p className="text-[15px]">Voltar o item para o pátio? A venda sai do caixa e do lucro.</p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button type="button" className="botao-secundario" onClick={() => setConfirmar(false)}>Não</button>
        <button
          type="button"
          disabled={pendente}
          className="botao-secundario border-ruim/40 text-ruim"
          onClick={() =>
            iniciar(async () => {
              const r = await desfazerVenda(id);
              if (r?.erro) setErro(r.erro);
            })
          }
        >
          {pendente ? "Desfazendo…" : "Sim, desfazer"}
        </button>
      </div>
      {erro && <p role="alert" className="text-sm text-ruim">{erro}</p>}
    </div>
  );
}
