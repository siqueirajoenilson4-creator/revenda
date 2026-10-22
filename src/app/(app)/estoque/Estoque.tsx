"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { reais } from "@/lib/formato";
import { Cabecalho, Segmentos } from "@/components/Cabecalho";
import { Icone, LUPA } from "@/components/IconesItem";
import { ItemAcoes, type ItemResumo } from "@/components/ItemAcoes";
import { Numero } from "@/components/Numero";
import { Miniatura, SeloDias, SeloSituacao } from "@/components/Selos";

export type LinhaEstoque = ItemResumo & {
  categoria: string | null;
  capa?: string;
  busca: string;
  venda_valor: number | null;
  venda_data: string | null;
  dias: number | null;
  lucro: number | null;
  lucroPrevisto: boolean;
};

const FILTROS = [
  { id: "estoque", rotulo: "No pátio", teste: (l: LinhaEstoque) => l.situacao !== "vendido" },
  { id: "parados", rotulo: "Parados", teste: (l: LinhaEstoque) => l.situacao === "comprado" },
  { id: "anunciados", rotulo: "Anunciados", teste: (l: LinhaEstoque) => l.situacao === "anunciado" },
  { id: "vendidos", rotulo: "Vendidos", teste: (l: LinhaEstoque) => l.situacao === "vendido" },
  { id: "todos", rotulo: "Todos", teste: () => true },
] as const;
type FiltroId = (typeof FILTROS)[number]["id"];

const VAZIO: Record<FiltroId, { titulo: string; texto: string }> = {
  estoque: { titulo: "Pátio vazio", texto: "Tudo foi vendido. Lance a próxima compra em + Novo item." },
  parados: { titulo: "Nenhum item parado", texto: "Tudo que está no pátio já foi anunciado." },
  anunciados: { titulo: "Nenhum item anunciado", texto: "Abra um item parado e toque em Anunciar." },
  vendidos: { titulo: "Nenhuma venda ainda", texto: "Quando fechar negócio, abra o item e toque em Vendi." },
  todos: { titulo: "Nenhum item ainda", texto: "Toque em + Novo item." },
};

const ORDENS = {
  dias: { rotulo: "Mais tempo parado", cmp: (a: LinhaEstoque, b: LinhaEstoque) => (b.dias ?? 0) - (a.dias ?? 0) },
  recentes: { rotulo: "Mais recentes", cmp: (a: LinhaEstoque, b: LinhaEstoque) => (a.dias ?? 0) - (b.dias ?? 0) },
  custo: { rotulo: "Maior custo", cmp: (a: LinhaEstoque, b: LinhaEstoque) => b.custo - a.custo },
  lucro: { rotulo: "Maior lucro", cmp: (a: LinhaEstoque, b: LinhaEstoque) => (b.lucro ?? -Infinity) - (a.lucro ?? -Infinity) },
  nome: { rotulo: "Nome (A–Z)", cmp: (a: LinhaEstoque, b: LinhaEstoque) => a.nome.localeCompare(b.nome, "pt-BR") },
};
type OrdemId = keyof typeof ORDENS;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function Lucro({ l, semMarca }: { l: LinhaEstoque; semMarca?: boolean }) {
  if (l.lucro == null)
    return <span className="text-[13px] font-normal text-suave">{l.tipo === "capital" ? "Entra no caixa" : "—"}</span>;
  return (
    <span className={l.lucro > 0 ? "text-bom" : "text-ruim"}>
      {reais(l.lucro, true)}
      {l.lucroPrevisto && !semMarca && <span className="ml-1 text-[11px] font-normal text-suave">prev.</span>}
    </span>
  );
}

const valorTela = (l: LinhaEstoque) => reais(l.situacao === "vendido" ? l.venda_valor : l.preco_alvo, true);

