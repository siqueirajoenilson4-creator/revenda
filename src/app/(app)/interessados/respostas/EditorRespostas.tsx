"use client";

import { useActionState, useEffect, useEffectEvent, useId, useRef, useState, useTransition } from "react";
import { apagarResposta, salvarResposta } from "@/app/acoes";
import { preencherResposta, type Resposta } from "@/lib/interessados";
import { Cabecalho } from "@/components/Cabecalho";
import { Campo, Mensagem } from "@/components/Campos";
import { FECHAR, Icone, LIXEIRA } from "@/components/IconesItem";
import { aoEnviar } from "@/components/interessados/uteis";

const MARCADORES = [
  { chave: "{nome}", texto: "nome do interessado" },
  { chave: "{item}", texto: "nome do item" },
  { chave: "{preco}", texto: "preço do anúncio" },
  { chave: "{cidade}", texto: "cidade do anúncio" },
];
const EXEMPLO = { nome: "Carlos", item: "Rack de madeira", preco: "R$ 250", cidade: "Londrina" };
const MARCADOR = /(\{(?:nome|item|preco|cidade)\})/g;

/** Texto com os marcadores destacados. */
function ComMarcadores({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(MARCADOR).map((p, i) =>
        i % 2 ? (
          <span key={i} className="rounded bg-info-fundo px-1 font-semibold text-info">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function EditorRespostas({ respostas }: { respostas: Resposta[] }) {
  // id da resposta em edição, "nova" para criar ou null.
  const [editando, setEditando] = useState<string | null>(null);
  const fechar = () => setEditando(null);

  return (
    <>
      <Cabecalho
        sobre="Interessados"
        titulo="Respostas prontas"
        sub="Textos para copiar e colar no Marketplace, nos grupos e no WhatsApp."
        acoes={
          <button type="button" className="botao-principal" onClick={() => setEditando("nova")} disabled={editando === "nova"}>
            + Nova resposta
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0 space-y-3">
          {editando === "nova" && <FormResposta aoTerminar={fechar} />}
          {respostas.length === 0 && editando !== "nova" ? (
            <div className="cartao entra flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Nenhuma resposta pronta</p>
                <p className="mt-0.5 text-sm text-suave">Crie as que você mais manda: disponível, menor preço, onde retirar.</p>
              </div>
              <button type="button" className="botao-secundario" onClick={() => setEditando("nova")}>
                + Nova resposta
              </button>
            </div>
          ) : (
            <ul className="escalonado space-y-3">
              {respostas.map((r) =>
                editando === r.id ? (
                  <li key={r.id}>
                    <FormResposta resposta={r} aoTerminar={fechar} />
                  </li>
                ) : (
                  <li key={r.id} className="cartao md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="min-w-0 pt-2 leading-snug font-semibold break-words md:pt-1.5">{r.titulo}</h2>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="botao-pequeno min-h-11 md:min-h-9"
                          onClick={() => setEditando(r.id)}
                        >
                          Editar
                        </button>
                        <Apagar id={r.id} titulo={r.titulo} />
                      </div>
                    </div>
                    <p className="mt-1.5 text-[15px] leading-relaxed break-words whitespace-pre-line">
                      <ComMarcadores texto={r.texto} />
                    </p>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>

        <aside className="cartao entra md:p-5 lg:sticky lg:top-7">
          <h2 className="titulo-secao">Marcadores</h2>
          <p className="mt-1 text-sm leading-snug text-suave">
            Na hora de copiar, cada marcador vira o dado do interessado e do anúncio.
          </p>
          <dl className="mt-2 divide-y divide-borda text-[15px]">
            {MARCADORES.map((m) => (
              <div key={m.chave} className="flex items-center justify-between gap-3 py-2">
                <dt>
                  <span className="rounded bg-info-fundo px-1 font-semibold text-info">{m.chave}</span>
                </dt>
                <dd className="text-right text-suave">{m.texto}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[13px] leading-snug text-suave">
            Sem o dado (anúncio sem cidade, por exemplo), o marcador some sem deixar vírgula sobrando.
          </p>
        </aside>
      </div>
    </>
  );
}

function FormResposta({ resposta, aoTerminar }: { resposta?: Resposta; aoTerminar: () => void }) {
  const [estado, acao, enviando] = useActionState(salvarResposta, undefined);
  const [texto, setTexto] = useState(resposta?.texto ?? "");
  const area = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const terminar = useEffectEvent(aoTerminar);
  useEffect(() => {
    if (estado?.ok) terminar();
  }, [estado]);

  // Entra onde está o cursor (no celular, digitar chaves é chato).
  function inserir(marcador: string) {
    const el = area.current;
    const ini = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    setTexto(texto.slice(0, ini) + marcador + texto.slice(fim));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(ini + marcador.length, ini + marcador.length);
    });
  }

  return (
    <form onSubmit={aoEnviar(acao)} className="cartao aparece space-y-3 md:p-5">
      <h2 className="titulo-secao">{resposta ? "Editar resposta" : "Nova resposta"}</h2>
      {resposta && <input type="hidden" name="id" value={resposta.id} />}
      <Campo
        rotulo="Nome"
        name="titulo"
        defaultValue={resposta?.titulo}
        placeholder="Ex.: Ainda disponível"
        maxLength={60}
        autoComplete="off"
        required
        autoFocus={!resposta}
      />
      <div>
        <label htmlFor={id} className="rotulo">
          Texto
        </label>
        <textarea
          id={id}
          ref={area}
          name="texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          required
          autoFocus={Boolean(resposta)}
          className="campo min-h-28 resize-y leading-snug"
          placeholder="Oi, {nome}! Está disponível sim."
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[13px] text-suave">Inserir:</span>
          {MARCADORES.map((m) => (
            <button
              key={m.chave}
              type="button"
              className="botao-pequeno min-h-11 md:min-h-9"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inserir(m.chave)}
              title={m.texto}
            >
              {m.chave}
            </button>
          ))}
        </div>
      </div>
      {texto.trim() && (
        <div className="rounded-lg bg-superficie-2 px-3 py-2.5">
          <p className="sobrescrito">Exemplo</p>
          <p className="mt-0.5 text-[15px] leading-snug break-words whitespace-pre-line">{preencherResposta(texto, EXEMPLO)}</p>
        </div>
      )}
      <Mensagem estado={estado} />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button type="button" className="botao-secundario" onClick={aoTerminar}>
          Cancelar
        </button>
        <button className="botao-principal" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar resposta"}
        </button>
      </div>
    </form>
  );
}

const SO_ICONE =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-suave transition-[background-color,color,scale] duration-150 active:scale-[0.94] md:size-9";

/** Apagar em dois toques: lixeira → "Apagar". */
function Apagar({ id, titulo }: { id: string; titulo: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  if (!confirmar)
    return (
      <button
        type="button"
        aria-label={`Apagar resposta ${titulo}`}
        title="Apagar"
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
        title={erro}
        className="botao-pequeno min-h-11 border-ruim/40 text-ruim md:min-h-9"
        onClick={() =>
          iniciar(async () => {
            const r = await apagarResposta(id);
            if (r?.erro) setErro(r.erro);
          })
        }
      >
        {pendente ? "Apagando…" : erro ? "Tentar de novo" : "Apagar"}
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
