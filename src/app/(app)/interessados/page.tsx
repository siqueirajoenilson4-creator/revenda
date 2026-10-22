import type { Metadata } from "next";
import { contatos as lerContatos, itens as lerItens, respostas as lerRespostas } from "@/lib/dados";
import { ordenarContatos } from "@/lib/interessados";
import type { ContatoTela, ItemOpcao } from "@/components/interessados/tipos";
import { Interessados } from "./Interessados";

export const metadata: Metadata = { title: "Interessados" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function PaginaInteressados({ searchParams }: Props) {
  const [sp, lista, todos, rps] = await Promise.all([searchParams, lerContatos(), lerItens("capa"), lerRespostas()]);
  const agora = new Date();

  // Itens que ainda podem ter interessado, mais os vendidos que já têm alguém ligado.
  const usados = new Set(lista.flatMap((c) => (c.item_id ? [c.item_id] : [])));
  const itens: ItemOpcao[] = todos
    .filter((i) => i.situacao !== "vendido" || usados.has(i.id))
    .map((i) => ({
      id: i.id,
      nome: i.nome,
      capa: usados.has(i.id) ? i.fotos[0]?.assinada : undefined,
      preco: i.anuncio?.preco ?? i.preco_alvo,
      cidade: i.anuncio?.cidade ?? null,
      vendido: i.situacao === "vendido",
    }))
    .sort((a, b) => Number(a.vendido) - Number(b.vendido) || a.nome.localeCompare(b.nome, "pt-BR"));

  const contatos: ContatoTela[] = ordenarContatos(lista, agora).map((c) => ({
    id: c.id,
    item_id: c.item_id,
    canal: c.canal,
    nome: c.nome,
    telefone: c.telefone,
    oferta: c.oferta,
    situacao: c.situacao,
    proximo_passo: c.proximo_passo,
    retorno_em: c.retorno_em,
    aguardando_desde: c.aguardando_desde,
    atualizado_em: c.atualizado_em,
    mensagens: c.mensagens.map((m) => ({ id: m.id, direcao: m.direcao, texto: m.texto, enviada_em: m.enviada_em })),
  }));

  const item = texto(sp.item);
  return (
    <Interessados
      contatos={contatos}
      itens={itens}
      respostas={rps.map((r) => ({ id: r.id, titulo: r.titulo, texto: r.texto, ordem: r.ordem }))}
      agoraServidor={agora.toISOString()}
      filtroInicial={texto(sp.filtro)}
      itemInicial={itens.some((i) => i.id === item) ? item : ""}
      abrirNovo={texto(sp.novo) === "1"}
    />
  );
}
