import { exportarCSV, exportarJSON } from "@/lib/backup";
import { contatos, itens, regras, respostas } from "@/lib/dados";
import { hoje } from "@/lib/formato";

export async function GET(request: Request) {
  const formato = new URL(request.url).searchParams.get("formato") === "csv" ? "csv" : "json";
  const [lista, r] = await Promise.all([itens("nenhuma"), regras()]);
  const dia = hoje();

  let corpo: string;
  if (formato === "csv") {
    corpo = exportarCSV(lista, dia);
  } else {
    const [cts, resp] = await Promise.all([contatos(), respostas()]);
    const nomes = new Map(lista.map((i) => [i.id, i.nome]));
    corpo = exportarJSON(lista, r, new Date().toISOString(), {
      contatos: cts.map((c) => ({ ...c, item: c.item_id ? (nomes.get(c.item_id) ?? null) : null })),
      respostas: resp,
    });
  }
  return new Response(corpo, {
    headers: {
      "Content-Type": formato === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenda-${dia}.${formato}"`,
      "Cache-Control": "no-store",
    },
  });
}