/** Faixa de números do que está no pátio (não vendido). */
function Resumo({ emEstoque }: { emEstoque: LinhaEstoque[] }) {
  const anuncio = emEstoque.reduce((s, l) => s + (l.preco_alvo ?? 0), 0);
  const previstos = emEstoque.filter((l) => l.lucroPrevisto);
  const previsto = previstos.reduce((s, l) => s + (l.lucro ?? 0), 0);
  const comDias = emEstoque.filter((l) => l.dias != null);
  const media = comDias.length ? Math.round(comDias.reduce((s, l) => s + l.dias!, 0) / comDias.length) : null;
  const parados30 = emEstoque.filter((l) => (l.dias ?? 0) > 30).length;
  const semPreco = emEstoque.filter((l) => l.preco_alvo == null).length;

  const celulas: { rotulo: string; valor: string; detalhe: string; tom?: string }[] = [
    {
      rotulo: "Anunciado por",
      valor: reais(anuncio, true),
      detalhe: semPreco ? `${plural(semPreco, "item", "itens")} sem preço` : "soma dos preços",
    },
    {
      rotulo: "Lucro previsto",
      valor: reais(previsto, true),
      detalhe: "se vender pelo anúncio",
      tom: previsto > 0 ? "text-bom" : previsto < 0 ? "text-ruim" : "",
    },
    { rotulo: "Tempo médio", valor: media == null ? "—" : plural(media, "dia", "dias"), detalhe: "parado no pátio" },
    {
      rotulo: "Mais de 30 dias",
      valor: String(parados30),
      detalhe: parados30 ? "hora de baixar o preço" : "nenhum encalhado",
      tom: parados30 ? "text-ruim" : "",
    },
  ];

  return (
    <section
      aria-label="Resumo do pátio"
      className="entra mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-borda bg-borda shadow-(--sombra) md:grid-cols-4"
    >
      {celulas.map((c) => (
        <div key={c.rotulo} className="min-w-0 bg-superficie px-3.5 py-3 md:px-4">
          <div className="sobrescrito truncate">{c.rotulo}</div>
          <Numero texto={c.valor} className={`numero mt-0.5 block truncate text-[22px] leading-tight md:text-[26px] ${c.tom ?? ""}`} />
          <div className="truncate text-[12px] text-suave">{c.detalhe}</div>
        </div>
      ))}
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
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function Valor({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-2">
      <dt className="sobrescrito truncate">{rotulo}</dt>
      <dd className="truncate text-[15px] font-semibold">{children}</dd>
    </div>
  );
}

export function Estoque({
  linhas,
  hoje,
  filtroInicial,
  buscaInicial,
}: {
  linhas: LinhaEstoque[];
  hoje: string;
  filtroInicial: string;
  buscaInicial: string;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroId>(
    (FILTROS.find((f) => f.id === filtroInicial)?.id ?? "estoque") as FiltroId,
  );
  const [busca, setBusca] = useState(buscaInicial);
  const [ordem, setOrdem] = useState<OrdemId>(filtro === "vendidos" ? "recentes" : "dias");
  const termo = useDeferredValue(busca.trim().toLocaleLowerCase("pt-BR"));

  // Mantém o filtro no endereço (voltar/compartilhar), sem recarregar a página.
  useEffect(() => {
    const p = new URLSearchParams();
    if (filtro !== "estoque") p.set("filtro", filtro);
    if (busca.trim()) p.set("q", busca.trim());
    const q = p.toString();
    window.history.replaceState(null, "", q ? `/estoque?${q}` : "/estoque");
  }, [filtro, busca]);

  const lista = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro)!;
    return linhas
      .filter((l) => f.teste(l) && (!termo || l.busca.includes(termo)))
      .sort(ORDENS[ordem].cmp);
  }, [linhas, filtro, termo, ordem]);

  const emEstoque = linhas.filter((l) => l.situacao !== "vendido");
  const empatado = emEstoque.reduce((s, l) => s + l.custo, 0);
  const filtroAtual = FILTROS.find((f) => f.id === filtro)!;

  const mudarFiltro = (v: FiltroId) => {
    setFiltro(v);
    setOrdem(v === "vendidos" ? "recentes" : "dias");
  };

  // Linha inteira abre o item; botões, links e o menu de ações cuidam do próprio clique.
  function abrir(e: MouseEvent, id: string) {
    if ((e.target as HTMLElement).closest("a, button") || window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey) window.open(`/estoque/${id}`, "_blank");
    else router.push(`/estoque/${id}`);
  }

  const novo = (
    <Link href="/estoque/novo" className="botao-principal">
      + Novo item
    </Link>
  );

  let vazio: ReactNode = null;
  if (linhas.length === 0)
    vazio = (
      <Vazio titulo="Nenhum item no pátio" texto="Calcule uma compra antes de fechar negócio ou cadastre direto o que já comprou.">
        <Link href="/calcular" className="botao-secundario">Calcular compra</Link>
        {novo}
      </Vazio>
    );
  else if (lista.length === 0 && termo)
    vazio = (
      <Vazio
        titulo={`Nada encontrado para “${busca.trim()}”`}
        texto={filtro === "todos" ? "Confira a grafia ou busque pela categoria ou pelo local." : `A busca olhou só em ${filtroAtual.rotulo}.`}
      >
        {filtro !== "todos" && (
          <button type="button" className="botao-secundario" onClick={() => mudarFiltro("todos")}>
            Buscar em Todos
          </button>
        )}
        <button type="button" className="botao-secundario" onClick={() => setBusca("")}>
          Limpar busca
        </button>
      </Vazio>
    );
  else if (lista.length === 0)
    vazio = (
      <Vazio {...VAZIO[filtro]}>{filtro === "estoque" && novo}</Vazio>
    );

  return (
    <>
      <Cabecalho
        sobre={`${plural(emEstoque.length, "item", "itens")} · ${reais(empatado, true)} empatados`}
        titulo="Pátio / Estoque"
        acoes={novo}
      />

      {linhas.length > 0 && <Resumo emEstoque={emEstoque} />}

      {linhas.length > 0 && (
        <div className="entra mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
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
            aoMudar={mudarFiltro}
          />
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1 xl:w-64 xl:flex-none">
              <span className="sr-only">Buscar no pátio</span>
              <Icone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave">{LUPA}</Icone>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                type="search"
                placeholder="Buscar item, categoria, local…"
                className="campo pl-9"
              />
            </label>
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as OrdemId)}
              className="campo w-auto shrink-0"
              aria-label="Ordenar"
            >
              {Object.entries(ORDENS).map(([id, o]) => (
                <option key={id} value={id}>{o.rotulo}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {vazio ?? (
        <>
          {/* Celular e telas médias: cartões */}
          <ul key={`c-${filtro}`} className="escalonado grid gap-3 lg:grid-cols-2 xl:hidden">
            {lista.map((l) => {
              const vendido = l.situacao === "vendido";
              return (
                <li key={l.id} className="cartao cartao-link flex flex-col p-0">
                  <Link href={`/estoque/${l.id}`} className="flex flex-1 flex-col rounded-t-xl">
                    <div className="flex gap-3 p-3.5">
                      <Miniatura src={l.capa} nome={l.nome} tamanho="size-16" />
                      <div className="min-w-0 flex-1">
                        <div className="leading-snug font-semibold break-words">{l.nome}</div>
                        {l.categoria && <div className="truncate text-[13px] text-suave">{l.categoria}</div>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <SeloSituacao situacao={l.situacao} capital={l.tipo === "capital"} />
                          <SeloDias dias={l.dias} vendido={vendido} />
                        </div>
                      </div>
                    </div>
                    <dl className="mt-auto grid grid-cols-3 divide-x divide-borda border-t border-borda">
                      <Valor rotulo="Custo">{reais(l.custo, true)}</Valor>
                      <Valor rotulo={vendido ? "Vendeu" : "Anúncio"}>{valorTela(l)}</Valor>
                      <Valor rotulo={vendido ? "Lucro" : "Lucro prev."}>
                        <Lucro l={l} semMarca />
                      </Valor>
                    </dl>
                  </Link>
                  <div className="border-t border-borda p-2">
                    <ItemAcoes item={l} hoje={hoje} compacto />
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Computador: tabela */}
          <div className="hidden rounded-xl border border-borda bg-superficie shadow-(--sombra) xl:block">
            {/* Bordas separadas: o fundo do hover fica nas células e respeita o canto arredondado. */}
            <table className="w-full border-separate border-spacing-0 text-[15px]">
              <thead className="text-left [&_th]:border-b [&_th]:border-borda">
                <tr>
                  <th className="sobrescrito py-2.5 pr-3 pl-4 font-semibold">Item</th>
                  <th className="sobrescrito px-3 py-2.5 font-semibold">Situação</th>
                  <th className="sobrescrito px-3 py-2.5 text-right font-semibold">Custo</th>
                  <th className="sobrescrito px-3 py-2.5 text-right font-semibold">Anúncio / venda</th>
                  <th className="sobrescrito px-3 py-2.5 text-right font-semibold">Lucro</th>
                  <th className="sobrescrito px-3 py-2.5 text-right font-semibold">Dias</th>
                  <th className="w-0 py-2.5 pr-3 pl-1">
                    <span className="sr-only">Ações</span>
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
                          <Link href={`/estoque/${l.id}`} className="block leading-snug font-semibold break-words hover:underline">
                            {l.nome}
                          </Link>
                          {l.categoria && <div className="truncate text-[13px] text-suave">{l.categoria}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <SeloSituacao situacao={l.situacao} capital={l.tipo === "capital"} />
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{reais(l.custo, true)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{valorTela(l)}</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                      <Lucro l={l} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <SeloDias dias={l.dias} vendido={l.situacao === "vendido"} />
                    </td>
                    {/* O menu e a folha de ação ficam aqui dentro: o clique não abre o item. */}
                    <td className="py-2 pr-3 pl-1" onClick={(e) => e.stopPropagation()}>
                      <ItemAcoes item={l} hoje={hoje} soMenu />
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
