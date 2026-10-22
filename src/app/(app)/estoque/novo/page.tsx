import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { FormItem } from "@/components/FormItem";
import { hoje } from "@/lib/formato";
import { Voltar } from "../Voltar";

export const metadata: Metadata = { title: "Novo item" };

export default function NovoItem() {
  return (
    <>
      <Voltar href="/estoque">Pátio / Estoque</Voltar>
      <Cabecalho sobre="Cadastro" titulo="Novo item" sub="O que você comprou e quanto pagou." />
      <FormItem hoje={hoje()} />
    </>
  );
}
