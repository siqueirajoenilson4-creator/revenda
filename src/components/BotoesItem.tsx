"use client";

import { useState, useTransition } from "react";
import { apagarGasto, desfazerVenda } from "@/app/acoes";

/** Apagar gasto em dois toques: "Apagar" → "Confirmar". */
export function ApagarGasto({ id }: { id: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [pendente, iniciar] = useTransition();
  if (!confirmar)
    return (
      <button type="button" className="text-xs text-suave underline hover:text-ruim" onClick={() => setConfirmar(true)}>
        apagar
      </button>
    );
  return (
    <span className="inline-flex gap-2 text-xs">
      <button
        type="button"
        disabled={pendente}
        className="font-semibold text-ruim underline"
        onClick={() => iniciar(async () => void (await apagarGasto(id)))}
      >
        {pendente ? "apagando…" : "confirmar"}
      </button>
      <button type="button" className="text-suave underline" onClick={() => setConfirmar(false)}>
        não
      </button>
    </span>
  );
}

export function DesfazerVenda({ id }: { id: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [pendente, iniciar] = useTransition();
  return confirmar ? (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      Voltar o item para o estoque?
      <button
        type="button"
        disabled={pendente}
        className="botao-pequeno text-ruim"
        onClick={() => iniciar(async () => void (await desfazerVenda(id)))}
      >
        {pendente ? "Desfazendo…" : "Sim, desfazer venda"}
      </button>
      <button type="button" className="botao-pequeno" onClick={() => setConfirmar(false)}>Não</button>
    </span>
  ) : (
    <button type="button" className="botao-pequeno" onClick={() => setConfirmar(true)}>Desfazer venda</button>
  );
}
