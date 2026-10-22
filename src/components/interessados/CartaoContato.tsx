"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useEffectEvent,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  apagarContato,
  marcarRespondido,
  mudarSituacaoContato,
  registrarMensagem,
  type Resultado,
} from "@/app/acoes";
import { pctTexto, reais } from "@/lib/formato";
import {
  esperandoDemais,
  haQuanto,
  linkWhatsApp,
  minutosEsperando,
  quandoTexto,
  retornoVencido,
  SITUACOES_CONTATO,
  type Resposta,
  type SituacaoContato,
} from "@/lib/interessados";
import { Mensagem } from "@/components/Campos";
import { Icone } from "@/components/IconesItem";
import { Folha } from "@/components/ItemAcoes";
import { Miniatura, SeloCanal, SeloContato } from "@/components/Selos";
import { FormContato } from "./FormContato";
import { BALAO, BALOES, RELOGIO } from "./icones";
import { Opcoes } from "./Opcoes";
import { RespostasProntas } from "./RespostasProntas";
import type { ContatoTela, ItemOpcao } from "./tipos";
import { aoEnviar, primeiroNome } from "./uteis";

const MUDAR = SITUACOES_CONTATO.filter((s) => s.id !== "novo");
const MOSTRAR_MENSAGENS = 2;
const SO_ICONE =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-suave transition-[background-color,color] duration-150 hover:bg-superficie-2 hover:text-texto md:size-9";

type Vista = Pick<ContatoTela, "situacao" | "aguardando_desde">;

