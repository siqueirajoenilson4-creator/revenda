import type { Metadata } from "next";
import { respostas as lerRespostas } from "@/lib/dados";
import { Voltar } from "../../estoque/Voltar";
import { EditorRespostas } from "./EditorRespostas";

export const metadata: Metadata = { title: "Respostas prontas" };

export default async function PaginaRespostas() {
  const lista = await lerRespostas();
  return (
    <>
      <Voltar href="/interessados">Interessados</Voltar>
      <EditorRespostas respostas={lista.map((r) => ({ id: r.id, titulo: r.titulo, texto: r.texto, ordem: r.ordem }))} />
    </>
  );
}
