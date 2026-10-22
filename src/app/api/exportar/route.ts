import { exportarCSV, exportarJSON } from "@/lib/backup";
import { itens, regras } from "@/lib/dados";
import { hoje } from "@/lib/formato";

export async function GET(request: Request) {
  const formato = new URL(request.url).searchParams.get("formato") === "csv" ? "csv" : "json";
  const [lista, r] = await Promise.all([itens("nenhuma"), regras()]);
  const dia = hoje();

  const corpo = formato === "csv" ? exportarCSV(lista, dia) : exportarJSON(lista, r, new Date().toISOString());
  return new Response(corpo, {
    headers: {
      "Content-Type": formato === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenda-${dia}.${formato}"`,
      "Cache-Control": "no-store",
    },
  });
}
