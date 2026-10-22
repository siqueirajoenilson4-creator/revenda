"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { limitePorItem, resumo, type Regras } from "@/lib/calculo";
import {
  capitalProprio,
  extrato as recortar,
  movimentos as lerMovimentos,
  ROTULO_MOVIMENTO,
  type Capital,
  type Extrato,
  type ItemCaixa,
  type Movimento,
} from "@/lib/caixa";
import { dataBR, pctTexto, reais } from "@/lib/formato";
import { mesesEntre, periodo, type PeriodoId } from "@/lib/periodo";
import { barrasMensais, dataCurta, dataPorExtenso, margemSobreCusto, reaisInteiros, ticketMedio } from "@/lib/visao";
import { Cabecalho, Indicador, Segmentos } from "@/components/Cabecalho";
import { GraficoLucro } from "@/components/GraficoLucro";
import { Numero } from "@/components/Numero";
import { SeloSituacao } from "@/components/Selos";

const PERIODOS: { id: PeriodoId; rotulo: string; frase: string }[] = [
  { id: "mes", rotulo: "Mês", frase: "neste mês" },
  { id: "3m", rotulo: "3 meses", frase: "nos últimos 3 meses" },
  { id: "ano", rotulo: "Ano", frase: "neste ano" },
  { id: "tudo", rotulo: "Tudo", frase: "desde o começo" },
];

const POR_PAGINA = 40;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** 12 meses; em "Tudo", desde a primeira venda (até 3 anos). */
function mesesDoGrafico(itens: ItemCaixa[], hoje: string, id: PeriodoId): number {
  if (id !== "tudo") return 12;
  const primeira = itens
    .map((i) => i.venda_data)
    .filter((d): d is string => !!d)
    .sort()[0];
  if (!primeira || primeira > hoje) return 12;
  return Math.min(36, Math.max(12, mesesEntre(primeira, hoje).length));
}

