import type { Metadata } from "next";
import { caixaLivre, limitePorItem } from "@/lib/calculo";
import { itens, regras } from "@/lib/dados";
import { hoje } from "@/lib/formato";
import { Calculadora } from "./Calculadora";
import { Cabecalho } from "@/components/Cabecalho";

export const metadata: Metadata = { title: "Calcular" };

export default async function Calcular() {
  const r = await regras();
  const caixa = caixaLivre(await itens("nenhuma"), r);
  return (
    <>
      <Cabecalho titulo="Calcular compra" sub="Quanto pagar no máximo sem perder a margem" />
      <Calculadora regras={r} caixa={caixa} limite={limitePorItem(caixa, r)} hoje={hoje()} />
    </>
  );
}
