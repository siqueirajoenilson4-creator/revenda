import type { Metadata } from "next";
import { itens } from "@/lib/dados";
import { iaConfigurada } from "@/lib/ia";
import { Cabecalho } from "@/components/Cabecalho";
import { Chat } from "./Chat";

export const metadata: Metadata = { title: "Assistente" };

export default async function PaginaAssistente({ searchParams }: PageProps<"/assistente">) {
  // itens() também confere se quem entrou é o dono.
  const [{ anuncio }, todos] = await Promise.all([searchParams, itens("nenhuma")]);
  const alvo = typeof anuncio === "string" ? todos.find((i) => i.id === anuncio) : undefined;

  return (
    <>
      <Cabecalho sobre="Assistente com IA" titulo="Assistente" sub="Pergunte dos números, decida uma compra ou peça um anúncio." />
      <Chat
        configurado={iaConfigurada()}
        pedidoInicial={alvo ? `Escreva o anúncio de "${alvo.nome}" (id ${alvo.id}) para OLX e Facebook Marketplace.` : undefined}
      />
    </>
  );
}
