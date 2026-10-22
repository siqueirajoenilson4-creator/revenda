"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { pctTexto, reais } from "@/lib/formato";
import { inicioMes, periodo as intervalo, PERIODOS, type PeriodoId } from "@/lib/periodo";
import { dataCurta, reaisInteiros } from "@/lib/visao";
import {
  CANAIS,
  NAO_INFORMADO,
  PAGAMENTOS,
  csvVendas,
  filtrarVendas,
  ordenarVendas,
  porCanal,
  rotuloPagamento,
  totaisVendas,
  type Canal,
  type LinhaVenda,
  type OrdemVendas,
  type Pagamento,
  type TotalCanal,
} from "@/lib/vendas";
import { Cabecalho, Indicador, Segmentos } from "@/components/Cabecalho";
import { Icone, LUPA } from "@/components/IconesItem";
import { SeloCanal } from "@/components/Selos";

type FiltroCanal = Canal | "nao_informado" | "";
type FiltroPagamento = Pagamento | "nao_informado" | "";
export type FiltrosIniciais = { periodo: PeriodoId; canal: FiltroCanal; pagamento: FiltroPagamento; busca: string };
type Ordem = { por: OrdemVendas; crescente: boolean };

const BAIXAR = <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function sobrePeriodo(id: PeriodoId, hoje: string): string {
  const [y, m] = hoje.split("-").map(Number);
  if (id === "mes") return `${maiuscula(MESES[m - 1])} de ${y}`;
  if (id === "3m") {
    const [yi, mi] = inicioMes(hoje, 2).split("-").map(Number);
    return `${maiuscula(MESES[mi - 1])}${yi !== y ? ` de ${yi}` : ""} a ${MESES[m - 1]} de ${y}`;
  }
  if (id === "ano") return `Ano de ${y}`;
  return "Todas as vendas";
}

// ---------- Totais ----------

function textoDesconto(d: number | null) {
  if (d == null) return "sem preço anunciado";
  if (d > 0) return "abaixo do preço anunciado";
  if (d < 0) return "acima do preço anunciado";
  return "pelo preço anunciado";
}

function Totais({ linhas }: { linhas: LinhaVenda[] }) {
  const t = totaisVendas(linhas);
  const dias = linhas.filter((l) => !l.capital && l.dias != null).map((l) => l.dias!);
  const giro = dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : null;
  return (
    <>
      <section aria-label="Totais do filtro" className="escalonado grid grid-cols-2 gap-3 sm:grid-cols-3 min-[1360px]:grid-cols-6">
        <Indicador
          rotulo="Faturamento"
          valor={reaisInteiros(t.faturamento)}
          detalhe={t.capitalQtd ? "sem o capital próprio" : "soma do que recebeu"}
        />
        <Indicador
          destaque
          rotulo="Lucro"
          valor={reaisInteiros(t.lucro)}
          tom={t.lucro < 0 ? "ruim" : undefined}
          detalhe="já tirados custo e gastos"
        />
        <Indicador
          rotulo="Vendas"
          valor={String(t.quantidade)}
          detalhe={giro == null ? "nenhuma de revenda" : `${plural(giro, "dia", "dias")} até vender, em média`}
        />
        <Indicador
          rotulo="Ticket médio"
          valor={t.ticketMedio == null ? "—" : reaisInteiros(t.ticketMedio)}
          detalhe="por venda"
        />
        <Indicador
          rotulo="Margem média"
          valor={pctTexto(t.margemMedia, 0)}
          tom={t.margemMedia != null && t.margemMedia < 0 ? "ruim" : undefined}
          detalhe="lucro sobre o custo"
        />
        <Indicador
          rotulo="Desconto médio"
          valor={t.descontoMedio == null ? "—" : pctTexto(Math.abs(t.descontoMedio), 0)}
          detalhe={textoDesconto(t.descontoMedio)}
        />
      </section>
      {t.capitalQtd > 0 && (
        <p className="aparece mt-2 text-[13px] text-suave">
          Capital próprio: {reais(t.capitalValor, true)} entrou no caixa (não conta no lucro).
        </p>
      )}
    </>
  );
}

// ---------- De onde vêm as vendas ----------

const COR: Record<Canal, string> = {
  marketplace: "bg-canal-mkt",
  olx: "bg-canal-olx",
  grupos: "bg-canal-grupos",
  whatsapp: "bg-canal-zap",
  indicacao: "bg-grafico",
  outro: "bg-suave",
};

