"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { reais } from "@/lib/formato";
import { Cabecalho, Segmentos } from "@/components/Cabecalho";
import { ItemAcoes, type ItemResumo } from "@/components/ItemAcoes";
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
  { id: "estoque", rotulo: "Em estoque", teste: (l: LinhaEstoque) => l.situacao !== "vendido" },
  { id: "parados", rotulo: "Parados", teste: (l: LinhaEstoque) => l.situacao === "comprado" },
  { id: "anunciados", rotulo: "Anunciados", teste: (l: LinhaEstoque) => l.situacao === "anunciado" },
  { id: "vendidos", rotulo: "Vendidos", teste: (l: LinhaEstoque) => l.situacao === "vendido" },
  { id: "todos", rotulo: "Todos", teste: () => true },
] as const;
type FiltroId = (typeof FILTROS)[number]["id"];

const ORDENS = {
  dias: { rotulo: "Mais tempo parado", cmp: (a: LinhaEstoque, b: LinhaEstoque) => (b.dias ?? 0) - (a.dias ?? 0) },
  recentes: { rotulo: "Mais recentes", cmp: (a: LinhaEstoque, b: LinhaEstoque) => (a.dias ?? 0) - (b.dias ?? 0) },
  custo: { rotulo: "Maior custo", cmp: (a: LinhaEstoque, b: LinhaEstoque) => b.custo - a.custo },
  lucro: { rotulo: "Maior lucro", cmp: (a: LinhaEstoque, b: LinhaEstoque) => (b.lucro ?? -Infinity) - (a.lucro ?? -Infinity) },
  nome: { rotulo: "Nome (A–Z)", cmp: (a: LinhaEstoque, b: LinhaEstoque) => a.nome.localeCompare(b.nome, "pt-BR") },
};
type OrdemId = keyof typeof ORDENS;

function Lucro({ l }: { l: LinhaEstoque }) {
  if (l.lucro == null) return <span className="text-suave">{l.tipo === "capital" ? "capital" : "—"}</span>;
  return (
    <span className={l.lucro > 0 ? "text-bom" : "text-ruim"}>
      {reais(l.lucro, true)}
      {l.lucroPrevisto && <span className="ml-1 text-[11px] font-normal text-suave">prev.</span>}
    </span>
  );
}

