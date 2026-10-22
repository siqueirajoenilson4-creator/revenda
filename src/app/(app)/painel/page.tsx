import type { Metadata } from "next";
import { itens as lerItens, regras as lerRegras } from "@/lib/dados";
import { hoje } from "@/lib/formato";
import { Painel } from "./Painel";

export const metadata: Metadata = { title: "Painel" };

export default async function PaginaPainel() {
  const [todos, r] = await Promise.all([lerItens("nenhuma"), lerRegras()]);
  // O navegador recebe só o necessário; filtros e períodos são calculados lá, na hora.
  const itens = todos.map((i) => ({
    id: i.id,
    nome: i.nome,
    tipo: i.tipo,
    situacao: i.situacao,
    compra_valor: i.compra_valor,
    compra_data: i.compra_data,
    preco_alvo: i.preco_alvo,
    venda_valor: i.venda_valor,
    venda_data: i.venda_data,
    gastos: i.gastos.map((g) => ({ valor: g.valor })),
  }));
  return <Painel itens={itens} regras={r} hoje={hoje()} />;
}
