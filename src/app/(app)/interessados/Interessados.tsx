"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { mudarSituacaoContato } from "@/app/acoes";
import {
  ativo,
  esperandoDemais,
  haQuanto,
  minutosEsperando,
  quandoTexto,
  retornoVencido,
  type Resposta,
  type SituacaoContato,
} from "@/lib/interessados";
import { Cabecalho, Segmentos } from "@/components/Cabecalho";
import { FECHAR, Icone } from "@/components/IconesItem";
import { Folha } from "@/components/ItemAcoes";
import { CartaoContato } from "@/components/interessados/CartaoContato";
import { FormContato } from "@/components/interessados/FormContato";
import { ALERTA, CALENDARIO, CERTO_CIRCULO, SETA } from "@/components/interessados/icones";
import type { ContatoTela, ItemOpcao } from "@/components/interessados/tipos";
import { useAgora } from "@/components/interessados/uteis";

const FILTROS = [
  { id: "ativos", rotulo: "Ativos", teste: (c: ContatoTela) => ativo(c) },
  { id: "esperando", rotulo: "Esperando", teste: (c: ContatoTela) => ativo(c) && c.aguardando_desde != null },
  { id: "agendados", rotulo: "Agendados", teste: (c: ContatoTela) => c.situacao === "agendado" },
  { id: "encerrados", rotulo: "Encerrados", teste: (c: ContatoTela) => !ativo(c) },
  { id: "todos", rotulo: "Todos", teste: () => true },
] as const;
type FiltroId = (typeof FILTROS)[number]["id"];

const VAZIO: Record<FiltroId, { titulo: string; texto: string }> = {
  ativos: { titulo: "Nenhuma conversa em andamento", texto: "Quem chamar sobre um item, registre em + Interessado." },
  esperando: { titulo: "Ninguém esperando resposta", texto: "Tudo respondido. Quando alguém mandar mensagem, toque em Ele respondeu." },
  agendados: { titulo: "Nenhuma visita agendada", texto: "Marque Agendado no cartão e coloque dia e hora no retorno." },
  encerrados: { titulo: "Nenhuma conversa encerrada", texto: "Quem comprou ou desistiu aparece aqui." },
  todos: { titulo: "Nenhum interessado ainda", texto: "Registre em + Interessado." },
};

type Aviso = { id: number; texto: string; link?: { href: string; rotulo: string }; desfazer?: () => void };

