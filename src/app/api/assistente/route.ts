import { lerConversa } from "@/lib/assistente";
import { itens, regras } from "@/lib/dados";
import { hoje } from "@/lib/formato";
import { iaConfigurada, responder } from "@/lib/ia";

// Uma pergunta pode precisar de algumas idas à OpenAI (ferramentas + resposta).
// lib/ia.ts encerra as ferramentas depois de 60 s; a folga é para a última resposta.
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!iaConfigurada()) {
    return Response.json({ erro: "O assistente ainda não foi ligado: falta o OPENAI_API_KEY." }, { status: 503 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const conversa = lerConversa(corpo);
  if ("erro" in conversa) return Response.json({ erro: conversa.erro }, { status: 400 });

  // itens()/regras() conferem login e dono (sem acesso → redireciona para /login).
  const [lista, r] = await Promise.all([itens("nenhuma"), regras()]);

  return new Response(responder(conversa.mensagens, { itens: lista, regras: r, hoje: hoje() }, request.signal), {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
