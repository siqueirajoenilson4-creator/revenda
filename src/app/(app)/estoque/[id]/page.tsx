import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { custoItem, diasParado, lucroItem } from "@/lib/calculo";
import { item as lerItem, resumoAcoes, usuario } from "@/lib/dados";
import { dataBR, hoje as hojeSP, pctTexto, reais } from "@/lib/formato";
import { Cabecalho, Indicador } from "@/components/Cabecalho";
import { ItemAcoes } from "@/components/ItemAcoes";
import { Fotos } from "@/components/Fotos";
import { ApagarGasto, DesfazerVenda } from "@/components/BotoesItem";
import { SeloDias, SeloSituacao } from "@/components/Selos";
import { Voltar } from "../Voltar";

export async function generateMetadata({ params }: PageProps<"/estoque/[id]">): Promise<Metadata> {
  const i = await lerItem((await params).id);
  return { title: i?.nome ?? "Item" };
}

function Linha({ rotulo, forte, children }: { rotulo: string; forte?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex justify-between gap-4 py-2 ${forte ? "border-t border-borda-forte font-bold" : "border-t border-borda first:border-0"}`}>
      <dt className={forte ? "" : "text-suave"}>{rotulo}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function DetalheItem({ params }: PageProps<"/estoque/[id]">) {
  const { id } = await params;
  const [i, { id: userId }] = await Promise.all([lerItem(id), usuario()]);
  if (!i) redirect("/estoque"); // apagado ou inexistente

  const hoje = hojeSP();
  const custo = custoItem(i);
  const capital = i.tipo === "capital";
  const vendido = i.situacao === "vendido";
  const gastos = i.gastos.reduce((s, g) => s + g.valor, 0);
  const dias = diasParado(i, hoje);
  // Realizado quando vendido; senão o previsto pelo preço de anúncio (capital não tem lucro).
  const lucro = vendido ? lucroItem(i) : !capital && i.preco_alvo != null ? i.preco_alvo - custo : null;
  const margem = lucro != null && custo > 0 ? lucro / custo : null;

  // Regras do pátio: aos 30 dias baixar 10%; com 45 ou mais, vender a preço de custo.
  const alertaDias = !vendido && dias != null && dias > 30;
  const detalheDias = vendido
    ? `comprado em ${dataBR(i.compra_data)}`
    : dias != null && dias >= 45
      ? "regra: vender a preço de custo"
      : alertaDias
        ? "regra: baixar 10%"
        : i.compra_data
          ? `desde ${dataBR(i.compra_data)}`
          : "sem data de compra";

  return (
    <>
      <Voltar href="/estoque">Pátio / Estoque</Voltar>
      <Cabecalho
        sobre={i.categoria ?? undefined}
        titulo={<span className="break-words">{i.nome}</span>}
        sub={
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <SeloSituacao situacao={i.situacao} capital={capital} />
            <SeloDias dias={dias} vendido={vendido} />
          </span>
        }
      />

      <div className="entra mb-5">
        <ItemAcoes item={resumoAcoes(i)} hoje={hoje} noDetalhe />
      </div>

      <section aria-label="Números do item" className="escalonado mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador
          rotulo="Custo total"
          valor={reais(custo, true)}
          detalhe={
            capital
              ? "capital: só os gastos"
              : gastos
                ? `${reais(i.compra_valor, true)} + ${reais(gastos, true)} de gastos`
                : "sem gastos lançados"
          }
        />
        {vendido ? (
          <Indicador rotulo="Vendido por" valor={reais(i.venda_valor, true)} detalhe={`em ${dataBR(i.venda_data)}`} />
        ) : (
          <Indicador
            rotulo="Preço de anúncio"
            valor={reais(i.preco_alvo, true)}
            detalhe={i.preco_alvo == null ? "ainda sem preço" : i.situacao === "anunciado" ? "anunciado" : "ainda não anunciado"}
          />
        )}
        <Indicador
          destaque
          rotulo={vendido ? "Lucro" : "Lucro previsto"}
          valor={capital ? "—" : reais(lucro, true)}
          tom={lucro != null && lucro <= 0 ? "ruim" : undefined}
          detalhe={
            capital
              ? "capital: entra no caixa"
              : margem != null
                ? `${pctTexto(margem, 0)} sobre o custo`
                : "falta o preço de anúncio"
          }
        />
        <Indicador
          rotulo={vendido ? "Dias até vender" : "Dias no pátio"}
          valor={dias == null ? "—" : plural(dias, "dia", "dias")}
          tom={!vendido && dias != null ? (dias > 30 ? "ruim" : dias > 15 ? "atencao" : undefined) : undefined}
          detalhe={detalheDias}
          tomDetalhe={alertaDias ? (dias! >= 45 ? "ruim" : "atencao") : undefined}
        />
      </section>

      {i.nota && (
        <section aria-label="Nota" className="entra mb-4 rounded-xl bg-atencao-fundo px-4 py-3 text-atencao">
          <h2 className="sobrescrito text-atencao">Nota</h2>
          <p className="mt-0.5 text-[15px] break-words whitespace-pre-line">{i.nota}</p>
        </section>
      )}

      <div className="escalonado grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <section className="cartao md:p-5">
            <Fotos itemId={i.id} userId={userId} nome={i.nome} fotos={i.fotos.map((f) => ({ id: f.id, assinada: f.assinada }))} />
          </section>

          <section className="cartao p-0">
            <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2 md:px-5">
              <h2 className="titulo-secao">Gastos</h2>
              <span className="text-[13px] text-suave">{plural(i.gastos.length, "lançamento", "lançamentos")}</span>
            </div>
            {i.gastos.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-suave md:px-5">
                Nenhum gasto lançado. Use <strong className="font-semibold text-texto">+ Gasto</strong> para conserto,
                limpeza, frete ou documento.
              </p>
            ) : (
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="border-b border-borda text-left">
                    <th className="sobrescrito py-2 pr-3 pl-4 font-semibold md:pl-5">Data</th>
                    <th className="sobrescrito py-2 pr-3 font-semibold">Com o quê</th>
                    <th className="sobrescrito py-2 pr-1 text-right font-semibold">Valor</th>
                    <th className="w-0 pr-2 md:pr-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="escalonado">
                  {i.gastos.map((g) => (
                    <tr key={g.id} className="border-b border-borda">
                      <td className="py-1.5 pr-3 pl-4 whitespace-nowrap text-suave md:pl-5">
                        <time dateTime={g.data} title={dataBR(g.data)}>{dataBR(g.data).slice(0, 5)}</time>
                      </td>
                      <td className="w-full max-w-0 py-1.5 pr-3 break-words">{g.descricao}</td>
                      <td className="py-1.5 pr-1 text-right font-semibold whitespace-nowrap">{reais(g.valor)}</td>
                      <td className="py-1 pr-2 text-right whitespace-nowrap md:pr-3">
                        <ApagarGasto id={g.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="py-3 pr-3 pl-4 font-semibold md:pl-5">Total em gastos</td>
                    <td className="numero py-3 pr-1 text-right text-xl">{reais(gastos)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
        </div>

        <section className="cartao md:p-5">
          <h2 className="titulo-secao mb-1">Resumo</h2>
          <dl className="text-[15px]">
            <Linha rotulo="Comprado em">
              {dataBR(i.compra_data)}
              {i.compra_local && <span className="block text-[13px] font-normal text-suave">{i.compra_local}</span>}
            </Linha>
            <Linha rotulo={capital ? "Compra" : "Paguei"}>
              {capital ? <span className="font-normal text-suave">capital próprio</span> : reais(i.compra_valor)}
            </Linha>
            <Linha rotulo="Gastos">{reais(gastos)}</Linha>
            <Linha rotulo="Custo total" forte>{reais(custo)}</Linha>
            <Linha rotulo="Preço de anúncio">{reais(i.preco_alvo)}</Linha>
            {vendido && (
              <>
                <Linha rotulo="Vendido em">{dataBR(i.venda_data)}</Linha>
                <Linha rotulo="Vendido por">{reais(i.venda_valor)}</Linha>
              </>
            )}
            {capital ? (
              vendido && (
                <Linha rotulo="Lucro" forte>
                  <span className="font-normal text-suave">não conta (capital)</span>
                </Linha>
              )
            ) : (
              lucro != null && (
                <Linha rotulo={vendido ? "Lucro" : "Lucro previsto"} forte>
                  <span className={lucro > 0 ? "text-bom" : "text-ruim"}>{reais(lucro)}</span>
                </Linha>
              )
            )}
          </dl>
          {vendido && (
            <div className="mt-3 border-t border-borda pt-4">
              <DesfazerVenda id={i.id} />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
