import type { Metadata } from "next";
import Link from "next/link";
import { FormItem } from "@/components/FormItem";
import { hoje } from "@/lib/formato";

export const metadata: Metadata = { title: "Novo item" };

export default function NovoItem() {
  return (
    <>
      <Link href="/estoque" className="mb-3 inline-block text-sm text-suave hover:text-texto">← Estoque</Link>
      <h1 className="titulo-pagina mb-4">Novo item</h1>
      <FormItem hoje={hoje()} />
    </>
  );
}
