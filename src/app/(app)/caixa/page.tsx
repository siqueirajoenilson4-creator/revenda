import type { Metadata } from "next";
import { itens as lerItens, regras as lerRegras } from "@/lib/dados";
import { hoje } from "@/lib/formato";
import type { ItemCaixa } from "@/lib/caixa";
import { Caixa } from "./Caixa";

export const metadata: Metadata = { title: "Caixa" };

export default async function PaginaCaixa({ searchParams }: PageProps<"/caixa">) {
  const [sp, todos, regras] = await Promise.all([searchParams, lerItens("nenhuma"), lerRegras()]);
  // Só o que o extrato e os indicadores usam; o período é trocado no navegador, na hora.
  const itens: ItemCaixa[] = todos.map((i) => ({
    id: i.id,
    nome: i.nome,
    tipo: i.tipo,
    situacao: i.situacao,
    compra_valor: i.compra_valor,
    compra_data: i.compra_data,
    preco_alvo: i.preco_alvo,
    venda_valor: i.venda_valor,
    venda_data: i.venda_data,
    gastos: i.gastos.map((g) => ({ id: g.id, descricao: g.descricao, valor: g.valor, data: g.data })),
  }));
  return (
    <Caixa itens={itens} regras={regras} hoje={hoje()} periodoInicial={typeof sp.periodo === "string" ? sp.periodo : ""} />
  );
}
