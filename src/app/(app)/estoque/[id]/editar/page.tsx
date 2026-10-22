import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { FormItem } from "@/components/FormItem";
import { item as lerItem } from "@/lib/dados";
import { hoje } from "@/lib/formato";
import { Voltar } from "../../Voltar";

export const metadata: Metadata = { title: "Editar item" };

export default async function EditarItem({ params }: PageProps<"/estoque/[id]/editar">) {
  const i = await lerItem((await params).id);
  if (!i) redirect("/estoque");
  const campos = {
    id: i.id, nome: i.nome, categoria: i.categoria, tipo: i.tipo, situacao: i.situacao,
    compra_valor: i.compra_valor, compra_data: i.compra_data, compra_local: i.compra_local,
    preco_alvo: i.preco_alvo, venda_valor: i.venda_valor, venda_data: i.venda_data, nota: i.nota,
  };
  return (
    <>
      <Voltar href={`/estoque/${i.id}`}>Voltar ao item</Voltar>
      <Cabecalho sobre="Editar item" titulo={<span className="break-words">{i.nome}</span>} />
      <FormItem item={campos} hoje={hoje()} />
    </>
  );
}
