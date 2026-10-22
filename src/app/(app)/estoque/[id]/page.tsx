import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { custoItem, diasParado, lucroItem } from "@/lib/calculo";
import { item as lerItem, resumoAcoes, usuario } from "@/lib/dados";
import { dataBR, hoje as hojeSP, reais } from "@/lib/formato";
import { ItemAcoes } from "@/components/ItemAcoes";
import { Fotos } from "@/components/Fotos";
import { ApagarGasto, DesfazerVenda } from "@/components/BotoesItem";
import { SeloDias, SeloSituacao } from "@/components/Selos";

export async function generateMetadata({ params }: PageProps<"/estoque/[id]">): Promise<Metadata> {
  const i = await lerItem((await params).id);
  return { title: i?.nome ?? "Item" };
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-borda py-2 last:border-0">
      <dt className="text-suave">{rotulo}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export default async function DetalheItem({ params }: PageProps<"/estoque/[id]">) {
  const { id } = await params;
  const [i, { id: userId }] = await Promise.all([lerItem(id), usuario()]);
  if (!i) redirect("/estoque"); // apagado ou inexistente

  const hoje = hojeSP();
  const custo = custoItem(i);
  const lucro = lucroItem(i);
  const capital = i.tipo === "capital";

  return (
    <>
      <Link href="/estoque" className="mb-3 inline-block text-sm text-suave hover:text-texto">← Estoque</Link>
      <div className="mb-3">
        <h1 className="titulo-pagina break-words">{i.nome}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <SeloSituacao situacao={i.situacao} capital={capital} />
          <SeloDias dias={diasParado(i, hoje)} vendido={i.situacao === "vendido"} />
          {i.categoria && <span className="text-sm text-suave">{i.categoria}</span>}
        </div>
      </div>

      <div className="mb-4">
        <ItemAcoes item={resumoAcoes(i)} hoje={hoje} noDetalhe />
        {i.situacao !== "vendido" && (
          <Link href={`/assistente?anuncio=${i.id}`} className="botao-pequeno mt-2">
            Escrever anúncio com o assistente
          </Link>
        )}
      </div>

      <section className="mb-4">
        <Fotos itemId={i.id} userId={userId} nome={i.nome} fotos={i.fotos.map((f) => ({ id: f.id, assinada: f.assinada }))} />
      </section>

      {i.nota && (
        <p className="mb-4 rounded-xl bg-atencao-fundo px-3 py-2 text-sm text-atencao">{i.nota}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <section className="cartao">
          <h2 className="mb-1 font-semibold">Números</h2>
          <dl className="text-sm">
            <Linha rotulo={capital ? "Compra (capital próprio)" : "Compra"}>
              {capital ? "—" : reais(i.compra_valor)}
            </Linha>
            <Linha rotulo="Gastos">{reais(custo - (capital ? 0 : i.compra_valor))}</Linha>
            <Linha rotulo="Custo total">{reais(custo)}</Linha>
            <Linha rotulo="Preço de anúncio">{reais(i.preco_alvo)}</Linha>
            {i.situacao === "vendido" ? (
              <>
                <Linha rotulo="Vendido por">{reais(i.venda_valor)}</Linha>
                <Linha rotulo="Lucro">
                  {capital ? (
                    <span className="text-suave">não conta (capital)</span>
                  ) : (
                    <span className={lucro! > 0 ? "text-bom" : "text-ruim"}>{reais(lucro)}</span>
                  )}
                </Linha>
              </>
            ) : (
              !capital &&
              i.preco_alvo != null && (
                <Linha rotulo="Lucro previsto">
                  <span className={i.preco_alvo - custo > 0 ? "text-bom" : "text-ruim"}>{reais(i.preco_alvo - custo)}</span>
                </Linha>
              )
            )}
            <Linha rotulo="Comprado em">
              {dataBR(i.compra_data)}
              {i.compra_local && <span className="block text-xs font-normal text-suave">{i.compra_local}</span>}
            </Linha>
            {i.venda_data && <Linha rotulo="Vendido em">{dataBR(i.venda_data)}</Linha>}
          </dl>
          {i.situacao === "vendido" && (
            <div className="mt-3">
              <DesfazerVenda id={i.id} />
            </div>
          )}
        </section>

        <section className="cartao">
          <h2 className="mb-1 font-semibold">Gastos</h2>
          {i.gastos.length === 0 ? (
            <p className="text-sm text-suave">Nenhum gasto lançado. Use “+ Gasto”.</p>
          ) : (
            <ul className="text-sm">
              {i.gastos.map((g) => (
                <li key={g.id} className="flex items-start justify-between gap-3 border-b border-borda py-2 last:border-0">
                  <div className="min-w-0">
                    <div className="break-words">{g.descricao}</div>
                    <div className="text-xs text-suave">
                      {dataBR(g.data)} · <ApagarGasto id={g.id} />
                    </div>
                  </div>
                  <div className="shrink-0 font-medium tabular-nums">{reais(g.valor)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