export function CartaoContato({
  c,
  item,
  itens,
  respostas,
  agora,
  destaque,
  aoMudar,
}: {
  c: ContatoTela;
  item?: ItemOpcao;
  /** Opções do formulário de edição. */
  itens: ItemOpcao[];
  respostas: Resposta[];
  agora: Date;
  destaque?: boolean;
  aoMudar?: (c: ContatoTela, de: SituacaoContato, para: SituacaoContato) => void;
}) {
  // Situação e espera mudam na hora; o servidor confirma em seguida.
  const [vista, ajustar] = useOptimistic<Vista, Partial<Vista>>(
    { situacao: c.situacao, aguardando_desde: c.aguardando_desde },
    (atual, mudanca) => ({ ...atual, ...mudanca }),
  );
  const [pendente, iniciar] = useTransition();
  const [emAndamento, setEmAndamento] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [painel, setPainel] = useState<"editar" | "respostas" | null>(null);
  const [anotar, setAnotar] = useState<"entrada" | "saida" | null>(null);
  const [apagar, setApagar] = useState(false);

  const atual = { ...c, ...vista };
  const espera = minutosEsperando(atual, agora);
  const demais = esperandoDemais(atual, agora);
  const zap = linkWhatsApp(c.telefone);
  const fechar = () => setPainel(null);

  function rodar(chave: string, otimista: Partial<Vista>, acao: () => Promise<Resultado>, depois?: () => void) {
    setErro(undefined);
    setEmAndamento(chave);
    iniciar(async () => {
      ajustar(otimista);
      const r = await acao();
      if (r?.erro) setErro(r.erro);
      else depois?.();
    });
  }

  const respondi = () => rodar("respondi", { aguardando_desde: null }, () => marcarRespondido(c.id));
  const mudar = (s: SituacaoContato) =>
    rodar(
      s,
      s === "comprou" || s === "perdido" ? { situacao: s, aguardando_desde: null } : { situacao: s },
      () => mudarSituacaoContato(c.id, s),
      () => aoMudar?.(c, c.situacao, s),
    );
  const rodando = (chave: string) => pendente && emAndamento === chave;

  return (
    <li
      id={`contato-${c.id}`}
      className={`cartao flex scroll-mt-20 flex-col p-0 transition-shadow duration-300 md:scroll-mt-8 ${
        destaque ? "ring-2 ring-grafico" : ""
      }`}
    >
      {espera != null && (
        <div
          className={`flex items-center gap-2 rounded-t-[11px] px-4 py-2 text-sm font-semibold ${
            demais ? "bg-ruim text-white" : "bg-atencao-fundo text-atencao"
          }`}
        >
          <Icone>{RELOGIO}</Icone>
          {espera < 1 ? "Chamou agora, esperando resposta" : `Esperando resposta ${haQuanto(espera)}`}
        </div>
      )}

      <div className="flex-1 space-y-3 pb-3">
        <div className="flex items-start gap-2 pt-3 pl-4 pr-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[17px] leading-tight font-bold" title={c.nome}>
              {c.nome}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <SeloCanal canal={c.canal} />
              <SeloContato situacao={vista.situacao} />
              {c.telefone && <span className="ml-1 text-[13px] text-suave">{c.telefone}</span>}
            </div>
          </div>
          <div className="-mt-1 flex shrink-0">
            {zap && (
              <a
                href={zap}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir conversa com ${c.nome} no WhatsApp`}
                title="Abrir no WhatsApp"
                className={`${SO_ICONE} text-canal-zap hover:bg-canal-zap-fundo hover:text-canal-zap`}
              >
                <Icone className="size-5">{BALAO}</Icone>
              </a>
            )}
            <Menu
              opcoes={[
                { rotulo: "Editar", aoEscolher: () => setPainel("editar") },
                { rotulo: "Anotar mensagem", aoEscolher: () => setAnotar(vista.aguardando_desde ? "saida" : "entrada") },
                { rotulo: "Apagar", aoEscolher: () => setApagar(true), perigo: true },
              ]}
            />
          </div>
        </div>

        <div className="px-4">
          {item ? (
            <Link
              href={`/estoque/${item.id}`}
              className="-mx-1.5 flex min-h-11 items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors duration-150 hover:bg-superficie-2"
            >
              <Miniatura src={item.capa} nome={item.nome} tamanho="size-9" />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{item.nome}</span>
              {item.vendido && <span className="sobrescrito shrink-0">Vendido</span>}
            </Link>
          ) : (
            <p className="text-sm text-suave">Sem item ligado</p>
          )}
        </div>

        <Numeros c={atual} item={item} agora={agora} aoDefinirRetorno={() => setPainel("editar")} />

        {c.proximo_passo && (
          <div className="px-4">
            <p className="sobrescrito">Próximo passo</p>
            <p className="text-[15px] leading-snug break-words">{c.proximo_passo}</p>
          </div>
        )}

        {c.mensagens.length > 0 && <Conversa c={c} agora={agora} />}
      </div>

      {apagar ? (
        <ConfirmarApagar nome={c.nome} id={c.id} aoCancelar={() => setApagar(false)} />
      ) : (
        <div className="space-y-2 border-t border-borda p-3">
          {anotar && (
            <FormMensagem key={anotar} contatoId={c.id} nome={primeiroNome(c.nome)} direcao={anotar} aoFechar={() => setAnotar(null)} />
          )}
          <div className="grid grid-cols-2 gap-2">
            {vista.aguardando_desde ? (
              <button type="button" className="botao-principal" disabled={rodando("respondi")} onClick={respondi}>
                {rodando("respondi") ? "Salvando…" : "Respondi"}
              </button>
            ) : (
              <button
                type="button"
                className="botao-secundario"
                aria-expanded={anotar === "entrada"}
                onClick={() => setAnotar((a) => (a ? null : "entrada"))}
              >
                Ele respondeu
              </button>
            )}
            <button type="button" className="botao-secundario" onClick={() => setPainel("respostas")}>
              <Icone>{BALOES}</Icone>
              Respostas
            </button>
          </div>

          <div
            role="group"
            aria-label="Mudar situação"
            className="grid grid-cols-4 gap-0.5 rounded-lg border border-borda-forte bg-superficie p-0.5"
          >
            {MUDAR.map((s) => {
              const on = vista.situacao === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  disabled={pendente}
                  onClick={() => !on && mudar(s.id)}
                  className={`min-h-11 min-w-0 truncate rounded-md px-1 text-[13px] transition-[background-color,color] duration-200 disabled:cursor-wait md:min-h-9 ${
                    on ? "bg-texto font-semibold text-superficie" : "font-medium text-suave hover:bg-superficie-2 hover:text-texto"
                  }`}
                >
                  {s.rotulo}
                </button>
              );
            })}
          </div>

          {vista.situacao === "comprou" && item && !item.vendido && (
            <div className="aparece flex items-center justify-between gap-3 rounded-lg bg-bom-fundo py-1.5 pr-1.5 pl-3 text-bom">
              <span className="text-sm font-semibold">Fechou negócio</span>
              <Link href={`/vendas/nova?item=${item.id}&contato=${c.id}`} className="botao-pequeno min-h-11 md:min-h-9">
                Registrar venda
              </Link>
            </div>
          )}

          <Mensagem estado={erro ? { erro } : undefined} />
        </div>
      )}

      {painel === "editar" && (
        <Folha titulo="Editar interessado" sobre={c.nome} aoFechar={fechar}>
          <FormContato
            contato={c}
            itens={itens.filter((i) => !i.vendido || i.id === c.item_id)}
            aoTerminar={fechar}
          />
        </Folha>
      )}
      {painel === "respostas" && (
        <Folha titulo="Respostas prontas" sobre={c.nome} aoFechar={fechar}>
          <RespostasProntas
            respostas={respostas}
            telefone={c.telefone}
            dados={{
              nome: primeiroNome(c.nome),
              item: item?.nome,
              preco: item?.preco != null ? reais(item.preco, true) : null,
              cidade: item?.cidade,
            }}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-borda pt-3">
            <Link href="/interessados/respostas" className="link inline-flex min-h-11 items-center text-sm md:min-h-9">
              Editar respostas
            </Link>
            {vista.aguardando_desde && (
              <button
                type="button"
                className="botao-secundario"
                onClick={() => {
                  fechar();
                  respondi();
                }}
              >
                Marcar como respondido
              </button>
            )}
          </div>
        </Folha>
      )}
    </li>
  );
}

function Valor({ rotulo, detalhe, tom, children }: { rotulo: string; detalhe?: ReactNode; tom?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-2 first:pl-4">
      <dt className="sobrescrito truncate">{rotulo}</dt>
      <dd className={`truncate text-[15px] font-semibold ${tom ?? ""}`}>{children}</dd>
      {detalhe && <dd className="truncate text-[12px] text-suave">{detalhe}</dd>}
    </div>
  );
}

/** Oferta contra o preço anunciado e o retorno combinado. */
function Numeros({
  c,
  item,
  agora,
  aoDefinirRetorno,
}: {
  c: ContatoTela;
  item?: ItemOpcao;
  agora: Date;
  aoDefinirRetorno: () => void;
}) {
  const preco = item?.preco ?? null;
  let comparacao: string | undefined;
  if (c.oferta != null && preco) {
    const d = (preco - c.oferta) / preco;
    comparacao = Math.abs(d) < 0.005 ? "no preço" : d > 0 ? `${pctTexto(d, 0)} abaixo` : `${pctTexto(-d, 0)} acima`;
  }
  const vencido = retornoVencido(c, agora);
  return (
    <dl className="grid grid-cols-3 divide-x divide-borda border-y border-borda">
      <Valor rotulo="Oferta" detalhe={comparacao}>
        {c.oferta != null ? reais(c.oferta, true) : <span className="font-normal text-suave">—</span>}
      </Valor>
      <Valor rotulo="Anunciado">{preco != null ? reais(preco, true) : <span className="font-normal text-suave">—</span>}</Valor>
      <Valor rotulo="Retorno" tom={vencido ? "text-ruim" : undefined} detalhe={vencido ? "passou da hora" : undefined}>
        {c.retorno_em ? (
          quandoTexto(c.retorno_em, agora)
        ) : c.situacao === "agendado" ? (
          <button type="button" className="link -my-2 inline-flex min-h-9 items-center text-[15px]" onClick={aoDefinirRetorno}>
            Definir
          </button>
        ) : (
          <span className="font-normal text-suave">—</span>
        )}
      </Valor>
    </dl>
  );
}

/** Mensagens anotadas: as últimas, com o resto a um toque. */
function Conversa({ c, agora }: { c: ContatoTela; agora: Date }) {
  const [todas, setTodas] = useState(false);
  const total = c.mensagens.length;
  const lista = todas ? c.mensagens : c.mensagens.slice(-MOSTRAR_MENSAGENS);
  const nome = primeiroNome(c.nome);
  return (
    <div className="px-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="sobrescrito">Conversa</p>
        {total > MOSTRAR_MENSAGENS && (
          <button
            type="button"
            className="link -my-2 inline-flex min-h-11 items-center text-[13px] md:min-h-9"
            aria-expanded={todas}
            onClick={() => setTodas((t) => !t)}
          >
            {todas ? "Mostrar só as últimas" : `Ver as ${total}`}
          </button>
        )}
      </div>
      <ol className="mt-1 space-y-1.5">
        {lista.map((m) => {
          const minutos = Math.max(0, Math.floor((agora.getTime() - new Date(m.enviada_em).getTime()) / 60_000));
          const dele = m.direcao === "entrada";
          return (
            <li key={m.id} className="flex gap-2.5 text-sm leading-snug">
              <span className={`w-16 shrink-0 truncate pt-px text-[12px] font-semibold ${dele ? "text-info" : "text-suave"}`}>
                {dele ? nome : "Você"}
              </span>
              <p className="min-w-0 flex-1 break-words">{m.texto}</p>
              <time dateTime={m.enviada_em} className="shrink-0 pt-px text-[12px] text-suave">
                {haQuanto(minutos)}
              </time>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FormMensagem({
  contatoId,
  nome,
  direcao,
  aoFechar,
}: {
  contatoId: string;
  nome: string;
  direcao: "entrada" | "saida";
  aoFechar: () => void;
}) {
  const [estado, acao, enviando] = useActionState(registrarMensagem, undefined);
  const id = useId();
  const fechar = useEffectEvent(aoFechar);
  useEffect(() => {
    if (estado?.ok) fechar();
  }, [estado]);
  return (
    <form onSubmit={aoEnviar(acao)} className="aparece space-y-2.5 rounded-lg border border-borda bg-superficie-2 p-3">
      <input type="hidden" name="contato_id" value={contatoId} />
      <Opcoes
        nome="direcao"
        legenda="Quem falou"
        colunas="grid-cols-2"
        inicial={direcao}
        opcoes={[
          { id: "entrada", rotulo: `${nome} mandou` },
          { id: "saida", rotulo: "Eu respondi" },
        ]}
      />
      <div>
        <label htmlFor={id} className="sr-only">
          Mensagem
        </label>
        <textarea
          id={id}
          name="texto"
          rows={2}
          required
          autoFocus
          maxLength={500}
          className="campo resize-y"
          placeholder="Ex.: perguntou se faz por R$ 200"
        />
        <p className="mt-1 text-[13px] leading-snug text-suave">
          Se ele mandou, fica esperando sua resposta. Se você respondeu, sai da espera.
        </p>
      </div>
      <Mensagem estado={estado} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="botao-secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button className="botao-principal" disabled={enviando}>
          {enviando ? "Anotando…" : "Anotar"}
        </button>
      </div>
    </form>
  );
}

function ConfirmarApagar({ id, nome, aoCancelar }: { id: string; nome: string; aoCancelar: () => void }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  return (
    <div className="aparece space-y-3 border-t border-borda rounded-b-[11px] bg-ruim-fundo p-3">
      <p className="text-[15px]">
        Apagar <strong>{nome}</strong>? As mensagens anotadas também somem. Não dá para desfazer.
      </p>
      <Mensagem estado={erro ? { erro } : undefined} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao-perigo"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await apagarContato(id);
              if (r?.erro) setErro(r.erro);
            })
          }
        >
          {pendente ? "Apagando…" : "Sim, apagar"}
        </button>
      </div>
    </div>
  );
}

const ITEM_MENU =
  "flex min-h-11 w-full items-center px-3 text-left text-[15px] font-medium transition-colors hover:bg-superficie-2 md:min-h-9 md:text-sm";

/** Menu "Mais" do cartão (fecha ao tocar fora ou apertar Esc). */
function Menu({ opcoes }: { opcoes: { rotulo: string; aoEscolher: () => void; perigo?: boolean }[] }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);
  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        className={`${SO_ICONE} ${aberto ? "bg-superficie-2 text-texto" : ""}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Mais ações"
        onClick={() => setAberto((x) => !x)}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {aberto && (
        <div
          role="menu"
          className="aparece absolute top-full right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-borda bg-superficie py-1 shadow-(--sombra-alta)"
        >
          {opcoes.map((o) => (
            <button
              key={o.rotulo}
              type="button"
              role="menuitem"
              className={`${ITEM_MENU} ${o.perigo ? "text-ruim" : ""}`}
              onClick={() => {
                setAberto(false);
                o.aoEscolher();
              }}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
