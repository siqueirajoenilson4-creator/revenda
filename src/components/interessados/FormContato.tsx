"use client";

import { useActionState, useEffect, useEffectEvent, useId, useState } from "react";
import { salvarContato } from "@/app/acoes";
import { paraCampo } from "@/lib/formato";
import { CANAIS } from "@/lib/vendas";
import { paraCampoDataHora, SITUACOES_CONTATO, type Contato } from "@/lib/interessados";
import { Campo, CampoReais, Mensagem } from "@/components/Campos";
import { Icone } from "@/components/IconesItem";
import { ABAIXO } from "./icones";
import { Opcoes } from "./Opcoes";
import { aoEnviar } from "./uteis";

export type ContatoForm = Pick<
  Contato,
  "id" | "item_id" | "canal" | "nome" | "telefone" | "oferta" | "situacao" | "proximo_passo" | "retorno_em" | "aguardando_desde"
>;

/**
 * Registro rápido de interessado (novo ou edição). Nome e canal primeiro:
 * no celular, digitar o nome e apertar Enter já registra.
 */
export function FormContato({
  contato,
  itens,
  itemId,
  aoTerminar,
}: {
  contato?: ContatoForm;
  itens: { id: string; nome: string; vendido?: boolean }[];
  itemId?: string;
  aoTerminar?: () => void;
}) {
  const [estado, acao, enviando] = useActionState(salvarContato, undefined);
  // Sem aoTerminar (formulário fixo na tela), um registro novo limpa tudo para o próximo.
  // A troca de rodada acontece no próprio render, ao chegar um resultado novo.
  const [rodada, setRodada] = useState(0);
  const [visto, setVisto] = useState(estado);
  if (estado !== visto) {
    setVisto(estado);
    if (estado?.ok && !aoTerminar && !contato) setRodada((r) => r + 1);
  }
  const terminar = useEffectEvent(() => aoTerminar?.());
  useEffect(() => {
    if (estado?.ok) terminar();
  }, [estado]);

  return (
    <form key={rodada} onSubmit={aoEnviar(acao)} className="space-y-3">
      {contato && <input type="hidden" name="id" value={contato.id} />}
      <Campo
        rotulo="Nome"
        name="nome"
        defaultValue={contato?.nome}
        placeholder="Como aparece no Facebook ou no WhatsApp"
        autoComplete="off"
        autoCapitalize="words"
        enterKeyHint="done"
        required
        autoFocus={!contato}
      />
      <Opcoes nome="canal" legenda="Por onde chamou" opcoes={CANAIS} inicial={contato?.canal ?? "marketplace"} />
      <SeletorItem itens={itens} inicial={contato ? (contato.item_id ?? "") : (itemId ?? "")} />
      <div className="grid grid-cols-2 gap-3">
        <Campo
          rotulo="Telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          defaultValue={contato?.telefone ?? ""}
          placeholder="(43) 99999-9999"
        />
        <CampoReais rotulo="Oferta" name="oferta" defaultValue={paraCampo(contato?.oferta)} />
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-borda bg-superficie-2 px-3 py-2 text-[15px] font-medium">
        <input
          type="checkbox"
          name="aguardando"
          defaultChecked={contato ? Boolean(contato.aguardando_desde) : true}
          className="size-5 shrink-0 accent-grafico"
        />
        Está esperando minha resposta
      </label>

      <Detalhes contato={contato} />

      <Mensagem estado={estado} />
      <button className="botao-principal w-full" disabled={enviando}>
        {enviando ? "Salvando…" : contato ? "Salvar" : "Registrar interessado"}
      </button>
    </form>
  );
}

function SeletorItem({ itens, inicial }: { itens: { id: string; nome: string; vendido?: boolean }[]; inicial: string }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="rotulo">
        Item
      </label>
      <select id={id} name="item_id" defaultValue={inicial} className="campo">
        <option value="">Sem item</option>
        {itens.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nome}
            {i.vendido ? " (vendido)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Situação, próximo passo e retorno: fechado no registro rápido, aberto na edição. */
function Detalhes({ contato }: { contato?: ContatoForm }) {
  const id = useId();
  return (
    <details open={Boolean(contato)} className="group rounded-lg border border-borda">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 text-[15px] font-semibold select-none hover:bg-superficie-2 [&::-webkit-details-marker]:hidden">
        Situação, próximo passo e retorno
        <Icone className="size-4 text-suave transition-transform duration-200 group-open:rotate-180">{ABAIXO}</Icone>
      </summary>
      <div className="grid grid-cols-2 gap-3 border-t border-borda p-3">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <label htmlFor={id} className="rotulo">
            Situação
          </label>
          <select id={id} name="situacao" defaultValue={contato?.situacao ?? "novo"} className="campo">
            {SITUACOES_CONTATO.map((s) => (
              <option key={s.id} value={s.id}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>
        <Campo
          rotulo="Retorno"
          name="retorno_em"
          type="datetime-local"
          defaultValue={paraCampoDataHora(contato?.retorno_em)}
          className="col-span-2 sm:col-span-1"
        />
        <Campo
          rotulo="Próximo passo"
          name="proximo_passo"
          defaultValue={contato?.proximo_passo ?? ""}
          placeholder="Ex.: mandar vídeo funcionando"
          autoComplete="off"
          className="col-span-2"
        />
      </div>
    </details>
  );
}
