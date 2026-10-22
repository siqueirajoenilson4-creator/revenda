"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { salvarDetalhesVenda, type Resultado } from "@/app/acoes";
import { CANAIS, ENTREGAS_VENDA, PAGAMENTOS, type Canal, type EntregaVenda, type Pagamento } from "@/lib/vendas";
import { Campo, Mensagem } from "./Campos";
import { Opcoes } from "./FormVenda";
import { Girando } from "./IconesItem";

/** O que já foi registrado da venda (`id` é o id do item). */
export type VendaDetalhes = {
  id: string;
  canal: Canal | null;
  pagamento: Pagamento | null;
  entrega: EntregaVenda | null;
  comprador_nome: string | null;
  comprador_contato: string | null;
  cidade: string | null;
  obs: string | null;
};

/**
 * Completa ou corrige canal, pagamento, entrega e comprador de uma venda já registrada
 * (as antigas aparecem como "Não informado"). Valor e data continuam em Editar item.
 */
export function DetalhesVenda({ venda, aoTerminar }: { venda: VendaDetalhes; aoTerminar?: () => void }) {
  const [estado, acao, enviando] = useActionState(salvarDetalhesVenda, undefined);
  const [canal, setCanal] = useState(venda.canal);
  const [pagamento, setPagamento] = useState(venda.pagamento);
  const [entrega, setEntrega] = useState(venda.entrega);
  const tratado = useRef<Resultado>(undefined);
  const faltando = !venda.canal || !venda.pagamento;
  const seis = "grid-cols-3 @2xl/campos:grid-cols-6";

  useEffect(() => {
    if (!estado?.ok || tratado.current === estado) return;
    tratado.current = estado;
    aoTerminar?.();
  }, [estado, aoTerminar]);

  // Envio manual: o reset automático do <form action> apagaria o que foi digitado quando dá erro.
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => acao(dados));
  }

  return (
    <form onSubmit={enviar} className="@container/campos space-y-3.5">
      <input type="hidden" name="id" value={venda.id} />
      {faltando && (
        <p className="rounded-lg bg-info-fundo px-3 py-2 text-[13px] leading-snug text-info">
          Venda sem canal ou pagamento. Complete para ela entrar certo em “De onde vêm as vendas”.
        </p>
      )}
      <Opcoes rotulo="Canal" name="canal" opcoes={CANAIS} valor={canal} aoMudar={setCanal} colunas={seis} />
      <Opcoes rotulo="Pagamento" name="pagamento" opcoes={PAGAMENTOS} valor={pagamento} aoMudar={setPagamento} colunas={seis} />
      <Opcoes rotulo="Entrega" name="entrega" opcoes={ENTREGAS_VENDA} valor={entrega} aoMudar={setEntrega} colunas="grid-cols-2" />
      {entrega === "entreguei" && venda.entrega !== "entreguei" && (
        <p className="aparece text-[13px] text-suave">Se a entrega teve custo, lance como gasto no item.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Comprador" name="comprador_nome" defaultValue={venda.comprador_nome ?? ""} autoComplete="off" />
        <Campo
          rotulo="Telefone ou perfil"
          name="comprador_contato"
          defaultValue={venda.comprador_contato ?? ""}
          autoComplete="off"
        />
      </div>
      <Campo rotulo="Cidade" name="cidade" defaultValue={venda.cidade ?? ""} placeholder="Ex.: Londrina, Cambé" autoComplete="off" />
      <label className="block">
        <span className="rotulo">Observação</span>
        <textarea name="obs" rows={2} className="campo" defaultValue={venda.obs ?? ""} />
      </label>
      <Mensagem estado={estado} />
      <button type="submit" className="botao-principal w-full sm:w-auto sm:min-w-40" disabled={enviando}>
        {enviando ? (
          <>
            <Girando />
            Salvando…
          </>
        ) : (
          "Salvar venda"
        )}
      </button>
    </form>
  );
}
