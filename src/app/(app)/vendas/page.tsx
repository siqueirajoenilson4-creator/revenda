import type { Metadata } from "next";
import { itens as lerItens } from "@/lib/dados";
import { hoje } from "@/lib/formato";
import { PERIODOS, type PeriodoId } from "@/lib/periodo";
import { CANAIS, PAGAMENTOS, linhasVendas, type Canal, type Pagamento } from "@/lib/vendas";
import { Vendas } from "./Vendas";

export const metadata: Metadata = { title: "Vendas" };

const um = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function PaginaVendas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, todos] = await Promise.all([searchParams, lerItens("nenhuma")]);
  // Só as vendas, já com custo, lucro, margem e dias; filtros e totais são feitos no navegador.
  const linhas = linhasVendas(todos);

  const periodo = PERIODOS.find((p) => p.id === um(sp.periodo))?.id ?? "mes";
  const canal = um(sp.canal);
  const pagamento = um(sp.pagamento);

  return (
    <Vendas
      linhas={linhas}
      hoje={hoje()}
      inicial={{
        periodo: periodo as PeriodoId,
        canal: canal === "nao_informado" || CANAIS.some((c) => c.id === canal) ? (canal as Canal | "nao_informado") : "",
        pagamento:
          pagamento === "nao_informado" || PAGAMENTOS.some((p) => p.id === pagamento)
            ? (pagamento as Pagamento | "nao_informado")
            : "",
        busca: um(sp.q) ?? "",
      }}
    />
  );
}
