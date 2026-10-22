import type { Metadata } from "next";
import { itens as lerItens, regras as lerRegras } from "@/lib/dados";
import { hoje } from "@/lib/formato";
import type { ItemVisao } from "@/lib/visao";
import { Painel } from "./Painel";

export const metadata: Metadata = { title: "Visão geral" };

export default async function PaginaPainel() {
  const [todos, r] = await Promise.all([lerItens("capa"), lerRegras()]);
  // O navegador recebe só o necessário; filtros e períodos são calculados lá, na hora.
  const itens: ItemVisao[] = todos.map((i) => {
    const noPatio = i.situacao !== "vendido";
    return {
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
      // Capa (link assinado) e nota só servem aos cartões do pátio e aos avisos.
      capa: noPatio ? i.fotos[0]?.assinada : undefined,
      nota: noPatio ? i.nota : null,
    };
  });
  return <Painel itens={itens} regras={r} hoje={hoje()} />;
}
