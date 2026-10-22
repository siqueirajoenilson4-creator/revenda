"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type { CanalAnuncio, SituacaoPublicacao } from "@/lib/anuncios";
import { reais } from "@/lib/formato";
import { rotuloCanal } from "@/lib/vendas";
import { Segmentos } from "@/components/Cabecalho";
import { Icone } from "@/components/IconesItem";
import { Miniatura, SeloCanal, SeloDias, SeloPublicacao } from "@/components/Selos";
import { ABRIR_FORA, DEPOIS } from "./icones";
import { BotaoRenovei } from "./Renovei";
import { quandoRenovar } from "./util";

export type LinhaAnuncio = {
  id: string;
  nome: string;
  categoria: string | null;
  capa?: string;
  preco: number | null;
  dias: number | null;
  temAnuncio: boolean;
  canais: { id: string; canal: CanalAnuncio; situacao: SituacaoPublicacao; renovar: boolean }[];
};

export type ParaRenovar = {
  id: string;
  itemId: string;
  nome: string;
  capa?: string;
  canal: CanalAnuncio;
  link: string | null;
  renovar_em: string;
};

const noAr = (l: LinhaAnuncio) => l.canais.some((c) => c.situacao === "publicado");

const FILTROS = [
  { id: "todos", rotulo: "Todos", teste: () => true },
  { id: "sem", rotulo: "Sem anúncio", teste: (l: LinhaAnuncio) => !noAr(l) },
  { id: "publicados", rotulo: "Publicados", teste: noAr },
  { id: "renovar", rotulo: "Renovar", teste: (l: LinhaAnuncio) => l.canais.some((c) => c.renovar) },
] as const;
type FiltroId = (typeof FILTROS)[number]["id"];

const VAZIO: Record<FiltroId, { titulo: string; texto: string }> = {
  todos: { titulo: "Nada no pátio", texto: "Cadastre o próximo item no Pátio para montar o anúncio." },
  sem: { titulo: "Tudo no ar", texto: "Todo item do pátio está publicado em algum canal." },
  publicados: { titulo: "Nenhum anúncio no ar", texto: "Abra um item e siga o passo a passo do Marketplace." },
  renovar: { titulo: "Nada para renovar", texto: "O Marketplace e os grupos pedem renovação a cada 7 dias." },
};

/** Situação por canal, em uma linha: "Marketplace PUBLICADO · OLX RASCUNHO". */
function SelosCanais({ l }: { l: LinhaAnuncio }) {
  if (!l.temAnuncio) return <span className="text-[13px] text-suave">Sem anúncio</span>;
  if (!l.canais.length) return <span className="text-[13px] text-suave">Anúncio não publicado</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {l.canais.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[12px] font-semibold text-suave">{rotuloCanal(c.canal)}</span>
          <SeloPublicacao situacao={c.situacao} />
          {c.renovar && <span className="text-[11px] font-bold tracking-[0.04em] text-atencao uppercase">Renovar</span>}
        </span>
      ))}
    </span>
  );
}