export function Caixa({
  itens,
  regras,
  hoje,
  periodoInicial,
}: {
  itens: ItemCaixa[];
  regras: Regras;
  hoje: string;
  periodoInicial: string;
}) {
  const [periodoId, setPeriodoId] = useState<PeriodoId>(PERIODOS.find((p) => p.id === periodoInicial)?.id ?? "mes");
  const [qtd, setQtd] = useState(POR_PAGINA);

  // Período no endereço (voltar/compartilhar), sem ir ao servidor.
  useEffect(() => {
    window.history.replaceState(null, "", periodoId === "mes" ? "/caixa" : `/caixa?periodo=${periodoId}`);
  }, [periodoId]);

  const intervalo = useMemo(() => periodo(periodoId, hoje), [periodoId, hoje]);
  const todos = useMemo(() => lerMovimentos(itens, regras), [itens, regras]);
  const ext = useMemo(() => recortar(todos, intervalo), [todos, intervalo]);
  const res = useMemo(() => resumo(itens, regras, intervalo), [itens, regras, intervalo]);
  const capitais = useMemo(() => capitalProprio(itens), [itens]);
  const meses = mesesDoGrafico(itens, hoje, periodoId);
  const barras = useMemo(() => barrasMensais(itens, hoje, meses), [itens, hoje, meses]);

  const caixa = res.caixaLivre;
  const reserva = Math.max(0, Math.round((caixa * regras.reserva_pct) / 100));
  const limite = limitePorItem(caixa, regras);
  const atual = PERIODOS.find((p) => p.id === periodoId)!;
  const extenso = dataPorExtenso(hoje);
  const desde = intervalo.de ? `desde ${dataCurta(intervalo.de, hoje)}` : null;
  const sobreCusto = margemSobreCusto(res.lucroRealizado, res.vendasRevenda);
  const ticket = ticketMedio(res.vendasRevenda, res.vendidos);

  function mudarPeriodo(id: PeriodoId) {
    setPeriodoId(id);
    setQtd(POR_PAGINA);
  }

  return (
    <>
      <Cabecalho
        sobre={extenso.charAt(0).toUpperCase() + extenso.slice(1)}
        titulo="Caixa"
        acoes={
          <div className="w-full sm:w-auto max-sm:[&_button]:flex-1 max-sm:[&>div]:w-full">
            <Segmentos opcoes={PERIODOS} valor={periodoId} aoMudar={mudarPeriodo} />
          </div>
        }
      />

      {limite == null && (
        <div
          role="status"
          className="entra mb-4 flex items-center gap-2.5 rounded-xl border border-ruim/30 bg-ruim-fundo px-4 py-3 text-sm font-semibold text-ruim"
        >
          <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          Caixa zerado: venda a moto antes de comprar.
        </div>
      )}

      <section aria-labelledby="titulo-hoje">
        <h2 id="titulo-hoje" className="sobrescrito mb-2">
          Hoje
        </h2>
        <div className="escalonado grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador
            destaque
            rotulo="Caixa livre"
            valor={reaisInteiros(caixa)}
            tom={caixa < 0 ? "ruim" : undefined}
            detalhe={caixa < 0 ? "saiu mais do que entrou" : "dinheiro na mão hoje"}
          />
          <Indicador rotulo="Reserva intocável" valor={reaisInteiros(reserva)} detalhe={`${regras.reserva_pct}% do caixa, não mexer`} />
          <Indicador
            rotulo="Pode gastar num item"
            valor={reaisInteiros(limite ?? 0)}
            tom={limite == null ? "ruim" : undefined}
            detalhe={
              limite == null
                ? "caixa zerado"
                : regras.max_item_pct <= 100 - regras.reserva_pct
                  ? `até ${regras.max_item_pct}% do caixa`
                  : "o caixa menos a reserva"
            }
            tomDetalhe={limite == null ? "ruim" : undefined}
          />
          <Indicador
            rotulo="Empatado no pátio"
            valor={reaisInteiros(res.empatado)}
            detalhe={res.empatadoQtd ? `${plural(res.empatadoQtd, "item", "itens")} no pátio` : "pátio vazio"}
          />
        </div>
      </section>

      <section aria-labelledby="titulo-periodo" className="mt-5">
        <h2 id="titulo-periodo" className="sobrescrito mb-2">
          Resultado {atual.frase}
          {desde && <span className="font-medium tracking-normal normal-case"> · {desde}</span>}
        </h2>
        <div className="escalonado grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador
            rotulo="Lucro realizado"
            valor={reaisInteiros(res.lucroRealizado)}
            tom={res.lucroRealizado < 0 ? "ruim" : res.lucroRealizado > 0 ? "bom" : undefined}
            detalhe={res.vendidos ? `em ${reaisInteiros(res.vendasRevenda)} de vendas` : "nenhuma venda de revenda"}
          />
          <Indicador
            rotulo="Margem média"
            valor={res.margemMedia == null ? "—" : pctTexto(res.margemMedia, 0)}
            tom={res.margemMedia != null && res.margemMedia < 0 ? "ruim" : undefined}
            detalhe={sobreCusto == null ? "lucro ÷ valor vendido" : `${pctTexto(sobreCusto, 0)} sobre o custo`}
          />
          <Indicador
            rotulo="Giro médio"
            valor={res.giroMedio == null ? "—" : plural(Math.round(res.giroMedio), "dia", "dias")}
            detalhe="da compra até a venda"
          />
          <Indicador
            rotulo="Vendidos"
            valor={String(res.vendidos)}
            detalhe={ticket == null ? "itens de revenda" : `ticket médio ${reaisInteiros(ticket)}`}
          />
        </div>
      </section>

      <div className="escalonado mt-5 grid gap-4 md:mt-6 xl:grid-cols-3">
        {capitais.length > 0 && (
          <CapitalProprio capitais={capitais} caixa={caixa} regras={regras} className="xl:col-start-3 xl:row-start-1" />
        )}
        <div className={`min-w-0 ${capitais.length ? "xl:col-span-2 xl:col-start-1 xl:row-start-1" : "xl:col-span-3"}`}>
          <GraficoLucro
            barras={barras}
            titulo="Lucro por mês"
            sub={`Últimos ${meses} meses, só revenda`}
            vazio={`Nenhuma venda nos últimos ${meses} meses.`}
          />
        </div>
        <ExtratoCaixa
          ext={ext}
          total={todos.length}
          frase={atual.frase}
          de={intervalo.de}
          hoje={hoje}
          qtd={qtd}
          aoMostrarMais={() => setQtd((q) => q + POR_PAGINA)}
          aoVerTudo={periodoId === "tudo" ? undefined : () => mudarPeriodo("tudo")}
          className="xl:col-span-3"
        />
      </div>
    </>
  );
}

// ---------- Capital próprio ----------

function Linha({ rotulo, forte, children }: { rotulo: string; forte?: boolean; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-suave">{rotulo}</dt>
      <dd className={`text-right tabular-nums ${forte ? "font-bold" : "font-semibold"}`}>{children}</dd>
    </div>
  );
}