export function Interessados({
  contatos,
  itens,
  respostas,
  agoraServidor,
  filtroInicial,
  itemInicial,
  abrirNovo,
}: {
  /** Já na ordem de ordenarContatos (feita no servidor). */
  contatos: ContatoTela[];
  itens: ItemOpcao[];
  respostas: Resposta[];
  agoraServidor: string;
  filtroInicial: string;
  itemInicial: string;
  abrirNovo: boolean;
}) {
  const agora = useAgora(agoraServidor);
  const [filtro, setFiltro] = useState<FiltroId>(FILTROS.find((f) => f.id === filtroInicial)?.id ?? "ativos");
  const [itemId, setItemId] = useState(itemInicial);
  const [novo, setNovo] = useState(abrirNovo);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  const porId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);
  const doItem = useMemo(() => contatos.filter((c) => !itemId || c.item_id === itemId), [contatos, itemId]);
  const filtroAtual = FILTROS.find((f) => f.id === filtro)!;
  const lista = doItem.filter(filtroAtual.teste);

  // Filtro no endereço (voltar/compartilhar) sem recarregar; o "novo" sai depois de aberto.
  useEffect(() => {
    const p = new URLSearchParams();
    if (filtro !== "ativos") p.set("filtro", filtro);
    if (itemId) p.set("item", itemId);
    const q = p.toString();
    window.history.replaceState(null, "", q ? `/interessados?${q}` : "/interessados");
  }, [filtro, itemId]);

  // Vindo de um aviso do topo: rola até o cartão e destaca por um instante.
  useEffect(() => {
    if (!alvo) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`contato-${alvo}`)?.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "center" });
    const t = setTimeout(() => setAlvo(null), 1800);
    return () => clearTimeout(t);
  }, [alvo]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.link || aviso.desfazer ? 9000 : 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  function irPara(id: string) {
    if (!lista.some((c) => c.id === id)) {
      setFiltro("ativos");
      setItemId("");
    }
    setAlvo(id);
  }

  function aoMudar(c: ContatoTela, de: SituacaoContato, para: SituacaoContato) {
    const item = c.item_id ? porId.get(c.item_id) : undefined;
    if (para === "comprou")
      setAviso({
        id: Date.now(),
        texto: `${c.nome} comprou${item ? ` ${item.nome}` : ""}.`,
        link: item && !item.vendido ? { href: `/vendas/nova?item=${item.id}&contato=${c.id}`, rotulo: "Registrar venda" } : undefined,
      });
    else if (para === "perdido" && filtro !== "encerrados" && filtro !== "todos")
      setAviso({
        id: Date.now(),
        texto: `${c.nome} foi para Encerrados.`,
        desfazer: () => iniciar(async () => void (await mudarSituacaoContato(c.id, de))),
      });
  }

  const esperando = contatos.filter((c) => minutosEsperando(c, agora) != null).length;
  const atrasados = contatos.filter((c) => esperandoDemais(c, agora));
  const vencidos = contatos.filter((c) => !atrasados.includes(c) && retornoVencido(c, agora));
  const nomeItem = (c: ContatoTela) => (c.item_id ? porId.get(c.item_id)?.nome : undefined);

  // No filtro de item só entram os itens que têm interessado (e o escolhido pelo endereço).
  const itensFiltro = useMemo(() => {
    const conta = new Map<string, number>();
    for (const c of contatos) if (c.item_id) conta.set(c.item_id, (conta.get(c.item_id) ?? 0) + 1);
    return itens
      .filter((i) => conta.has(i.id) || i.id === itemId)
      .map((i) => ({ ...i, total: conta.get(i.id) ?? 0 }));
  }, [contatos, itens, itemId]);
  const itemFiltrado = itemId ? porId.get(itemId) : undefined;
  const opcoesNovo = itens.filter((i) => !i.vendido);

  const botaoNovo = (
    <button type="button" className="botao-principal" onClick={() => setNovo(true)}>
      + Interessado
    </button>
  );

  let vazio: ReactNode = null;
  if (contatos.length === 0)
    vazio = (
      <Vazio
        titulo="Nenhum interessado ainda"
        texto="Quando alguém chamar no Marketplace, nos grupos ou no WhatsApp, registre aqui: nome, por onde chamou e quanto ofereceu. Leva 10 segundos."
      >
        {botaoNovo}
      </Vazio>
    );
  else if (lista.length === 0 && itemFiltrado)
    vazio = (
      <Vazio
        titulo={doItem.length ? `Nada em ${filtroAtual.rotulo} para este item` : "Ninguém chamou sobre este item ainda"}
        texto={doItem.length ? "Veja os outros filtros ou todos os itens." : "Quando alguém chamar, registre em + Interessado."}
      >
        <button type="button" className="botao-secundario" onClick={() => setItemId("")}>
          Ver todos os itens
        </button>
        {!doItem.length && botaoNovo}
      </Vazio>
    );
  else if (lista.length === 0) vazio = <Vazio {...VAZIO[filtro]}>{filtro === "ativos" && botaoNovo}</Vazio>;

  return (
    <>
      <Cabecalho
        sobre={esperando ? `${esperando} esperando resposta` : "Ninguém esperando resposta"}
        titulo="Interessados"
        acoes={
          <>
            <Link href="/interessados/respostas" className="botao-secundario">
              Respostas prontas
            </Link>
            {botaoNovo}
          </>
        }
      />

      {(atrasados.length > 0 || vencidos.length > 0) && (
        <div className={`entra mb-4 grid gap-3 ${atrasados.length && vencidos.length ? "lg:grid-cols-2" : ""}`}>
          {atrasados.length > 0 && (
            <Alerta
              tom="ruim"
              icone={ALERTA}
              titulo={`${atrasados.length} esperando resposta há mais de 2 h`}
              linhas={atrasados.map((c) => ({
                id: c.id,
                nome: c.nome,
                item: nomeItem(c),
                quando: haQuanto(minutosEsperando(c, agora) ?? 0),
              }))}
              aoAbrir={irPara}
            />
          )}
          {vencidos.length > 0 && (
            <Alerta
              tom="atencao"
              icone={CALENDARIO}
              titulo={vencidos.length === 1 ? "1 retorno passou da hora" : `${vencidos.length} retornos passaram da hora`}
              linhas={vencidos.map((c) => ({
                id: c.id,
                nome: c.nome,
                item: nomeItem(c),
                quando: quandoTexto(c.retorno_em!, agora),
              }))}
              aoAbrir={irPara}
            />
          )}
        </div>
      )}

      {contatos.length > 0 && (
        <div className="entra mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <Segmentos
            opcoes={FILTROS.map((f) => ({
              id: f.id,
              rotulo: (
                <>
                  {f.rotulo}
                  <span className="ml-1.5 text-xs font-normal tabular-nums">{doItem.filter(f.teste).length}</span>
                </>
              ),
            }))}
            valor={filtro}
            aoMudar={setFiltro}
          />
          {itensFiltro.length > 0 && (
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="campo lg:w-72"
              aria-label="Filtrar por item"
            >
              <option value="">Todos os itens</option>
              {itensFiltro.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome} · {i.total}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {vazio ?? (
        <ul key={`${filtro}-${itemId}`} className="escalonado grid gap-3 xl:grid-cols-2 xl:items-start">
          {lista.map((c) => (
            <CartaoContato
              key={c.id}
              c={c}
              item={c.item_id ? porId.get(c.item_id) : undefined}
              itens={itens}
              respostas={respostas}
              agora={agora}
              destaque={alvo === c.id}
              aoMudar={aoMudar}
            />
          ))}
        </ul>
      )}

      {novo && (
        <Folha titulo="Novo interessado" sobre={itemFiltrado?.nome} aoFechar={() => setNovo(false)}>
          <FormContato
            itens={opcoesNovo}
            itemId={itemFiltrado && !itemFiltrado.vendido ? itemFiltrado.id : undefined}
            aoTerminar={() => {
              setNovo(false);
              setAviso({ id: Date.now(), texto: "Interessado registrado." });
            }}
          />
        </Folha>
      )}

      {aviso && <Toast key={aviso.id} aviso={aviso} aoFechar={() => setAviso(null)} />}
    </>
  );
}

function Vazio({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div className="cartao entra flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="mt-0.5 text-sm text-suave">{texto}</p>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const TOM_ALERTA = {
  ruim: { caixa: "border-ruim/30 bg-ruim-fundo", texto: "text-ruim" },
  atencao: { caixa: "border-atencao/30 bg-atencao-fundo", texto: "text-atencao" },
};

/** Quem precisa de você agora: toque leva ao cartão. */
function Alerta({
  tom,
  icone,
  titulo,
  linhas,
  aoAbrir,
}: {
  tom: keyof typeof TOM_ALERTA;
  icone: ReactNode;
  titulo: string;
  linhas: { id: string; nome: string; item?: string; quando: string }[];
  aoAbrir: (id: string) => void;
}) {
  const t = TOM_ALERTA[tom];
  return (
    <section aria-label={titulo} className={`rounded-xl border px-4 py-3 ${t.caixa}`}>
      <h2 className={`flex items-center gap-2 text-sm font-bold ${t.texto}`}>
        <Icone className="size-[18px]">{icone}</Icone>
        {titulo}
      </h2>
      <ul className="-mx-2 mt-1">
        {linhas.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => aoAbrir(l.id)}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-superficie/60 md:min-h-9"
            >
              <span className="min-w-0 flex-1 truncate text-[15px]">
                <span className="font-semibold">{l.nome}</span>
                {l.item && <span className="text-suave"> · {l.item}</span>}
              </span>
              <span className={`shrink-0 text-sm font-semibold ${t.texto}`}>{l.quando}</span>
              <Icone className={`size-4 shrink-0 ${t.texto}`}>{SETA}</Icone>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Aviso flutuante depois de uma ação (com atalho ou desfazer quando faz sentido). */
function Toast({ aviso, aoFechar }: { aviso: Aviso; aoFechar: () => void }) {
  return (
    <div
      role="status"
      className="entra fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 rounded-xl bg-lateral py-2 pr-1.5 pl-4 text-white shadow-(--sombra-alta) md:inset-x-auto md:right-8 md:bottom-8 md:w-[26rem]"
    >
      <Icone className="size-[18px] shrink-0 text-lateral-texto">{CERTO_CIRCULO}</Icone>
      <p className="min-w-0 flex-1 py-1.5 text-[15px] leading-snug font-semibold">{aviso.texto}</p>
      {aviso.link && (
        <Link
          href={aviso.link.href}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-marca px-3 text-sm font-bold text-marca-texto transition-colors hover:bg-marca-forte md:min-h-9"
        >
          {aviso.link.rotulo}
        </Link>
      )}
      {aviso.desfazer && (
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-bold text-white transition-colors hover:bg-lateral-ativo md:min-h-9"
          onClick={() => {
            aviso.desfazer!();
            aoFechar();
          }}
        >
          Desfazer
        </button>
      )}
      <button
        type="button"
        aria-label="Fechar aviso"
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-lateral-texto transition-colors hover:bg-lateral-ativo hover:text-white md:size-9"
        onClick={aoFechar}
      >
        <Icone>{FECHAR}</Icone>
      </button>
    </div>
  );
}
