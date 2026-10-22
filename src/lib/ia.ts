import "server-only";
import OpenAI from "openai";
import type {
  Response as RespostaIA,
  ResponseFunctionToolCall,
  ResponseInputItem,
} from "openai/resources/responses/responses";
import {
  executarFerramenta,
  FERRAMENTAS,
  instrucoes,
  type DadosAssistente,
  type EventoChat,
  type Mensagem,
} from "./assistente";

// Conversa com a OpenAI (Responses API). A chave fica só no servidor (OPENAI_API_KEY).
// O modelo pode ser trocado por OPENAI_MODEL; o padrão é o mais barato da família atual.
export const MODELO = process.env.OPENAI_MODEL?.trim() || "gpt-6-luna";
const ESFORCO = (process.env.OPENAI_REASONING_EFFORT?.trim() || "low") as "low" | "medium" | "high";

/** No máximo tantas idas e voltas de ferramentas por pergunta (a última é sem ferramentas). */
const MAX_RODADAS = 6;
/** Passado esse tempo, a próxima rodada já é a última, para responder antes do maxDuration da rota. */
const PRAZO_MS = 60_000;

export const iaConfigurada = () => !!process.env.OPENAI_API_KEY?.trim();

function mensagemDeErro(e: unknown): string {
  if (e instanceof OpenAI.APIError) {
    if (e.status === 401) return "A chave da OpenAI foi recusada. Confira o OPENAI_API_KEY.";
    if (e.status === 429) return "A OpenAI recusou por limite ou falta de crédito. Confira o saldo em platform.openai.com.";
    if (e.status === 404) return `O modelo "${MODELO}" não está disponível na sua conta da OpenAI. Ajuste o OPENAI_MODEL.`;
    if (e.status === 400) return "A OpenAI não aceitou o pedido. Tente de novo ou comece uma nova conversa.";
  }
  return "Não consegui falar com a IA agora. Tente de novo em instantes.";
}

/**
 * Responde a conversa em streaming (NDJSON). A IA chama as ferramentas de
 * lib/assistente.ts, que só leem os dados já carregados; nada é gravado.
 */
export function responder(mensagens: Mensagem[], dados: DadosAssistente, sinal?: AbortSignal): ReadableStream<Uint8Array> {
  // Sem as esperas longas do SDK (10 min, 2 novas tentativas): a função tem tempo contado.
  const cliente = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 1 });
  const codificar = new TextEncoder();
  const parar = new AbortController();
  // O navegador pode ter desistido enquanto a rota lia o banco.
  if (sinal?.aborted) parar.abort();
  else sinal?.addEventListener("abort", () => parar.abort(), { once: true });
  const inicio = Date.now();

  return new ReadableStream({
    async start(controller) {
      const enviar = (e: EventoChat) => controller.enqueue(codificar.encode(JSON.stringify(e) + "\n"));
      const input: ResponseInputItem[] = mensagens.map((m) => ({
        role: m.papel === "usuario" ? "user" : "assistant",
        content: m.texto,
      }));

      let jaEscreveu = false;
      try {
        for (let rodada = 1; rodada <= MAX_RODADAS; rodada++) {
          const ultima = rodada === MAX_RODADAS || Date.now() - inicio > PRAZO_MS;
          const stream = await cliente.responses.create(
            {
              model: MODELO,
              instructions: instrucoes(dados),
              input,
              tools: FERRAMENTAS,
              tool_choice: ultima ? "none" : "auto",
              reasoning: { effort: ESFORCO },
              // Nada fica guardado na OpenAI; o raciocínio volta cifrado para a próxima rodada.
              store: false,
              include: ["reasoning.encrypted_content"],
              max_output_tokens: 6000,
              stream: true,
            },
            { signal: parar.signal },
          );

          let final: RespostaIA | null = null;
          let comecouRodada = false;
          for await (const ev of stream) {
            // Uma recusa do modelo também é texto para mostrar.
            if (ev.type === "response.output_text.delta" || ev.type === "response.refusal.delta") {
              // Texto de rodadas diferentes vira parágrafos separados.
              if (!comecouRodada && jaEscreveu) enviar({ tipo: "texto", texto: "\n\n" });
              comecouRodada = jaEscreveu = true;
              enviar({ tipo: "texto", texto: ev.delta });
            }
            else if (ev.type === "response.completed" || ev.type === "response.incomplete") final = ev.response;
            else if (ev.type === "response.failed") throw new Error(ev.response.error?.message ?? "Resposta falhou");
            else if (ev.type === "error") throw new Error(ev.message);
          }
          if (!final) throw new Error("Resposta sem fim");

          const chamadas = final.output.filter((o): o is ResponseFunctionToolCall => o.type === "function_call");
          if (!chamadas.length || ultima) {
            if (final.status === "incomplete") enviar({ tipo: "texto", texto: "\n\n(Resposta cortada por ser longa demais.)" });
            break;
          }

          // Devolve tudo que a IA produziu (inclusive o raciocínio) e o resultado de cada ferramenta.
          input.push(...(final.output as ResponseInputItem[]));
          for (const c of chamadas) {
            enviar({ tipo: "ferramenta", nome: c.name });
            input.push({ type: "function_call_output", call_id: c.call_id, output: executarFerramenta(c.name, c.arguments, dados) });
          }
        }
        enviar({ tipo: "fim" });
      } catch (e) {
        if (!parar.signal.aborted) {
          console.error("assistente:", e);
          enviar({ tipo: "erro", texto: mensagemDeErro(e) });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // o navegador já fechou a conexão
        }
      }
    },
    cancel() {
      parar.abort();
    },
  });
}