function RenovarHoje({ lista, hoje }: { lista: ParaRenovar[]; hoje: string }) {
  return (
    <section
      aria-labelledby="renovar-hoje"
      className="entra mb-5 overflow-hidden rounded-xl border border-borda bg-superficie shadow-(--sombra)"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-borda px-4 py-3 md:px-5">
        <h2 id="renovar-hoje" className="titulo-secao">
          Renovar hoje
        </h2>
        <span className="text-[13px] text-suave">Abra o anúncio, renove no site e toque em Renovei.</span>
      </div>
      <ul className="escalonado divide-y divide-borda">
        {lista.map((p) => {
          const quando = quandoRenovar(p.renovar_em, hoje);
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 md:px-5">
              <Miniatura src={p.capa} nome={p.nome} tamanho="size-11" />
              <div className="min-w-0 flex-1">
                <Link href={`/anuncios/${p.itemId}`} className="block truncate font-semibold hover:underline">
                  {p.nome}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                  <SeloCanal canal={p.canal} />
                  <span className="font-semibold text-atencao">{quando.texto}</span>
                </div>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="botao-pequeno min-h-11 flex-1 sm:flex-none md:min-h-9"
                  >
                    <Icone>{ABRIR_FORA}</Icone>
                    Abrir anúncio
                  </a>
                )}
                <BotaoRenovei id={p.id} className="botao-pequeno min-h-11 flex-1 sm:flex-none md:min-h-9" />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Vazio({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div className="cartao entra flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="mt-0.5 text-sm text-suave">{texto}</p>
      </div>
      {children}
    </div>
  );
}

export function ListaAnuncios({
  linhas,
  renovar,
  hoje,
  filtroInicial,
}: {
  linhas: LinhaAnuncio[];
  renovar: ParaRenovar[];
  hoje: string;
  filtroInicial: string;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroId>(FILTROS.find((f) => f.id === filtroInicial)?.id ?? "todos");

  // Filtro no endereço (voltar do editor cai no mesmo filtro).
  useEffect(() => {
    window.history.replaceState(null, "", filtro === "todos" ? "/anuncios" : `/anuncios?filtro=${filtro}`);
  }, [filtro]);

  const lista = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro)!;
    return linhas.filter(f.teste).sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0));
  }, [linhas, filtro]);

  function abrir(e: MouseEvent, id: string) {
    if ((e.target as HTMLElement).closest("a, button") || window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey) window.open(`/anuncios/${id}`, "_blank");
    else router.push(`/anuncios/${id}`);
  }

  let vazio: ReactNode = null;
  if (linhas.length === 0)
    vazio = (
      <Vazio {...VAZIO.todos}>
        <Link href="/estoque/novo" className="botao-principal">
          + Novo item
        </Link>
      </Vazio>
    );
  else if (lista.length === 0) vazio = <Vazio {...VAZIO[filtro]} />;

  return (
    <>
      {renovar.length > 0 && <RenovarHoje lista={renovar} hoje={hoje} />}

      {linhas.length > 0 && (
        <div className="entra mb-3">
          <Segmentos
            opcoes={FILTROS.map((f) => ({
              id: f.id,
              rotulo: (
                <>
                  {f.rotulo}
                  <span className="ml-1.5 text-xs font-normal tabular-nums">{linhas.filter(f.teste).length}</span>
                </>
              ),
            }))}
            valor={filtro}
            aoMudar={setFiltro}
          />
        </div>
      )}

      {vazio ?? (
        <>
          {/* Celular e telas médias: cartões */}
          <ul key={`c-${filtro}`} className="escalonado grid gap-3 md:grid-cols-2 lg:hidden">
            {lista.map((l) => (
              <li key={l.id} className="cartao cartao-link p-0">
                <Link href={`/anuncios/${l.id}`} className="flex h-full flex-col rounded-xl">
                  <div className="flex gap-3 p-3.5">
                    <Miniatura src={l.capa} nome={l.nome} tamanho="size-16" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 leading-snug font-semibold">{l.nome}</span>
                        <span className="numero shrink-0 text-lg leading-snug whitespace-nowrap">
                          {reais(l.preco, true)}
                        </span>
                      </div>
                      {l.categoria && <div className="truncate text-[13px] text-suave">{l.categoria}</div>}
                      <div className="mt-1.5">
                        <SeloDias dias={l.dias} vendido={false} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-borda px-3.5 py-2.5">
                    <SelosCanais l={l} />
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-link">
                      Abrir
                      <Icone>{DEPOIS}</Icone>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Computador: tabela */}
          <div className="hidden rounded-xl border border-borda bg-superficie shadow-(--sombra) lg:block">
            <table className="w-full border-separate border-spacing-0 text-[15px]">
              <thead className="text-left [&_th]:border-b [&_th]:border-borda">
                <tr>
                  <th className="sobrescrito py-2.5 pr-3 pl-4 font-semibold">Item</th>
                  <th className="sobrescrito px-3 py-2.5 font-semibold">Canais</th>
                  <th className="sobrescrito px-3 py-2.5 text-right font-semibold">Preço</th>
                  <th className="sobrescrito px-3 py-2.5 text-right font-semibold">Parado</th>
                  <th className="w-0 py-2.5 pr-4 pl-1">
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody
                key={`t-${filtro}`}
                className="escalonado [&>tr:last-child>td:first-child]:rounded-bl-[11px] [&>tr:last-child>td:last-child]:rounded-br-[11px]"
              >
                {lista.map((l) => (
                  <tr
                    key={l.id}
                    onClick={(e) => abrir(e, l.id)}
                    className="group/linha cursor-pointer [&>td]:border-b [&>td]:border-borda [&>td]:transition-colors [&>td]:duration-150 group-last/linha:[&>td]:border-0 hover:[&>td]:bg-superficie-2"
                  >
                    <td className="max-w-0 py-2 pr-3 pl-4">
                      <div className="flex items-center gap-3">
                        <Miniatura src={l.capa} nome={l.nome} tamanho="size-11" />
                        <div className="min-w-0">
                          <Link href={`/anuncios/${l.id}`} className="block truncate font-semibold hover:underline" title={l.nome}>
                            {l.nome}
                          </Link>
                          {l.categoria && <div className="truncate text-[13px] text-suave">{l.categoria}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <SelosCanais l={l} />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{reais(l.preco, true)}</td>
                    <td className="px-3 py-2 text-right">
                      <SeloDias dias={l.dias} vendido={false} />
                    </td>
                    <td className="py-2 pr-4 pl-1 text-right">
                      <Link href={`/anuncios/${l.id}`} className="botao-pequeno">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
