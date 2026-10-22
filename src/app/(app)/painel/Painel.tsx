"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { limitePorItem, resumo, type Regras } from "@/lib/calculo";
import { pctTexto, reais } from "@/lib/formato";
import {
  avisos as gerarAvisos,
  barrasMensais,
  barrasSemanais,
  comparar,
  dataCurta,
  dataPorExtenso,
  intervalos,
  nomeAnterior,
  numeros,
  patio,
  PERIODOS_VISAO,
  reaisInteiros,
  ultimasVendas,
  type Aviso,
  type CartaoPatio,
  type ItemVisao,
  type LinhaVenda,
  type PeriodoVisao,
} from "@/lib/visao";
import { Cabecalho, Indicador, Segmentos } from "@/components/Cabecalho";
import { GraficoLucro } from "@/components/GraficoLucro";
import { SeloDias, SeloSituacao } from "@/components/Selos";

const NESTE: Record<PeriodoVisao, string> = { semana: "nesta semana", mes: "neste mês", ano: "neste ano" };

export function Painel({ itens, regras, hoje }: { itens: ItemVisao[]; regras: Regras; hoje: string }) {
  const [periodoId, setPeriodoId] = useState<PeriodoVisao>("mes");
  const porMes = periodoId === "ano";

  // Caixa e empatado são a foto de agora; o resto depende do período.
  const agora = useMemo(() => resumo(itens, regras), [itens, regras]);
  const { atual, anterior } = useMemo(() => intervalos(periodoId, hoje), [periodoId, hoje]);
  const doPeriodo = useMemo(() => numeros(itens, regras, atual), [itens, regras, atual]);
  const doAnterior = useMemo(() => numeros(itens, regras, anterior), [itens, regras, anterior]);
  const barras = useMemo(() => (porMes ? barrasMensais(itens, hoje) : barrasSemanais(itens, hoje)), [itens, hoje, porMes]);
  const cartoes = useMemo(() => patio(itens, hoje), [itens, hoje]);
  const lista = useMemo(() => gerarAvisos(itens, hoje), [itens, hoje]);
  const vendas = useMemo(() => ultimasVendas(itens), [itens]);

  const limite = limitePorItem(agora.caixaLivre, regras);
  const quando = nomeAnterior(periodoId, hoje);
  const comparavel = doAnterior.vendas > 0;
  const cmpFaturamento = comparar(doPeriodo.faturamento, doAnterior.faturamento, quando);
  const cmpLucro = comparar(doPeriodo.lucro, doAnterior.lucro, quando);
  const parados30 = cartoes.filter((c) => (c.dias ?? 0) > 30).length;
  const extenso = dataPorExtenso(hoje);

  return (
    <>
      <Cabecalho
        sobre={extenso.charAt(0).toUpperCase() + extenso.slice(1)}
        titulo="Visão geral"
        acoes={
          <>
            <div className="w-full sm:w-auto max-sm:[&_button]:flex-1 max-sm:[&>div]:w-full">
              <Segmentos opcoes={PERIODOS_VISAO} valor={periodoId} aoMudar={setPeriodoId} />
            </div>
            <Link href="/calcular" prefetch className="botao-secundario flex-1 sm:flex-none">
              Calcular compra
            </Link>
            <Link href="/estoque/novo" className="botao-principal flex-1 sm:flex-none">
              + Novo item
            </Link>
          </>
        }
      />

      {limite == null && (
        <div className="entra mb-4 flex items-center gap-2.5 rounded-xl border border-ruim/30 bg-ruim-fundo px-4 py-3 text-sm font-semibold text-ruim">
          <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          Caixa zerado: venda a moto antes de comprar.
        </div>
      )}

      <section aria-label="Indicadores" className="escalonado grid grid-cols-2 gap-3 sm:grid-cols-3 min-[1360px]:grid-cols-6">
        <Indicador
          rotulo="Faturamento"
          valor={reaisInteiros(doPeriodo.faturamento)}
          detalhe={comparavel ? cmpFaturamento.texto : "sem vendas para comparar"}
          tomDetalhe={comparavel ? cmpFaturamento.tom : undefined}
        />
        <Indicador
          destaque
          rotulo="Lucro"
          valor={reaisInteiros(doPeriodo.lucro)}
          tom={doPeriodo.lucro < 0 ? "ruim" : undefined}
          detalhe={comparavel ? cmpLucro.texto : doPeriodo.vendas ? "lucro das vendas de revenda" : `nenhuma venda ${NESTE[periodoId]}`}
        />
        <Indicador
          rotulo="Vendas"
          valor={String(doPeriodo.vendas)}
          detalhe={doPeriodo.ticketMedio != null ? `ticket médio ${reaisInteiros(doPeriodo.ticketMedio)}` : `nenhuma ${NESTE[periodoId]}`}
        />
        <Margem margem={doPeriodo.margemCusto} meta={regras.margem_min_pct} />
        <Indicador
          rotulo="Caixa livre"
          valor={reaisInteiros(agora.caixaLivre)}
          tom={agora.caixaLivre < 0 ? "ruim" : undefined}
          detalhe={
            agora.caixaLivre > 0 ? `${reaisInteiros((agora.caixaLivre * regras.reserva_pct) / 100)} de reserva` : "sem caixa para comprar"
          }
          tomDetalhe={agora.caixaLivre > 0 ? undefined : "ruim"}
        />
        <Indicador
          rotulo="Empatado no pátio"
          valor={reaisInteiros(agora.empatado)}
          detalhe={
            parados30 > 0
              ? `${parados30} há mais de 30 dias`
              : agora.empatadoQtd
                ? `${agora.empatadoQtd} ${agora.empatadoQtd === 1 ? "item" : "itens"} no pátio`
                : "pátio vazio"
          }
          tomDetalhe={parados30 > 0 ? "atencao" : undefined}
        />
      </section>
      {comparavel && (
        <p className="aparece mt-2 text-xs text-suave">
          Faturamento e lucro comparados com o mesmo trecho do período anterior: {dataCurta(anterior.de, hoje)} a{" "}
          {dataCurta(anterior.ate, hoje)}.
        </p>
      )}

      <div className="escalonado mt-5 grid gap-4 md:mt-6 xl:grid-cols-3">
        <Avisos lista={lista} className="xl:col-start-3 xl:row-start-1" />
        <div className="min-w-0 xl:col-span-2 xl:col-start-1 xl:row-start-1">
          <GraficoLucro
            barras={barras}
            titulo={porMes ? "Vendas e lucro por mês" : "Vendas e lucro por semana"}
            sub={porMes ? "Últimos 12 meses" : `Últimas ${barras.length} semanas, de segunda a domingo`}
            vazio={porMes ? "Nenhuma venda nos últimos 12 meses." : `Nenhuma venda nas últimas ${barras.length} semanas.`}
          />
        </div>
        <UltimasVendas vendas={vendas} hoje={hoje} className="xl:col-span-3" />
        <Patio cartoes={cartoes} empatado={agora.empatado} className="xl:col-span-3" />
      </div>
    </>
  );
}

