import type { Contato, MensagemContato } from "@/lib/interessados";

/** O que a tela usa de cada item: nome, capa e o que entra nas respostas prontas. */
export type ItemOpcao = {
  id: string;
  nome: string;
  capa?: string;
  /** Preço do anúncio (ou o preço-alvo, se ainda não tem anúncio). */
  preco: number | null;
  cidade: string | null;
  vendido: boolean;
};

export type ContatoTela = Pick<
  Contato,
  | "id"
  | "item_id"
  | "canal"
  | "nome"
  | "telefone"
  | "oferta"
  | "situacao"
  | "proximo_passo"
  | "retorno_em"
  | "aguardando_desde"
  | "atualizado_em"
> & { mensagens: Pick<MensagemContato, "id" | "direcao" | "texto" | "enviada_em">[] };
