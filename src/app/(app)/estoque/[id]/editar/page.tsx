import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormItem } from "@/components/FormItem";
import { item as lerItem } from "@/lib/dados";
import { hoje } from "@/lib/formato";

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
      <Link href={`/estoque/${i.id}`} className="mb-3 inline-block text-sm text-suave hover:text-texto">← {i.nome}</Link>
      <h1 className="titulo-pagina mb-4">Editar item</h1>
      <FormItem item={campos} hoje={hoje()} />
    </>
  );
}
