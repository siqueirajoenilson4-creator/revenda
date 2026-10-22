import type { Metadata } from "next";
import { precisaRenovar } from "@/lib/anuncios";
import { diasParado } from "@/lib/calculo";
import { itens as lerItens } from "@/lib/dados";
import { hoje as hojeSP } from "@/lib/formato";
import { Cabecalho } from "@/components/Cabecalho";
import { ListaAnuncios, type LinhaAnuncio, type ParaRenovar } from "@/components/anuncio/ListaAnuncios";
import { plural } from "@/components/anuncio/util";

export const metadata: Metadata = { title: "Anúncios" };

export default async function PaginaAnuncios({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const hoje = hojeSP();
  const patio = (await lerItens("capa")).filter((i) => i.situacao !== "vendido");

  const renovar: ParaRenovar[] = [];
  const linhas: LinhaAnuncio[] = patio.map((i) => {
    const capa = i.fotos[0]?.assinada;
    const publicacoes = i.anuncio?.publicacoes ?? [];
    for (const p of publicacoes) {
      if (precisaRenovar(p, hoje)) {
        renovar.push({ id: p.id, itemId: i.id, nome: i.nome, capa, canal: p.canal, link: p.link, renovar_em: p.renovar_em! });
      }
    }
    return {
      id: i.id,
      nome: i.nome,
      categoria: i.categoria,
      capa,
      preco: i.anuncio?.preco ?? i.preco_alvo,
      dias: diasParado(i, hoje),
      temAnuncio: i.anuncio != null,
      canais: publicacoes.map((p) => ({
        id: p.id,
        canal: p.canal,
        situacao: p.situacao,
        renovar: precisaRenovar(p, hoje),
      })),
    };
  });
  renovar.sort((a, b) => a.renovar_em.localeCompare(b.renovar_em));
  const publicados = linhas.filter((l) => l.canais.some((c) => c.situacao === "publicado")).length;

  return (
    <>
      <Cabecalho
        titulo="Anúncios"
        sobre={`${plural(publicados, "publicado", "publicados")} · ${renovar.length} para renovar`}
      />
      <ListaAnuncios
        linhas={linhas}
        renovar={renovar}
        hoje={hoje}
        filtroInicial={typeof sp.filtro === "string" ? sp.filtro : "todos"}
      />
    </>
  );
}
