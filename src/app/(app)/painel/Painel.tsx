"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  custoItem,
  diasEntre,
  diasParado,
  limitePorItem,
  lucroItem,
  lucroPorMes,
  resumo,
  type ItemCalc,
  type Regras,
} from "@/lib/calculo";
import { dataBR, pctTexto, reais } from "@/lib/formato";
import { mesesEntre, periodo, PERIODOS, type PeriodoId } from "@/lib/periodo";
import { Cabecalho, Indicador, Segmentos } from "@/components/Cabecalho";
import { GraficoLucro } from "@/components/GraficoLucro";
import { SeloDias } from "@/components/Selos";

type ItemPainel = ItemCalc & { id: string; nome: string; preco_alvo: number | null };

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function dataExtenso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS_SEMANA[dia]}, ${d} de ${MESES[m - 1]}`;
}

export function Painel({ itens, regras, hoje }: { itens: ItemPainel[]; regras: Regras; hoje: string }) {
  const [periodoId, setPeriodoId] = useState<PeriodoId>("mes");
  const res = useMemo(() => resumo(itens, regras, periodo(periodoId, hoje)), [itens, regras, periodoId, hoje]);
  const limite = limitePorItem(res.caixaLivre, regras);

  const estoque = itens.filter((i) => i.situacao !== "vendido");
  const revendaAberta = estoque.filter((i) => i.tipo === "revenda");
  const comPreco = revendaAberta.filter((i) => i.preco_alvo != null);
  const lucroPrevisto = comPreco.reduce((s, i) => s + (i.preco_alvo! - custoItem(i)), 0);
  const capital = itens.filter((i) => i.tipo === "capital");
  const capitalAberto = capital.filter((i) => i.situacao !== "vendido");

  const parados = estoque
    .map((i) => ({ i, dias: diasParado(i, hoje) ?? 0 }))
    .filter((x) => x.dias > 15)
    .sort((a, b) => b.dias - a.dias);

  const ultimasVendas = itens
    .filter((i) => i.situacao === "vendido" && i.venda_data)
    .sort((a, b) => b.venda_data!.localeCompare(a.venda_data!))
    .slice(0, 6);

  const porMes = lucroPorMes(itens);
  const ultimos12 = mesesEntre(`${Number(hoje.slice(0, 4)) - 1}-${hoje.slice(5, 7)}`, hoje.slice(0, 7))
    .slice(-12)
    .map((mes) => ({ mes, lucro: porMes.get(mes) ?? 0 }));
  const temVendas = ultimos12.some((m) => m.lucro !== 0);

  const contagem = {
    parados: itens.filter((i) => i.situacao === "comprado").length,
    anunciados: itens.filter((i) => i.situacao === "anunciado").length,
    vendidos: itens.filter((i) => i.situacao === "vendido").length,
  };

  return (
    <>
      <Cabecalho
        titulo="Painel"
        sub={<span className="first-letter:uppercase">{dataExtenso(hoje)}</span>}
        acoes={
          <>
            <Link href="/calcular" prefetch className="botao-secundario">Calcular compra</Link>
            <Link href="/estoque/novo" className="botao-principal">+ Novo item</Link>
          </>
        }
      />

      {limite == null && (
        <div className="mb-4 rounded-xl border border-ruim/30 bg-ruim-fundo px-4 py-3 text-sm font-medium text-ruim">
          Caixa zerado: venda a moto antes de comprar.
        </div>
      )}

      {/* Foto de agora */}
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          destaque
          rotulo="Caixa livre"
          valor={reais(res.caixaLivre, true)}
          tom={res.caixaLivre < 0 ? "ruim" : undefined}
          detalhe={limite == null ? "Sem caixa para comprar" : `Até ${reais(limite, true)} por item`}
        />
        <Indicador
          rotulo="Empatado em estoque"
          valor={reais(res.empatado, true)}
          detalhe={`${res.empatadoQtd} ${res.empatadoQtd === 1 ? "item" : "itens"} sem vender`}
        />
        <Indicador
          rotulo="Lucro previsto"
          valor={reais(lucroPrevisto, true)}
          tom={lucroPrevisto < 0 ? "ruim" : undefined}
          detalhe={
            revendaAberta.length
              ? `${comPreco.length} de ${revendaAberta.length} com preço de anúncio`
              : "Nenhum item de revenda em estoque"
          }
        />
        <Indicador
          rotulo="Capital da moto"
          valor={
            capitalAberto.length
              ? capitalAberto.some((i) => i.preco_alvo != null)
                ? reais(capitalAberto.reduce((s, i) => s + (i.preco_alvo ?? 0), 0), true)
                : "Sem preço"
              : capital.length
                ? reais(capital.reduce((s, i) => s + (i.venda_valor ?? 0), 0), true)
                : "—"
          }
          detalhe={
            capitalAberto.length
              ? `Gastos até agora: ${reais(capitalAberto.reduce((s, i) => s + custoItem(i), 0), true)}`
              : capital.length
                ? "Vendida, entrou no caixa"
                : "Nenhum item de capital"
          }
        />
      </section>

      {/* Resultado do período */}
      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Resultado</h2>
          <Segmentos opcoes={PERIODOS} valor={periodoId} aoMudar={setPeriodoId} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador
            rotulo="Lucro realizado"
            valor={reais(res.lucroRealizado, true)}
            tom={res.lucroRealizado < 0 ? "ruim" : res.lucroRealizado > 0 ? "bom" : undefined}
            detalhe={`${res.vendidos} ${res.vendidos === 1 ? "venda" : "vendas"}`}
          />
          <Indicador rotulo="Faturamento" valor={reais(res.vendasRevenda, true)} detalhe="Soma das vendas de revenda" />
          <Indicador rotulo="Margem média" valor={pctTexto(res.margemMedia)} detalhe="Lucro ÷ faturamento" />
          <Indicador
            rotulo="Giro médio"
            valor={res.giroMedio == null ? "—" : `${Math.round(res.giroMedio)} dias`}
            detalhe="Da compra até a venda"
          />
        </div>
        <p className="mt-2 text-xs text-suave">A moto (capital próprio) entra no caixa, mas não em lucro, margem e giro.</p>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="cartao lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Lucro por mês</h2>
            <span className="text-xs text-suave">últimos 12 meses</span>
          </div>
          {temVendas ? (
            <GraficoLucro meses={ultimos12} />
          ) : (
            <p className="py-10 text-center text-sm text-suave">O gráfico aparece depois da primeira venda de revenda.</p>
          )}
        </section>

        <section className="cartao flex flex-col">
          <h2 className="mb-1 text-base font-semibold">Precisa de atenção</h2>
          <p className="mb-3 text-xs text-suave">Parados há mais de 15 dias</p>
          {parados.length === 0 ? (
            <p className="flex-1 py-6 text-center text-sm text-suave">Nenhum item parado há muito tempo.</p>
          ) : (
            <ul className="-mx-2 flex-1">
              {parados.slice(0, 6).map(({ i, dias }) => (
                <li key={i.id}>
                  <Link
                    href={`/estoque/${i.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-superficie-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{i.nome}</div>
                      <div className="text-xs text-suave">Custo {reais(custoItem(i), true)}</div>
                    </div>
                    <SeloDias dias={dias} vendido={false} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-borda pt-3 text-center">
            {[
              ["Parados", contagem.parados, "parados"],
              ["Anunciados", contagem.anunciados, "anunciados"],
              ["Vendidos", contagem.vendidos, "vendidos"],
            ].map(([rotulo, n, filtro]) => (
              <Link key={filtro} href={`/estoque?filtro=${filtro}`} prefetch className="rounded-lg py-1 hover:bg-superficie-2">
                <div className="text-lg font-semibold tabular-nums">{n}</div>
                <div className="text-xs text-suave">{rotulo}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="cartao p-0">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="text-base font-semibold">Últimas vendas</h2>
          <Link href="/estoque?filtro=vendidos" prefetch className="text-sm font-medium text-marca hover:underline">Ver todas</Link>
        </div>
        {ultimasVendas.length === 0 ? (
          <p className="px-4 pb-6 pt-2 text-sm text-suave">Nenhuma venda ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-suave">
              <tr className="border-b border-borda">
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Data</th>
                <th className="px-3 py-2 text-right font-medium">Venda</th>
                <th className="px-4 py-2 text-right font-medium">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {ultimasVendas.map((i) => {
                const l = lucroItem(i);
                return (
                  <tr key={i.id} className="border-b border-borda last:border-0">
                    <td className="max-w-0 px-4 py-2.5">
                      <Link href={`/estoque/${i.id}`} className="block truncate font-medium hover:underline">{i.nome}</Link>
                      <div className="text-xs text-suave sm:hidden">{dataBR(i.venda_data)}</div>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-suave sm:table-cell">
                      {dataBR(i.venda_data)}
                      {i.compra_data && (
                        <span className="text-xs"> · {diasEntre(i.compra_data, i.venda_data!)} dias</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{reais(i.venda_valor, true)}</td>
                    <td className={`whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums ${l == null ? "text-suave" : l > 0 ? "text-bom" : "text-ruim"}`}>
                      {l == null ? "capital" : reais(l, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
