"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { salvarAnuncio } from "@/app/acoes";
import { ENTREGAS, ESTADOS, gerarAnuncio, LIMITE_TITULO, type Entrega, type EstadoConservacao } from "@/lib/anuncios";
import { Campo, CampoReais, Mensagem } from "@/components/Campos";
import type { CamposAnuncio, ItemAnuncio } from "./util";

function Escolha({
  rotulo,
  name,
  valor,
  aoMudar,
  opcoes,
}: {
  rotulo: string;
  name: string;
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: readonly { id: string; rotulo: string }[];
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <select id={id} name={name} value={valor} onChange={(e) => aoMudar(e.target.value)} className="campo">
        <option value="">Escolha</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Confirmação na própria tela antes de trocar o texto que ele já escreveu. */
function Substituir({ aoConfirmar, aoCancelar }: { aoConfirmar: () => void; aoCancelar: () => void }) {
  return (
    <div role="alertdialog" aria-label="Substituir texto" className="aparece mt-3 space-y-2.5 rounded-lg border border-borda-forte bg-superficie p-3">
      <p className="text-[15px]">Já tem título e descrição. Trocar pelo texto gerado?</p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>
          Manter o meu
        </button>
        <button type="button" className="botao-secundario" onClick={aoConfirmar} autoFocus>
          Substituir
        </button>
      </div>
    </div>
  );
}

export function TextoAnuncio({
  item,
  campos,
  mudar,
  alterado,
}: {
  item: ItemAnuncio;
  campos: CamposAnuncio;
  mudar: (parcial: Partial<CamposAnuncio>) => void;
  /** Há mudança na tela que ainda não foi salva. */
  alterado: boolean;
}) {
  const [estado, acao, salvando] = useActionState(salvarAnuncio, undefined);
  const [, iniciar] = useTransition();
  const [ponto, setPonto] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [gerado, setGerado] = useState(false);
  const idTitulo = useId();
  const idDescricao = useId();

  const limite = campos.titulo.length > LIMITE_TITULO;
  // O título criado ao marcar "Anunciado" é só o nome do item: trocar não perde nada.
  const temTexto = campos.descricao.trim() !== "" || (campos.titulo.trim() !== "" && campos.titulo.trim() !== item.nome.trim());

  function aplicar() {
    const g = gerarAnuncio({
      nome: item.nome,
      estado: campos.estado || null,
      pontoForte: ponto,
      gastos: item.gastos,
      cidade: campos.cidade,
      entrega: campos.entrega || null,
      aceitaTroca: campos.aceitaTroca,
    });
    mudar(g);
    setConfirmar(false);
    setGerado(true);
    const campo = document.getElementById(idTitulo);
    campo?.focus({ preventScroll: true });
    campo?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section aria-labelledby="texto-anuncio" className="cartao md:p-5">
      <div className="mb-4">
        <h2 id="texto-anuncio" className="titulo-secao">
          Texto do anúncio
        </h2>
        <p className="mt-0.5 text-[13px] text-suave">Preencha os dados, gere o texto e revise antes de salvar.</p>
      </div>

      {/* Sem o reset automático do <form action>: os campos são controlados e ficam como estão. */}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const dados = new FormData(e.currentTarget);
          iniciar(() => acao(dados));
        }}
      >
        <input type="hidden" name="item_id" value={item.id} />

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoReais rotulo="Preço" name="preco" value={campos.preco} onChange={(e) => mudar({ preco: e.target.value })} required />
          <Campo
            rotulo="Categoria"
            name="categoria"
            value={campos.categoria}
            onChange={(e) => mudar({ categoria: e.target.value })}
            placeholder="Ex.: Motos, Móveis, Eletrônicos"
          />
          <Escolha
            rotulo="Estado de conservação"
            name="estado_conservacao"
            valor={campos.estado}
            aoMudar={(v) => mudar({ estado: v as EstadoConservacao | "" })}
            opcoes={ESTADOS}
          />
          <Escolha
            rotulo="Entrega"
            name="entrega"
            valor={campos.entrega}
            aoMudar={(v) => mudar({ entrega: v as Entrega | "" })}
            opcoes={ENTREGAS}
          />
          <Campo
            rotulo="Cidade / bairro"
            name="cidade"
            value={campos.cidade}
            onChange={(e) => mudar({ cidade: e.target.value })}
            placeholder="Cambé"
            autoComplete="off"
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-lg border border-borda-forte bg-superficie px-3 transition-colors hover:bg-superficie-2 md:min-h-10">
            <input
              type="checkbox"
              name="aceita_troca"
              checked={campos.aceitaTroca}
              onChange={(e) => mudar({ aceitaTroca: e.target.checked })}
              className="size-5 shrink-0 accent-marca"
            />
            <span className="text-[15px] font-semibold">Aceita troca</span>
          </label>
        </div>

        <div className="rounded-lg border border-borda bg-superficie-2 p-3 md:p-4">
          <h3 className="sobrescrito">Gerar texto</h3>
          <p className="mt-0.5 mb-3 text-[13px] text-suave">
            Usa o estado, o ponto forte, o que foi feito no item{item.gastos.length ? ` (${item.gastos.length} gastos lançados)` : ""} e a entrega.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Campo
              rotulo="Ponto forte"
              value={ponto}
              onChange={(e) => setPonto(e.target.value)}
              placeholder="Ex.: documento em dia, pouco uso"
              className="flex-1"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (temTexto) setConfirmar(true);
                  else aplicar();
                }
              }}
            />
            <button
              type="button"
              className="botao-secundario shrink-0"
              onClick={() => (temTexto ? setConfirmar(true) : aplicar())}
            >
              Gerar título e descrição
            </button>
          </div>
          {confirmar && <Substituir aoConfirmar={aplicar} aoCancelar={() => setConfirmar(false)} />}
          {gerado && !confirmar && (
            <p role="status" className="aparece mt-2 text-[13px] font-semibold text-bom">
              Texto gerado. Revise o título e a descrição e salve.
            </p>
          )}
        </div>

        <Campo
          id={idTitulo}
          rotulo="Título"
          name="titulo"
          value={campos.titulo}
          onChange={(e) => mudar({ titulo: e.target.value })}
          placeholder={item.nome}
          required
          autoComplete="off"
          dica={
            <span className={limite ? "font-semibold text-ruim" : ""}>
              {campos.titulo.length} de {LIMITE_TITULO} caracteres{limite ? " · pode ser cortado no site" : ""}
            </span>
          }
        />

        <div>
          <label htmlFor={idDescricao} className="rotulo">
            Descrição
          </label>
          <textarea
            id={idDescricao}
            name="descricao"
            rows={11}
            value={campos.descricao}
            onChange={(e) => mudar({ descricao: e.target.value })}
            placeholder="O que é, estado, o que foi feito, retirada ou entrega, se aceita troca."
            className="campo min-h-56 resize-y leading-relaxed"
          />
        </div>

        {/* "Salvo" some quando ele volta a mexer; erro fica até a próxima tentativa. */}
        <Mensagem estado={estado?.erro || !alterado ? estado : undefined} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] text-suave" aria-live="polite">
            {alterado ? "Mudanças não salvas." : ""}
          </span>
          <button className="botao-principal w-full sm:w-auto" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar anúncio"}
          </button>
        </div>
      </form>
    </section>
  );
}
