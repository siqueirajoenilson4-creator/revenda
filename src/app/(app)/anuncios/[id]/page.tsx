import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { item as lerItem } from "@/lib/dados";
import { hoje as hojeSP } from "@/lib/formato";
import { Cabecalho } from "@/components/Cabecalho";
import { EditorAnuncio } from "@/components/anuncio/EditorAnuncio";
import { Voltar } from "../../estoque/Voltar";

export async function generateMetadata({ params }: PageProps<"/anuncios/[id]">): Promise<Metadata> {
  const i = await lerItem((await params).id);
  return { title: i ? `Anúncio · ${i.nome}` : "Anúncio" };
}

/** Editor do anúncio de um item (o [id] é o do item): texto, fotos e canais. */
export default async function PaginaAnuncio({ params }: PageProps<"/anuncios/[id]">) {
  const i = await lerItem((await params).id);
  if (!i) redirect("/anuncios");

  return (
    <>
      <Voltar href="/anuncios">Anúncios</Voltar>
      <Cabecalho sobre={i.categoria ?? undefined} titulo={<span className="break-words">{i.nome}</span>} />
      <EditorAnuncio
        item={{
          id: i.id,
          nome: i.nome,
          categoria: i.categoria,
          preco_alvo: i.preco_alvo,
          gastos: i.gastos.map((g) => g.descricao),
        }}
        anuncio={i.anuncio}
        fotos={i.fotos.map((f) => ({ id: f.id, assinada: f.assinada }))}
        hoje={hojeSP()}
      />
    </>
  );
}