/** Margem sobre o custo contra a margem mínima das Regras. */
function Margem({ margem, meta }: { margem: number | null; meta: number }) {
  const pct = margem == null ? null : Math.round(margem * 100);
  return (
    <Indicador
      rotulo="Margem sobre custo"
      valor={margem == null ? "—" : pctTexto(margem, 0)}
      tom={pct != null && pct < 0 ? "ruim" : undefined}
      detalhe={
        pct == null
          ? `meta ${meta}%`
          : pct > meta
            ? `acima da meta de ${meta}%`
            : pct === meta
              ? `na meta de ${meta}%`
              : `abaixo da meta de ${meta}%`
      }
      tomDetalhe={pct == null ? undefined : pct >= meta ? "bom" : "atencao"}
    />
  );
}

// ---------- Precisa de você ----------

const PONTO: Record<Aviso["gravidade"], { cor: string; leitor: string }> = {
  ruim: { cor: "bg-ruim", leitor: "Urgente" },
  atencao: { cor: "bg-atencao", leitor: "Atenção" },
  info: { cor: "bg-grafico", leitor: "Pendente" },
};

const MAX_AVISOS = 5;

function Avisos({ lista, className }: { lista: Aviso[]; className: string }) {
  const resto = lista.length - MAX_AVISOS;
  return (
    <section aria-labelledby="titulo-avisos" className={`cartao flex flex-col p-4 md:p-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="titulo-avisos" className="titulo-secao">
          Precisa de você
        </h2>
        {lista.length > 0 && <span className="text-[13px] font-semibold text-suave tabular-nums">{lista.length}</span>}
      </div>
      {lista.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center py-5">
          <p className="font-semibold">Nada pendente.</p>
          <p className="mt-0.5 text-[13px] text-suave">Itens parados há mais de 30 dias e gastos por lançar aparecem aqui.</p>
        </div>
      ) : (
        <ul className="escalonado -mx-2 mt-1 divide-y divide-borda">
          {lista.slice(0, MAX_AVISOS).map((a) => (
            <li key={a.id}>
              <Link
                href={`/estoque/${a.itemId}`}
                className="flex gap-3 rounded-lg px-2 py-3 transition-colors duration-150 hover:bg-superficie-2 active:bg-superficie-2"
              >
                <span className={`mt-[7px] size-2.5 shrink-0 rounded-full ${PONTO[a.gravidade].cor}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{PONTO[a.gravidade].leitor}: </span>
                  <span className="block leading-snug font-semibold">{a.titulo}</span>
                  <span className="mt-0.5 line-clamp-2 text-[13px] text-suave">{a.texto}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {resto > 0 && (
        <Link href="/estoque" prefetch className="link mt-auto inline-flex min-h-11 items-center pt-1 text-sm md:min-h-9">
          Mais {resto} no estoque
        </Link>
      )}
    </section>
  );
}

// ---------- Últimas vendas ----------

function LucroVenda({ v, sinal }: { v: LinhaVenda; sinal?: boolean }) {
  if (v.lucro == null) return <span className="font-medium text-suave">Entra no caixa</span>;
  return (
    <span className={`font-bold ${v.lucro < 0 ? "text-ruim" : "text-bom"}`}>
      {sinal && v.lucro > 0 ? "+" : ""}
      {reais(v.lucro, true)}
    </span>
  );
}

const diasTexto = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

function UltimasVendas({ vendas, hoje, className }: { vendas: LinhaVenda[]; hoje: string; className: string }) {
  const router = useRouter();
  return (
    <section aria-labelledby="titulo-vendas" className={`cartao overflow-hidden p-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 md:px-5 md:pt-5">
        <h2 id="titulo-vendas" className="titulo-secao">
          Últimas vendas
        </h2>
        {vendas.length > 0 && (
          <Link href="/estoque?filtro=vendidos" prefetch className="link -my-3 inline-flex min-h-11 items-center text-sm">
            Ver todas
          </Link>
        )}
      </div>

      {vendas.length === 0 ? (
        <p className="px-4 pt-1 pb-5 text-sm text-suave md:px-5">
          Nenhuma venda ainda. Abra um item no Pátio e toque em <span className="font-semibold text-texto">Vendi</span>.
        </p>
      ) : (
        <>
          {/* Celular e tablet: lista */}
          <ul className="escalonado mt-3 divide-y divide-borda border-t border-borda lg:hidden">
            {vendas.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/estoque/${v.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-superficie-2 active:bg-superficie-2 md:px-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{v.nome}</span>
                    <span className="block text-[13px] text-suave tabular-nums">
                      {dataCurta(v.data, hoje)}
                      {v.dias != null && ` · ${diasTexto(v.dias)}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold tabular-nums">{reais(v.venda, true)}</span>
                    <span className="block text-[13px] tabular-nums">
                      <LucroVenda v={v} sinal />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Computador: tabela; a linha inteira abre o item */}
          <table className="mt-3 hidden w-full text-sm lg:table">
            <thead>
              <tr className="border-y border-borda bg-superficie-2">
                <th scope="col" className="sobrescrito py-2.5 pr-3 pl-5 text-left">Data</th>
                <th scope="col" className="sobrescrito px-3 py-2.5 text-left">Item</th>
                <th scope="col" className="sobrescrito px-3 py-2.5 text-right">Custo</th>
                <th scope="col" className="sobrescrito px-3 py-2.5 text-right">Vendeu</th>
                <th scope="col" className="sobrescrito px-3 py-2.5 text-right">Lucro</th>
                <th scope="col" className="sobrescrito px-3 py-2.5 text-right">Margem</th>
                <th scope="col" className="sobrescrito py-2.5 pr-5 pl-3 text-right">Dias</th>
              </tr>
            </thead>
            <tbody className="escalonado">
              {vendas.map((v) => (
                <tr
                  key={v.id}
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest("a")) router.push(`/estoque/${v.id}`);
                  }}
                  className="cursor-pointer border-b border-borda transition-colors duration-150 last:border-0 hover:bg-superficie-2"
                >
                  <td className="py-3 pr-3 pl-5 whitespace-nowrap text-suave tabular-nums">{dataCurta(v.data, hoje)}</td>
                  <td className="w-full max-w-0 px-3 py-3">
                    <Link href={`/estoque/${v.id}`} className="block truncate font-semibold hover:underline">
                      {v.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{reais(v.custo, true)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{reais(v.venda, true)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                    <LucroVenda v={v} />
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{v.margem == null ? "—" : pctTexto(v.margem, 0)}</td>
                  <td className="py-3 pr-5 pl-3 text-right whitespace-nowrap tabular-nums">{v.dias ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

// ---------- No pátio ----------

const MAX_PATIO = 8;

function Patio({ cartoes, empatado, className }: { cartoes: CartaoPatio[]; empatado: number; className: string }) {
  const n = cartoes.length;
  return (
    <section aria-labelledby="titulo-patio" className={`min-w-0 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="titulo-patio" className="titulo-secao">
          No pátio
          {n > 0 && (
            <span className="font-semibold text-suave">
              {" "}
              · {n} {n === 1 ? "item" : "itens"} · {reaisInteiros(empatado)} empatados
            </span>
          )}
        </h2>
        <Link href="/estoque" prefetch className="link -my-3 inline-flex min-h-11 shrink-0 items-center text-sm">
          Abrir estoque
        </Link>
      </div>
      {n === 0 ? (
        <p className="cartao text-sm text-suave">
          Pátio vazio. Toque em{" "}
          <Link href="/estoque/novo" className="link">
            + Novo item
          </Link>{" "}
          para registrar uma compra.
        </p>
      ) : (
        // Celular: carrossel que rola dentro dele mesmo. Do tablet em diante: grade.
        <ul className="escalonado rolagem-fina -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:p-0 lg:grid-cols-4">
          {cartoes.slice(0, MAX_PATIO).map((c) => (
            <li key={c.id} className="w-46 shrink-0 snap-start md:w-auto">
              <CartaoItem c={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CartaoItem({ c }: { c: CartaoPatio }) {
  return (
    <Link
      href={`/estoque/${c.id}`}
      className="cartao-link flex h-full flex-col overflow-hidden rounded-xl border border-borda bg-superficie shadow-(--sombra)"
    >
      <div className="relative h-28 shrink-0 border-b border-borda bg-superficie-2 md:h-32">
        {c.capa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.capa} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center font-display text-4xl font-bold text-suave/50" aria-hidden>
            {c.nome.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-1">
          <SeloSituacao situacao={c.situacao} capital={c.capital} />
          <SeloDias dias={c.dias} vendido={false} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="truncate font-bold">{c.nome}</span>
        <dl className="mt-1.5 space-y-0.5 text-[13px]">
          <div className="flex justify-between gap-2">
            <dt className="text-suave">{c.capital ? "Gastos" : "Custo"}</dt>
            <dd className="tabular-nums">{reais(c.custo, true)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-suave">Anúncio</dt>
            <dd className={`tabular-nums ${c.preco == null ? "text-suave" : ""}`}>{c.preco == null ? "—" : reais(c.preco, true)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            {c.capital ? (
              <>
                <dt className="sr-only">Lucro previsto</dt>
                <dd className="font-semibold text-suave">Entra no caixa</dd>
              </>
            ) : (
              <>
                <dt className="text-suave">Lucro prev.</dt>
                <dd
                  className={`font-semibold tabular-nums ${
                    c.lucroPrevisto == null ? "text-suave" : c.lucroPrevisto < 0 ? "text-ruim" : "text-bom"
                  }`}
                >
                  {c.lucroPrevisto == null ? "—" : reais(c.lucroPrevisto, true)}
                </dd>
              </>
            )}
          </div>
        </dl>
      </div>
    </Link>
  );
}
