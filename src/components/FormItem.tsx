"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
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

function Secao({ titulo, dica, children }: { titulo: string; dica: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 p-4 md:p-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
      <div>
        <h2 className="titulo-secao">{titulo}</h2>
        <p className="mt-0.5 text-[13px] text-suave">{dica}</p>
      </div>
      <div className="grid content-start gap-3 sm:grid-cols-2 md:gap-4">{children}</div>
    </section>
  );
}

/** Opções lado a lado (rádio de verdade por baixo: o formulário envia igual a um select). */
function Escolha<T extends string>({
  rotulo,
  name,
  opcoes,
  valor,
  aoMudar,
  className = "",
}: {
  rotulo: string;
  name: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  className?: string;
}) {
  return (
    <fieldset className={`min-w-0 ${className}`}>
      <legend className="rotulo">{rotulo}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg border border-borda-forte bg-superficie-2 p-0.5">
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm font-semibold text-suave transition-[background-color,color,box-shadow] duration-150 select-none hover:text-texto has-checked:bg-superficie has-checked:text-texto has-checked:shadow-(--sombra) has-checked:ring-1 has-checked:ring-borda-forte has-focus-visible:outline-2 has-focus-visible:outline-grafico md:min-h-9"
          >
            <input
              type="radio"
              name={name}
              value={o.valor}
              checked={valor === o.valor}
              onChange={() => aoMudar(o.valor)}
              className="sr-only"
            />
            {o.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FormItem({ item, hoje }: { item?: ItemForm; hoje: string }) {
  const [estado, acao, enviando] = useActionState(salvarItem, undefined);
  const [tipo, setTipo] = useState(item?.tipo ?? "revenda");
  const [situacao, setSituacao] = useState(item?.situacao ?? "comprado");
  const voltar = item?.id ? `/estoque/${item.id}` : "/estoque";
  const revenda = tipo === "revenda";

  return (
    <form action={acao} className="cartao escalonado max-w-4xl divide-y divide-borda p-0">
      <Secao titulo="Item" dica="Nome e categoria aparecem na lista e na busca.">
        {item?.id && <input type="hidden" name="id" value={item.id} />}
        <Campo
          rotulo="Nome"
          name="nome"
          defaultValue={item?.nome}
          required
          placeholder="Ex.: Bicicleta Caloi aro 29"
          className="sm:col-span-2"
        />
        <Campo rotulo="Categoria" name="categoria" defaultValue={item?.categoria ?? ""} placeholder="Ex.: Eletrodoméstico" />
        <Escolha
          rotulo="Tipo"
          name="tipo"
          valor={tipo}
          aoMudar={setTipo}
          opcoes={[
            { valor: "revenda", rotulo: "Revenda" },
            { valor: "capital", rotulo: "Capital próprio" },
          ]}
        />
        {!revenda && (
          <p className="aparece rounded-lg bg-info-fundo px-3 py-2 text-[13px] text-info sm:col-span-2">
            Capital próprio é o que já era seu: não tem custo de compra. Os gastos saem do caixa e a venda entra no caixa,
            mas não conta como lucro.
          </p>
        )}
      </Secao>

      <Secao titulo="Compra" dica="Quanto pagou, quando e onde.">
        {revenda ? (
          <CampoReais rotulo="Paguei" name="compra_valor" defaultValue={paraCampo(item?.compra_valor ?? null)} />
        ) : (
          <input type="hidden" name="compra_valor" value="0" />
        )}
        <Campo rotulo="Data da compra" name="compra_data" type="date" defaultValue={item?.compra_data ?? hoje} />
        <Campo
          rotulo="Onde comprei"
          name="compra_local"
          defaultValue={item?.compra_local ?? ""}
          placeholder="Cidade/bairro"
          className={revenda ? "sm:col-span-2" : ""}
        />
      </Secao>

      <Secao titulo="Anúncio e venda" dica="Gastos e fotos você lança depois, na tela do item.">
        <Escolha
          rotulo="Situação"
          name="situacao"
          valor={situacao}
          aoMudar={setSituacao}
          className="sm:col-span-2"
          opcoes={[
            { valor: "comprado", rotulo: "Parado" },
            { valor: "anunciado", rotulo: "Anunciado" },
            { valor: "vendido", rotulo: "Vendido" },
          ]}
        />
        <CampoReais rotulo="Preço de anúncio" name="preco_alvo" defaultValue={paraCampo(item?.preco_alvo ?? null)} />
        {situacao === "vendido" && (
          <>
            <CampoReais
              rotulo="Vendi por"
              name="venda_valor"
              defaultValue={paraCampo(item?.venda_valor ?? null)}
              required
              className="entra"
            />
            <Campo rotulo="Data da venda" name="venda_data" type="date" defaultValue={item?.venda_data ?? hoje} className="entra" />
          </>
        )}
      </Secao>

      <Secao titulo="Nota" dica="Aparece em destaque na tela do item.">
        <label className="block sm:col-span-2">
          <span className="rotulo">Defeitos, pendências, combinados</span>
          <textarea name="nota" rows={3} className="campo" defaultValue={item?.nota ?? ""} placeholder="Ex.: falta a chave reserva" />
        </label>
      </Secao>

      {(estado?.erro || estado?.ok) && (
        <div className="px-4 py-3 md:px-6">
          <Mensagem estado={estado} />
        </div>
      )}

      <div className="flex gap-2 rounded-b-xl bg-superficie-2 px-4 py-3 sm:justify-end md:px-6">
        <Link href={voltar} className="botao-secundario">Cancelar</Link>
        <button className="botao-principal flex-1 sm:min-w-40 sm:flex-none" disabled={enviando}>
          {enviando ? "Salvando…" : item?.id ? "Salvar alterações" : "Cadastrar item"}
        </button>
      </div>
    </form>
  );
}
