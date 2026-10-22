import type { Metadata } from "next";
import { custoItem } from "@/lib/calculo";
import { contatos as lerContatos, itens as lerItens } from "@/lib/dados";
import { hoje } from "@/lib/formato";
import { ativo } from "@/lib/interessados";
import { Cabecalho } from "@/components/Cabecalho";
import { FormVenda, type InteressadoVenda, type ItemParaVenda } from "@/components/FormVenda";
import { Voltar } from "../../estoque/Voltar";

export const metadata: Metadata = { title: "Registrar venda" };

export default async function NovaVenda({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, todos, todosContatos] = await Promise.all([searchParams, lerItens("capa"), lerContatos()]);

  // Anunciados primeiro: é deles que sai a maior parte das vendas.
  const noPatio = todos
    .filter((i) => i.situacao !== "vendido")
    .sort((a, b) => Number(b.situacao === "anunciado") - Number(a.situacao === "anunciado"));
  const itens: ItemParaVenda[] = noPatio.map((i) => ({
    id: i.id,
    nome: i.nome,
    categoria: i.categoria,
    tipo: i.tipo,
    custo: custoItem(i),
    preco_alvo: i.preco_alvo,
    capa: i.fotos[0]?.assinada,
  }));
  const contatos: InteressadoVenda[] = todosContatos
    .filter((c) => ativo(c) && c.item_id)
    .map((c) => ({ id: c.id, nome: c.nome, item_id: c.item_id, canal: c.canal, telefone: c.telefone }));

  const pedido = typeof sp.item === "string" ? itens.find((i) => i.id === sp.item) : undefined;

  return (
    <>
      {pedido ? (
        <Voltar href={`/estoque/${pedido.id}`}>{pedido.nome}</Voltar>
      ) : (
        <Voltar href="/vendas">Vendas</Voltar>
      )}
      <Cabecalho sobre="Vendas" titulo="Registrar venda" sub="O item sai do pátio e o valor entra no caixa." />
      <FormVenda itens={itens} inicial={pedido?.id} contatos={contatos} hoje={hoje()} />
    </>
  );
}
