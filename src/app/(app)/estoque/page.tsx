import type { Metadata } from "next";
import { custoItem, diasParado, lucroItem } from "@/lib/calculo";
import { itens as lerItens, resumoAcoes } from "@/lib/dados";
import { hoje as hojeSP } from "@/lib/formato";
import { Estoque, type LinhaEstoque } from "./Estoque";

export const metadata: Metadata = { title: "Estoque" };

export default async function PaginaEstoque({ searchParams }: PageProps<"/estoque">) {
  const sp = await searchParams;
  const hoje = hojeSP();
  const todos = await lerItens("capa");

  const linhas: LinhaEstoque[] = todos.map((i) => {
    const custo = custoItem(i);
    const realizado = lucroItem(i);
    const previsto =
      realizado == null && i.tipo === "revenda" && i.situacao !== "vendido" && i.preco_alvo != null
        ? i.preco_alvo - custo
        : null;
    return {
      ...resumoAcoes(i),
      categoria: i.categoria,
      capa: i.fotos[0]?.assinada,
      busca: [i.nome, i.categoria, i.compra_local, i.nota].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR"),
      venda_valor: i.venda_valor,
      venda_data: i.venda_data,
      dias: diasParado(i, hoje),
      lucro: realizado ?? previsto,
      lucroPrevisto: previsto != null,
    };
  });

  return (
    <Estoque
      linhas={linhas}
      hoje={hoje}
      filtroInicial={typeof sp.filtro === "string" ? sp.filtro : "estoque"}
      buscaInicial={typeof sp.q === "string" ? sp.q : ""}
    />
  );
}