function CapitalProprio({
  capitais,
  caixa,
  regras,
  className,
}: {
  capitais: Capital[];
  caixa: number;
  regras: Regras;
  className: string;
}) {
  return (
    <section aria-labelledby="titulo-capital" className={`cartao flex flex-col p-4 md:p-5 ${className}`}>
      <h2 id="titulo-capital" className="titulo-secao">
        Capital próprio
      </h2>
      <p className="text-[13px] text-suave">Entra no caixa quando vende; não conta como lucro.</p>
      <ul className="mt-3 space-y-3">
        {capitais.map((c) => {
          const depois = c.valor == null ? null : caixa + c.valor;
          return (
            <li key={c.id}>
              <Link href={`/estoque/${c.id}`} className="cartao-link block rounded-lg border border-borda p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold">{c.nome}</span>
                  <SeloSituacao situacao={c.situacao} />
                </div>
                <Numero
                  texto={c.valor == null ? "—" : reaisInteiros(c.valor)}
                  className="numero mt-1 block text-[28px] leading-tight"
                />
                <div className="text-[13px] text-suave">
                  {c.vendido ? `vendido em ${dataBR(c.venda_data)}` : c.valor == null ? "sem preço de anúncio" : "preço anunciado"}
                </div>
                <dl className="mt-3 space-y-1 border-t border-borda pt-2.5 text-sm">
                  <Linha rotulo="Gastos pagos">{reais(c.gastos, true)}</Linha>
                  {c.vendido ? (
                    <Linha rotulo="Sobrou para o caixa" forte>
                      {reais(c.liquido, true)}
                    </Linha>
                  ) : (
                    depois != null && (
                      <>
                        <Linha rotulo="Caixa depois de vender" forte>
                          {reais(depois, true)}
                        </Linha>
                        <Linha rotulo="Aí pode gastar num item">{reais(limitePorItem(depois, regras) ?? 0, true)}</Linha>
                      </>
                    )
                  )}
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- Extrato ----------

function Valor({ v, className = "" }: { v: number; className?: string }) {
  return (
    <span className={`whitespace-nowrap tabular-nums ${v > 0 ? "text-bom" : ""} ${className}`}>
      {v > 0 ? "+" : "−"}
      {reais(Math.abs(v), true)}
    </span>
  );
}

const destino = (m: Movimento) => (m.itemId ? `/estoque/${m.itemId}` : "/regras");

function Titulo({ m }: { m: Movimento }) {
  if (m.tipo === "saldo_inicial") return <span className="font-semibold">{ROTULO_MOVIMENTO.saldo_inicial}</span>;
  return (
    <>
      <span className="text-suave">{ROTULO_MOVIMENTO[m.tipo]} ·</span> <span className="font-semibold">{m.detalhe}</span>
    </>
  );
}

/** Data e o que mais ajuda a reconhecer o movimento (o item do gasto, "capital"). */
function detalhes(m: Movimento, hoje: string, comData: boolean): string {
  return [
    comData ? (m.data ? dataCurta(m.data, hoje) : "sem data") : null,
    m.tipo === "gasto" ? m.itemNome : null,
    m.tipo === "saldo_inicial" ? m.detalhe : null,
    m.capital && m.tipo === "venda" ? "capital, não é lucro" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ExtratoCaixa({
  ext,
  total,
  frase,
  de,
  hoje,
  qtd,
  aoMostrarMais,
  aoVerTudo,
  className,
}: {
  ext: Extrato;
  total: number;
  frase: string;
  de: string | null;
  hoje: string;
  qtd: number;
  aoMostrarMais: () => void;
  aoVerTudo?: () => void;
  className: string;
}) {
  const router = useRouter();
  const lista = ext.movimentos.slice(0, qtd);
  const resto = ext.movimentos.length - lista.length;

  const celulas = [
    {
      rotulo: "Saldo no início",
      valor: reais(ext.saldoInicio, true),
      detalhe: de ? `em ${dataCurta(de, hoje)}` : "antes do primeiro movimento",
      tom: ext.saldoInicio < 0 ? "text-ruim" : "",
    },
    { rotulo: "Entradas", valor: `+${reais(ext.entradas, true)}`, detalhe: "vendas", tom: ext.entradas > 0 ? "text-bom" : "" },
    { rotulo: "Saídas", valor: `−${reais(ext.saidas, true)}`, detalhe: "compras e gastos", tom: "" },
    { rotulo: "Saldo no fim", valor: reais(ext.saldoFim, true), detalhe: "hoje", tom: ext.saldoFim < 0 ? "text-ruim" : "" },
  ];

  return (
    <section aria-labelledby="titulo-extrato" className={`cartao overflow-hidden p-0 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 pt-4 pb-3 md:px-5 md:pt-5">
        <h2 id="titulo-extrato" className="titulo-secao">
          Extrato
        </h2>
        <span className="text-[13px] text-suave">
          {ext.movimentos.length ? `${plural(ext.movimentos.length, "movimento", "movimentos")} ${frase}` : frase}
        </span>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-borda px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div>
            <p className="font-semibold">Nenhum movimento ainda.</p>
            <p className="mt-0.5 text-sm text-suave">Lance o saldo inicial em Regras e registre as compras no Pátio.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/regras" className="botao-secundario">
              Abrir Regras
            </Link>
            <Link href="/estoque/novo" className="botao-principal">
              + Novo item
            </Link>
          </div>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px border-y border-borda bg-borda md:grid-cols-4">
            {celulas.map((c) => (
              <div key={c.rotulo} className="min-w-0 bg-superficie px-4 py-3 md:px-5">
                <dt className="sobrescrito truncate">{c.rotulo}</dt>
                <dd>
                  <Numero texto={c.valor} className={`numero block truncate text-[22px] leading-tight md:text-[24px] ${c.tom}`} />
                  <span className="block truncate text-[12px] text-suave">{c.detalhe}</span>
                </dd>
              </div>
            ))}
          </dl>

          {ext.movimentos.length === 0 ? (
            <div className="flex flex-col items-start gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-5">
              <div>
                <p className="font-semibold">Nada entrou nem saiu {frase}.</p>
                <p className="mt-0.5 text-sm text-suave">O caixa continua em {reais(ext.saldoFim, true)}.</p>
              </div>
              {aoVerTudo && (
                <button type="button" className="botao-secundario" onClick={aoVerTudo}>
                  Ver todo o extrato
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Celular e tablet: lista */}
              <ul className="escalonado divide-y divide-borda lg:hidden">
                {lista.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={destino(m)}
                      className="flex min-h-15 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-superficie-2 active:bg-superficie-2 md:px-5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          <Titulo m={m} />
                        </span>
                        <span className="block truncate text-[13px] text-suave">{detalhes(m, hoje, true)}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Valor v={m.valor} className="block font-semibold" />
                        <span className={`block text-[12px] tabular-nums ${m.saldo < 0 ? "text-ruim" : "text-suave"}`}>
                          saldo {reais(m.saldo, true)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Computador: tabela; a linha inteira abre o item */}
              <table className="hidden w-full text-[15px] lg:table">
                <thead>
                  <tr className="border-b border-borda bg-superficie-2">
                    <th scope="col" className="sobrescrito py-2.5 pr-3 pl-5 text-left">Data</th>
                    <th scope="col" className="sobrescrito px-3 py-2.5 text-left">Movimento</th>
                    <th scope="col" className="sobrescrito px-3 py-2.5 text-right">Valor</th>
                    <th scope="col" className="sobrescrito py-2.5 pr-5 pl-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="escalonado">
                  {lista.map((m) => {
                    const extra = detalhes(m, hoje, false);
                    return (
                      <tr
                        key={m.id}
                        onClick={(e) => {
                          if (!(e.target as HTMLElement).closest("a")) router.push(destino(m));
                        }}
                        className="cursor-pointer border-b border-borda transition-colors duration-150 last:border-0 hover:bg-superficie-2"
                      >
                        <td className="py-2.5 pr-3 pl-5 whitespace-nowrap text-suave tabular-nums">
                          {m.data ? <time dateTime={m.data}>{dataCurta(m.data, hoje)}</time> : "—"}
                        </td>
                        <td className="w-full max-w-0 px-3 py-2.5">
                          <Link href={destino(m)} className="block truncate hover:underline">
                            <Titulo m={m} />
                            {extra && <span className="text-suave"> — {extra}</span>}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Valor v={m.valor} className="font-semibold" />
                        </td>
                        <td className={`py-2.5 pr-5 pl-3 text-right whitespace-nowrap tabular-nums ${m.saldo < 0 ? "text-ruim" : ""}`}>
                          {reais(m.saldo, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {resto > 0 && (
                <div className="border-t border-borda p-3 md:px-5">
                  <button type="button" className="botao-secundario w-full" onClick={aoMostrarMais}>
                    Mostrar mais {Math.min(resto, POR_PAGINA)}
                    <span className="font-normal text-suave">de {resto}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
