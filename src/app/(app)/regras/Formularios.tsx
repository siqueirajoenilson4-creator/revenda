"use client";

import { useActionState } from "react";
import { importar, salvarRegras } from "@/app/acoes";
import type { Regras } from "@/lib/calculo";
import { paraCampo } from "@/lib/formato";
import { Campo, CampoReais, Mensagem } from "@/components/Campos";

const pct = (n: number) => String(n).replace(".", ",");

function CampoPct({ rotulo, name, valor, dica }: { rotulo: string; name: keyof Regras; valor: number; dica: string }) {
  return (
    <label className="block min-w-0">
      <span className="rotulo">{rotulo}</span>
      <div className="relative">
        <input name={name} className="campo pr-9" inputMode="decimal" defaultValue={pct(valor)} required />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-suave">%</span>
      </div>
      <span className="mt-1 block text-xs text-suave">{dica}</span>
    </label>
  );
}

export function FormRegras({ regras: r }: { regras: Regras }) {
  const [estado, acao, enviando] = useActionState(salvarRegras, undefined);
  return (
    <form action={acao} className="cartao space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Antes de comprar</legend>
        <CampoPct rotulo="Margem mínima" name="margem_min_pct" valor={r.margem_min_pct} dica="Lucro mínimo em % sobre o custo total." />
        <CampoReais rotulo="Lucro mínimo por item" name="lucro_min" defaultValue={paraCampo(r.lucro_min)} required dica="Abaixo disso não vale o trabalho." />
        <CampoPct rotulo="Pechincha do comprador" name="pechincha_pct" valor={r.pechincha_pct} dica="Quanto o comprador costuma tirar do preço." />
        <CampoPct rotulo="Taxa do anúncio" name="taxa_pct" valor={r.taxa_pct} dica="Comissão da plataforma, se houver." />
        <CampoReais rotulo="Custo por km" name="custo_km" defaultValue={paraCampo(r.custo_km)} required dica="Combustível e desgaste da moto." />
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Caixa</legend>
        <CampoReais rotulo="Saldo inicial do caixa" name="saldo_inicial" defaultValue={paraCampo(r.saldo_inicial)} required dica="Dinheiro que você tinha para começar." />
        <CampoPct rotulo="Reserva intocável" name="reserva_pct" valor={r.reserva_pct} dica="Parte do caixa que nunca vai para compra." />
        <CampoPct rotulo="Máximo num item" name="max_item_pct" valor={r.max_item_pct} dica="Teto de um item só, em % do caixa." />
      </fieldset>
      <Mensagem estado={estado} />
      <button className="botao-principal w-full sm:w-auto" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar regras"}
      </button>
    </form>
  );
}

export function FormImportar() {
  const [estado, acao, enviando] = useActionState(importar, undefined);
  return (
    <form action={acao} className="space-y-3">
      <div>
        <h2 className="font-semibold">Importar itens</h2>
        <p className="text-sm text-suave">
          Arquivo JSON do Caderno de Revenda ou de um backup. Valores em reais, datas AAAA-MM-DD.
          Os itens são adicionados (não substitui o que já existe).
        </p>
      </div>
      <Campo rotulo="Arquivo .json" name="arquivo" type="file" accept="application/json,.json" />
      <label className="block">
        <span className="rotulo">…ou cole o JSON aqui</span>
        <textarea name="json" rows={4} className="campo font-mono text-xs" placeholder='{"itens": [{"nome": "...", "compra_valor": 300, ...}]}' />
      </label>
      <Mensagem estado={estado} />
      <button className="botao-secundario" disabled={enviando}>{enviando ? "Importando…" : "Importar"}</button>
    </form>
  );
}
