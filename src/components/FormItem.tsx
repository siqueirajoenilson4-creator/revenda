"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { salvarItem } from "@/app/acoes";
import { paraCampo } from "@/lib/formato";
import { Campo, CampoReais, Mensagem } from "./Campos";

export type ItemForm = {
  id?: string;
  nome: string;
  categoria: string | null;
  tipo: "revenda" | "capital";
  situacao: "comprado" | "anunciado" | "vendido";
  compra_valor: number;
  compra_data: string | null;
  compra_local: string | null;
  preco_alvo: number | null;
  venda_valor: number | null;
  venda_data: string | null;
  nota: string | null;
};

export function FormItem({ item, hoje }: { item?: ItemForm; hoje: string }) {
  const [estado, acao, enviando] = useActionState(salvarItem, undefined);
  const [tipo, setTipo] = useState(item?.tipo ?? "revenda");
  const [situacao, setSituacao] = useState(item?.situacao ?? "comprado");
  const voltar = item?.id ? `/estoque/${item.id}` : "/estoque";

  return (
    <form action={acao} className="cartao max-w-2xl space-y-4">
      {item?.id && <input type="hidden" name="id" value={item.id} />}
      <Campo rotulo="Nome" name="nome" defaultValue={item?.nome} required placeholder="Ex.: Bicicleta Caloi aro 29" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Categoria" name="categoria" defaultValue={item?.categoria ?? ""} placeholder="Ex.: Eletrodoméstico" />
        <label className="block min-w-0">
          <span className="rotulo">Tipo</span>
          <select name="tipo" className="campo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="revenda">Revenda</option>
            <option value="capital">Capital próprio (já era meu)</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {tipo === "revenda" ? (
          <CampoReais rotulo="Paguei" name="compra_valor" defaultValue={paraCampo(item?.compra_valor ?? null)} />
        ) : (
          <input type="hidden" name="compra_valor" value="0" />
        )}
        <Campo rotulo="Data da compra" name="compra_data" type="date" defaultValue={item?.compra_data ?? hoje} />
        <Campo rotulo="Onde comprei" name="compra_local" defaultValue={item?.compra_local ?? ""} placeholder="Cidade/bairro" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CampoReais rotulo="Preço de anúncio" name="preco_alvo" defaultValue={paraCampo(item?.preco_alvo ?? null)} />
        <label className="block min-w-0">
          <span className="rotulo">Situação</span>
          <select
            name="situacao"
            className="campo"
            value={situacao}
            onChange={(e) => setSituacao(e.target.value as typeof situacao)}
          >
            <option value="comprado">Parado (comprado)</option>
            <option value="anunciado">Anunciado</option>
            <option value="vendido">Vendido</option>
          </select>
        </label>
      </div>

      {situacao === "vendido" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoReais rotulo="Vendi por" name="venda_valor" defaultValue={paraCampo(item?.venda_valor ?? null)} required />
          <Campo rotulo="Data da venda" name="venda_data" type="date" defaultValue={item?.venda_data ?? hoje} />
        </div>
      )}

      <label className="block">
        <span className="rotulo">Nota</span>
        <textarea name="nota" rows={3} className="campo" defaultValue={item?.nota ?? ""} placeholder="Defeitos, pendências, combinados…" />
      </label>

      {tipo === "capital" && (
        <p className="text-sm text-suave">
          Capital próprio não tem custo de compra. Os gastos saem do caixa e a venda entra no caixa, mas não conta como lucro.
        </p>
      )}

      <Mensagem estado={estado} />
      <div className="flex gap-2">
        <button className="botao-principal flex-1 sm:flex-none" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
        <Link href={voltar} className="botao-secundario">Cancelar</Link>
      </div>
    </form>
  );
}