function DeOndeVem({ canais, chave }: { canais: TotalCanal[]; chave: string }) {
  const total = canais.reduce((s, c) => s + c.valor, 0);
  return (
    <section aria-labelledby="titulo-canais" className="cartao entra md:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titulo-canais" className="titulo-secao">
          De onde vêm as vendas
        </h2>
        <span className="text-[13px] text-suave">parte do faturamento</span>
      </div>
      <ul key={chave} className="mt-4 grid gap-x-10 gap-y-4 lg:grid-cols-2">
        {canais.map((c, i) => {
          const fracao = total > 0 ? c.valor / total : 0;
          return (
            <li key={c.canal ?? "nao_informado"} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={`truncate font-semibold ${c.canal ? "" : "text-suave"}`}>{c.rotulo}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-suave">{plural(c.quantidade, "venda", "vendas")} · </span>
                  <span className="font-semibold">{reais(c.valor, true)}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-fundo">
                <div
                  className={`cresce-x h-full rounded-full ${c.canal ? COR[c.canal] : "bg-grafico-2"}`}
                  style={{ width: `${Math.max(1.5, fracao * 100)}%`, animationDelay: `${Math.min(i, 6) * 50}ms` }}
                />
              </div>
              <div className="mt-1 flex justify-between gap-3 text-[12px] text-suave">
                <span>{pctTexto(fracao, 0)}</span>
                {c.diasMedio != null && <span>{plural(Math.round(c.diasMedio), "dia", "dias")} até vender, em média</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- Lista ----------

function Lucro({ l }: { l: LinhaVenda }) {
  if (l.lucro == null) return <span className="font-medium text-suave">Entra no caixa</span>;
  return <span className={`font-bold ${l.lucro < 0 ? "text-ruim" : "text-bom"}`}>{reais(l.lucro, true)}</span>;
}

const COLUNAS: { id: OrdemVendas; rotulo: string; numero?: boolean }[] = [
  { id: "data", rotulo: "Data" },
  { id: "nome", rotulo: "Item" },
  { id: "canal", rotulo: "Canal" },
  { id: "pagamento", rotulo: "Pagamento" },
  { id: "custo", rotulo: "Custo", numero: true },
  { id: "valor", rotulo: "Vendeu", numero: true },
  { id: "lucro", rotulo: "Lucro", numero: true },
  { id: "margem", rotulo: "Margem", numero: true },
  { id: "dias", rotulo: "Dias", numero: true },
];

const ORDENS_LISTA: { rotulo: string; ordem: Ordem }[] = [
  { rotulo: "Mais recentes", ordem: { por: "data", crescente: false } },
  { rotulo: "Mais antigas", ordem: { por: "data", crescente: true } },
  { rotulo: "Maior lucro", ordem: { por: "lucro", crescente: false } },
  { rotulo: "Maior valor", ordem: { por: "valor", crescente: false } },
  { rotulo: "Maior margem", ordem: { por: "margem", crescente: false } },
  { rotulo: "Vendeu mais rápido", ordem: { por: "dias", crescente: true } },
  { rotulo: "Demorou mais", ordem: { por: "dias", crescente: false } },
];
const chaveOrdem = (o: Ordem) => `${o.por}-${o.crescente ? "c" : "d"}`;

function Seta({ estado }: { estado: "asc" | "desc" | null }) {
  return (
    <Icone className={`size-3.5 ${estado ? "" : "opacity-0 transition-opacity group-hover/th:opacity-60"}`}>
      {estado === "asc" ? (
        <path d="m18 15-6-6-6 6" />
      ) : estado === "desc" ? (
        <path d="m6 9 6 6 6-6" />
      ) : (
        <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
      )}
    </Icone>
  );
}

function Celula({ rotulo, className = "", children }: { rotulo: string; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 px-2.5 py-2 ${className}`}>
      <dt className="sobrescrito truncate">{rotulo}</dt>
      <dd className="truncate text-[14px] font-semibold">{children}</dd>
    </div>
  );
}

function CartaoVenda({ l, hoje }: { l: LinhaVenda; hoje: string }) {
  const linha = [
    dataCurta(l.data, hoje),
    l.dias != null ? plural(l.dias, "dia", "dias") : null,
    l.pagamento ? rotuloPagamento(l.pagamento) : null,
    l.comprador,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link href={`/estoque/${l.id}`} className="cartao cartao-link block p-0">
      <div className="flex items-start justify-between gap-3 p-3.5">
        <div className="min-w-0">
          <div className="line-clamp-2 leading-snug font-semibold">{l.nome}</div>
          <div className="mt-0.5 truncate text-[13px] text-suave">{linha}</div>
        </div>
        <SeloCanal canal={l.canal} />
      </div>
      <dl className="grid grid-cols-4 divide-x divide-borda border-t border-borda">
        <Celula rotulo={l.capital ? "Gastos" : "Custo"}>{reais(l.custo, true)}</Celula>
        <Celula rotulo="Vendeu">{reais(l.valor, true)}</Celula>
        {l.capital ? (
          <Celula rotulo="Lucro" className="col-span-2">
            <Lucro l={l} />
          </Celula>
        ) : (
          <>
            <Celula rotulo="Lucro">
              <Lucro l={l} />
            </Celula>
            <Celula rotulo="Margem">{pctTexto(l.margem, 0)}</Celula>
          </>
        )}
      </dl>
    </Link>
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

// ---------- Tela ----------

export function Vendas({ linhas, hoje, inicial }: { linhas: LinhaVenda[]; hoje: string; inicial: FiltrosIniciais }) {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<PeriodoId>(inicial.periodo);
  const [canal, setCanal] = useState<FiltroCanal>(inicial.canal);
  const [pagamento, setPagamento] = useState<FiltroPagamento>(inicial.pagamento);
  const [busca, setBusca] = useState(inicial.busca);
  const [ordem, setOrdem] = useState<Ordem>({ por: "data", crescente: false });
  const termo = useDeferredValue(busca);

  // Filtros no endereço: voltar ou abrir o link mostra a mesma lista.
  useEffect(() => {
    const p = new URLSearchParams();
    if (periodo !== "mes") p.set("periodo", periodo);
    if (canal) p.set("canal", canal);
    if (pagamento) p.set("pagamento", pagamento);
    if (busca.trim()) p.set("q", busca.trim());
    const q = p.toString();
    window.history.replaceState(null, "", q ? `/vendas?${q}` : "/vendas");
  }, [periodo, canal, pagamento, busca]);

  const { de, ate } = intervalo(periodo, hoje);
  const filtradas = useMemo(
    () => filtrarVendas(linhas, { de, ate, canal: canal || null, pagamento: pagamento || null, busca: termo }),
    [linhas, de, ate, canal, pagamento, termo],
  );
  const canais = useMemo(() => porCanal(filtradas), [filtradas]);
  const ordenadas = useMemo(() => ordenarVendas(filtradas, ordem.por, ordem.crescente), [filtradas, ordem]);
  const chaveFiltro = `${periodo}|${canal}|${pagamento}`;
  const temFiltro = Boolean(canal || pagamento || busca.trim());

  function ordenarPor(por: OrdemVendas) {
    const numero = COLUNAS.find((c) => c.id === por)?.numero || por === "data";
    setOrdem((o) => (o.por === por ? { por, crescente: !o.crescente } : { por, crescente: !numero }));
  }

  function limpar() {
    setCanal("");
    setPagamento("");
    setBusca("");
  }

  function exportar() {
    const arquivo = new Blob([csvVendas(ordenadas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(arquivo);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenda-vendas-${hoje}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // A linha inteira abre o item; o link do nome cuida do próprio clique.
  function abrir(e: MouseEvent, id: string) {
    if ((e.target as HTMLElement).closest("a, button") || window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey) window.open(`/estoque/${id}`, "_blank");
    else router.push(`/estoque/${id}`);
  }

  const registrar = (
    <Link href="/vendas/nova" className="botao-principal">
      + Registrar venda
    </Link>
  );

  if (linhas.length === 0)
    return (
      <>
        <Cabecalho titulo="Vendas" acoes={registrar} />
        <Vazio titulo="Nenhuma venda ainda." texto="Toque em + Registrar venda quando fechar o primeiro negócio.">
          {registrar}
        </Vazio>
      </>
    );

  const ordemLista = chaveOrdem(ordem);
  const ordemConhecida = ORDENS_LISTA.some((o) => chaveOrdem(o.ordem) === ordemLista);

  return (
    <>
      <Cabecalho
        sobre={sobrePeriodo(periodo, hoje)}
        titulo="Vendas"
        acoes={
          <>
            <button type="button" className="botao-secundario" onClick={exportar} disabled={ordenadas.length === 0}>
              <Icone>{BAIXAR}</Icone>
              Exportar CSV
            </button>
            {registrar}
          </>
        }
      />

      <div className="entra mb-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="max-sm:[&_button]:flex-1 max-sm:[&>div]:w-full">
          <Segmentos opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex">
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as FiltroCanal)}
            aria-label="Canal"
            className={`campo lg:w-44 ${canal ? "border-texto font-semibold" : ""}`}
          >
            <option value="">Todos os canais</option>
            {CANAIS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
            <option value="nao_informado">Canal: {NAO_INFORMADO.toLowerCase()}</option>
          </select>
          <select
            value={pagamento}
            onChange={(e) => setPagamento(e.target.value as FiltroPagamento)}
            aria-label="Pagamento"
            className={`campo lg:w-44 ${pagamento ? "border-texto font-semibold" : ""}`}
          >
            <option value="">Todo pagamento</option>
            {PAGAMENTOS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
            <option value="nao_informado">Pagamento: {NAO_INFORMADO.toLowerCase()}</option>
          </select>
        </div>
        <label className="relative min-w-0 lg:min-w-56 lg:flex-1">
          <span className="sr-only">Buscar por item ou comprador</span>
          <Icone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave">{LUPA}</Icone>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            type="search"
            placeholder="Buscar item ou comprador…"
            className="campo pl-9"
          />
        </label>
      </div>

      <Totais linhas={filtradas} />

      <div className="mt-4 space-y-4 md:mt-5">
        {canais.length > 0 && <DeOndeVem canais={canais} chave={chaveFiltro} />}

        {ordenadas.length === 0 ? (
          <Vazio
            titulo={termo.trim() ? `Nada encontrado para “${termo.trim()}”` : "Nenhuma venda neste filtro"}
            texto={periodo === "tudo" ? "Mude o canal, o pagamento ou a busca." : "Pode ser só o período: veja todas as vendas."}
          >
            {temFiltro && (
              <button type="button" className="botao-secundario" onClick={limpar}>
                Limpar filtros
              </button>
            )}
            {periodo !== "tudo" && (
              <button type="button" className="botao-secundario" onClick={() => setPeriodo("tudo")}>
                Ver tudo
              </button>
            )}
          </Vazio>
        ) : (
          <section aria-labelledby="titulo-lista">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="titulo-lista" className="titulo-secao">
                {plural(ordenadas.length, "venda", "vendas")}
                {temFiltro && <span className="font-semibold text-suave"> no filtro</span>}
              </h2>
              <select
                value={ordemLista}
                onChange={(e) => {
                  const o = ORDENS_LISTA.find((x) => chaveOrdem(x.ordem) === e.target.value);
                  if (o) setOrdem(o.ordem);
                }}
                aria-label="Ordenar"
                className="campo w-auto shrink-0 xl:hidden"
              >
                {!ordemConhecida && <option value={ordemLista}>Ordem da tabela</option>}
                {ORDENS_LISTA.map((o) => (
                  <option key={chaveOrdem(o.ordem)} value={chaveOrdem(o.ordem)}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>

            {/* Celular e telas médias: cartões */}
            <ul key={`c-${chaveFiltro}`} className="escalonado grid gap-3 lg:grid-cols-2 xl:hidden">
              {ordenadas.map((l) => (
                <li key={l.id}>
                  <CartaoVenda l={l} hoje={hoje} />
                </li>
              ))}
            </ul>

            {/* Computador: tabela ordenável; a linha inteira abre o item */}
            <div className="cartao hidden overflow-hidden p-0 xl:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-borda bg-superficie-2">
                    {COLUNAS.map((c, i) => {
                      const ativa = ordem.por === c.id;
                      return (
                        <th
                          key={c.id}
                          scope="col"
                          aria-sort={ativa ? (ordem.crescente ? "ascending" : "descending") : undefined}
                          className={`group/th py-1 ${c.numero ? "text-right" : "text-left"} ${
                            i === 0 ? "pr-1 pl-3" : i === COLUNAS.length - 1 ? "pr-3 pl-1" : "px-1"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => ordenarPor(c.id)}
                            className={`sobrescrito inline-flex min-h-9 items-center gap-1 rounded-md px-2 transition-colors hover:text-texto ${
                              c.numero ? "flex-row-reverse" : ""
                            } ${ativa ? "text-texto" : ""}`}
                          >
                            {c.rotulo}
                            <Seta estado={ativa ? (ordem.crescente ? "asc" : "desc") : null} />
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody key={`t-${chaveFiltro}`} className="escalonado">
                  {ordenadas.map((l) => {
                    const sub = [l.comprador, l.cidade].filter(Boolean).join(" · ");
                    return (
                      <tr
                        key={l.id}
                        onClick={(e) => abrir(e, l.id)}
                        className="cursor-pointer border-b border-borda transition-colors duration-150 last:border-0 hover:bg-superficie-2"
                      >
                        <td className="py-2.5 pr-3 pl-5 whitespace-nowrap text-suave">{dataCurta(l.data, hoje)}</td>
                        <td className="w-full max-w-0 px-3 py-2.5">
                          <Link href={`/estoque/${l.id}`} className="block truncate font-semibold hover:underline" title={l.nome}>
                            {l.nome}
                          </Link>
                          {sub && <div className="truncate text-[13px] text-suave">{sub}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          <SeloCanal canal={l.canal} />
                        </td>
                        <td className={`px-3 py-2.5 whitespace-nowrap ${l.pagamento ? "" : "text-suave"}`}>
                          {rotuloPagamento(l.pagamento)}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{reais(l.custo, true)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{reais(l.valor, true)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <Lucro l={l} />
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{pctTexto(l.margem, 0)}</td>
                        <td className="py-2.5 pr-5 pl-3 text-right whitespace-nowrap">{l.dias ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
