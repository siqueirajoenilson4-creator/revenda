import "server-only";
import OpenAI from "openai";
import { LIMITE_TITULO, rotuloEntrega, rotuloEstado, type Entrega, type EstadoConservacao } from "./anuncios";
import { fichaTexto, type Detalhes, type TipoProduto } from "./detalhes";
import { iaConfigurada, MODELO } from "./ia";

export type PedidoTextoIA = {
  nome: string;
  categoria: string | null;
  tipo: TipoProduto | "";
  detalhes: Detalhes;
  estado: EstadoConservacao | "";
  pontoForte: string;
  /** Gastos do item (o que foi feito nele). */
  gastos: string[];
  cidade: string;
  entrega: Entrega | "";
  aceitaTroca: boolean;
  preco: string;
};

const INSTRUCOES = `Você escreve anúncios de produtos usados para o Facebook Marketplace e a OLX, para um revendedor de Londrina (PR).
Regras:
- Português do Brasil, linguagem simples e direta, de quem vende usado com honestidade. Sem emoji, sem exagero, sem CAIXA ALTA.
- Use SÓ os dados recebidos. Nunca invente ano, quilometragem, peça, garantia ou característica que não foi informada.
- Título: até ${LIMITE_TITULO} caracteres, com o que o comprador busca (marca, modelo, ano ou especificação principal). Sem preço no título.
- Descrição: primeiro parágrafo curto dizendo o que é e o principal atrativo; depois a ficha em linhas curtas "Item: valor";
  depois o que foi feito no produto (se houver); depois defeitos ou detalhes (se houver, de forma honesta);
  por fim retirada/entrega, troca e forma de pagamento (Pix ou dinheiro). Sem preço na descrição.
- Nada de telefone, link ou pedir para chamar fora da plataforma.`;

function dadosEmTexto(p: PedidoTextoIA): string {
  const linhas = [
    `Produto: ${p.nome}`,
    p.categoria && `Categoria: ${p.categoria}`,
    p.estado && `Estado: ${rotuloEstado(p.estado)}`,
    p.pontoForte.trim() && `Ponto forte (dito pelo vendedor): ${p.pontoForte.trim()}`,
    ...fichaTexto(p.tipo || null, p.detalhes),
    p.gastos.length && `O que foi feito/trocado: ${p.gastos.join("; ")}`,
    p.cidade.trim() && `Cidade/bairro para retirada: ${p.cidade.trim()}`,
    p.entrega && `Entrega: ${rotuloEntrega(p.entrega)}`,
    `Aceita troca: ${p.aceitaTroca ? "sim" : "não"}`,
  ];
  return linhas.filter(Boolean).join("\n");
}

/** Título e descrição escritos pela OpenAI a partir da ficha. */
export async function escreverTextoIA(p: PedidoTextoIA): Promise<{ titulo: string; descricao: string } | { erro: string }> {
  if (!iaConfigurada()) return { erro: "A IA ainda não foi ligada: falta o OPENAI_API_KEY." };
  const cliente = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 1 });
  try {
    const r = await cliente.responses.create({
      model: MODELO,
      instructions: INSTRUCOES,
      input: dadosEmTexto(p),
      reasoning: { effort: "low" },
      store: false,
      max_output_tokens: 3000,
      text: {
        format: {
          type: "json_schema",
          name: "anuncio",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { titulo: { type: "string" }, descricao: { type: "string" } },
            required: ["titulo", "descricao"],
          },
        },
      },
    });
    const dados = JSON.parse(r.output_text) as { titulo?: unknown; descricao?: unknown };
    if (typeof dados.titulo !== "string" || typeof dados.descricao !== "string") throw new Error("resposta sem título");
    return { titulo: dados.titulo.trim().slice(0, 120), descricao: dados.descricao.trim() };
  } catch (e) {
    console.error("ia-anuncio:", e);
    if (e instanceof OpenAI.APIError && e.status === 429) return { erro: "A OpenAI recusou por limite ou falta de crédito." };
    return { erro: "Não consegui falar com a IA agora. Tente de novo em instantes." };
  }
}