const valorTela = (l: LinhaEstoque) => reais(l.situacao === "vendido" ? l.venda_valor : l.preco_alvo, true);

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
  const totais = {
    qtd: emEstoque.length,
    custo: emEstoque.reduce((s, l) => s + l.custo, 0),
    anuncio: emEstoque.reduce((s, l) => s + (l.preco_alvo ?? 0), 0),
    parados30: emEstoque.filter((l) => (l.dias ?? 0) > 30).length,
  };

  return (
    <>
      <Cabecalho
        titulo="Estoque"
        sub={`${totais.qtd} ${totais.qtd === 1 ? "item" : "itens"} em estoque`}
        acoes={<Link href="/estoque/novo" className="botao-principal">+ Novo item</Link>}
      />

      <section className="mb-4 grid grid-cols-3 divide-x divide-borda rounded-xl border border-borda bg-superficie">
        <div className="px-3 py-3 md:px-4">
          <div className="text-xs text-suave">Custo em estoque</div>
          <div className="text-base font-semibold tabular-nums md:text-lg">{reais(totais.custo, true)}</div>
        </div>
        <div className="px-3 py-3 md:px-4">
          <div className="text-xs text-suave">Valor anunciado</div>
          <div className="text-base font-semibold tabular-nums md:text-lg">{reais(totais.anuncio, true)}</div>
        </div>
        <div className="px-3 py-3 md:px-4">
          <div className="text-xs text-suave">Parados +30 dias</div>
          <div className={`text-base font-semibold tabular-nums md:text-lg ${totais.parados30 ? "text-ruim" : ""}`}>
            {totais.parados30}
          </div>
        </div>
      </section>

      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Segmentos
          opcoes={FILTROS.map((f) => ({
            id: f.id,
            rotulo: (
              <>
                {f.rotulo} <span className="ml-0.5 tabular-nums text-suave">{linhas.filter(f.teste).length}</span>
              </>
            ),
          }))}
          valor={filtro}
          aoMudar={(v) => {
            setFiltro(v);
            setOrdem(v === "vendidos" ? "recentes" : "dias");
          }}
        />
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 md:w-64">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              type="search"
              placeholder="Buscar item, categoria, local…"
              className="campo pl-9"
              aria-label="Buscar no estoque"
            />
          </div>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as OrdemId)}
            className="campo w-auto"
            aria-label="Ordenar"
          >
            {Object.entries(ORDENS).map(([id, o]) => (
              <option key={id} value={id}>{o.rotulo}</option>
            ))}
          </select>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="cartao py-12 text-center text-sm text-suave">
          {linhas.length === 0 ? (
            <>
              Nenhum item ainda.{" "}
              <Link href="/calcular" className="font-medium text-marca hover:underline">Calcule uma compra</Link> ou use “+ Novo item”.
            </>
          ) : (
            "Nada encontrado com esse filtro."
          )}
        </div>
      ) : (
        <>
          {/* Celular: lista compacta */}
          <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie md:hidden">
            {lista.map((l) => (
              <li key={l.id} className="p-3">
                <Link href={`/estoque/${l.id}`} className="flex gap-3">
                  <Miniatura src={l.capa} nome={l.nome} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate font-medium">{l.nome}</div>
                      <div className="shrink-0 text-sm font-semibold tabular-nums">{valorTela(l)}</div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <SeloSituacao situacao={l.situacao} capital={l.tipo === "capital"} />
                      <SeloDias dias={l.dias} vendido={l.situacao === "vendido"} />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-suave">
                      <span>Custo {reais(l.custo, true)}</span>
                      <span className="font-medium"><Lucro l={l} /></span>
                    </div>
                  </div>
                </Link>
                <div className="mt-2.5 pl-[68px]">
                  <ItemAcoes item={l} hoje={hoje} compacto />
                </div>
              </li>
            ))}
          </ul>

          {/* Computador: tabela */}
          <div className="hidden overflow-hidden rounded-xl border border-borda bg-superficie md:block">
            <table className="w-full text-sm">
              <thead className="bg-superficie-2 text-left text-xs font-medium text-suave">
                <tr className="border-b border-borda">
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-3 py-2.5 font-medium">Situação</th>
                  <th className="px-3 py-2.5 text-right font-medium">Custo</th>
                  <th className="px-3 py-2.5 text-right font-medium">Anúncio / venda</th>
                  <th className="px-3 py-2.5 text-right font-medium">Lucro</th>
                  <th className="px-3 py-2.5 font-medium">Parado</th>
                  <th className="px-4 py-2.5"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {lista.map((l) => (
                  <tr key={l.id} className="group transition-colors hover:bg-superficie-2">
                    <td className="max-w-0 px-4 py-2.5">
                      <Link href={`/estoque/${l.id}`} className="flex items-center gap-3">
                        <Miniatura src={l.capa} nome={l.nome} tamanho="size-10" />
                        <div className="min-w-0">
                          <div className="truncate font-medium group-hover:underline">{l.nome}</div>
                          {l.categoria && <div className="truncate text-xs text-suave">{l.categoria}</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5"><SeloSituacao situacao={l.situacao} capital={l.tipo === "capital"} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{reais(l.custo, true)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{valorTela(l)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums"><Lucro l={l} /></td>
                    <td className="px-3 py-2.5"><SeloDias dias={l.dias} vendido={l.situacao === "vendido"} /></td>
                    <td className="px-4 py-2.5"><ItemAcoes item={l} hoje={hoje} compacto /></td>
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
