// Interessados (Fase 2): registro rápido de quem chamou no Marketplace, nos
// grupos ou no WhatsApp, ligado ao item, e respostas prontas. As conversas
// continuam no app de cada canal; aqui fica quem é, quanto ofereceu e o próximo passo.

import type { Canal } from "./vendas";
import { FUSO } from "./formato";

export const SITUACOES_CONTATO = [
  { id: "novo", rotulo: "Novo" },
  { id: "negociando", rotulo: "Negociando" },
  { id: "agendado", rotulo: "Agendado" },
  { id: "comprou", rotulo: "Comprou" },
  { id: "perdido", rotulo: "Perdido" },
] as const;
export type SituacaoContato = (typeof SITUACOES_CONTATO)[number]["id"];

export const ehSituacaoContato = (v: unknown): v is SituacaoContato => SITUACOES_CONTATO.some((s) => s.id === v);
export const rotuloSituacaoContato = (s: SituacaoContato) => SITUACOES_CONTATO.find((x) => x.id === s)!.rotulo;

export type MensagemContato = {
  id: string;
  contato_id: string;
  direcao: "entrada" | "saida";
  texto: string;
  enviada_em: string;
};

export type Contato = {
  id: string;
  item_id: string | null;
  canal: Canal;
  nome: string;
  telefone: string | null;
  oferta: number | null;
  situacao: SituacaoContato;
  proximo_passo: string | null;
  retorno_em: string | null; // timestamptz
  aguardando_desde: string | null; // timestamptz
  criado_em: string;
  atualizado_em: string;
  mensagens: MensagemContato[];
};

export type Resposta = { id: string; titulo: string; texto: string; ordem: number };

/** Quem espera resposta há mais que isso aparece em "Precisa de você". */
export const ESPERA_MAX_MIN = 120;

export const ativo = (c: Pick<Contato, "situacao">) => c.situacao !== "comprou" && c.situacao !== "perdido";

/** Minutos desde a última mensagem sem resposta; null se ninguém está esperando. */
export function minutosEsperando(c: Pick<Contato, "situacao" | "aguardando_desde">, agora: Date): number | null {
  if (!ativo(c) || !c.aguardando_desde) return null;
  return Math.max(0, Math.floor((agora.getTime() - new Date(c.aguardando_desde).getTime()) / 60_000));
}

export function esperandoDemais(c: Pick<Contato, "situacao" | "aguardando_desde">, agora: Date): boolean {
  const m = minutosEsperando(c, agora);
  return m != null && m >= ESPERA_MAX_MIN;
}

export function retornoVencido(c: Pick<Contato, "situacao" | "retorno_em">, agora: Date): boolean {
  return ativo(c) && c.retorno_em != null && new Date(c.retorno_em).getTime() <= agora.getTime();
}

/** Primeiro quem espera há mais tempo, depois retornos vencidos, depois os ativos mais recentes; encerrados no fim. */
export function ordenarContatos<T extends Pick<Contato, "situacao" | "aguardando_desde" | "retorno_em" | "atualizado_em">>(
  lista: T[],
  agora: Date,
): T[] {
  const peso = (c: T) => (!ativo(c) ? 3 : c.aguardando_desde ? 0 : retornoVencido(c, agora) ? 1 : 2);
  return [...lista].sort(
    (a, b) =>
      peso(a) - peso(b) ||
      (peso(a) === 0 ? a.aguardando_desde!.localeCompare(b.aguardando_desde!) : b.atualizado_em.localeCompare(a.atualizado_em)),
  );
}

/** "agora", "há 25 min", "há 3 h", "há 2 dias". */
export function haQuanto(minutos: number): string {
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const h = Math.floor(minutos / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

// ---------- Respostas prontas ----------

/** Criadas no primeiro acesso; o dono edita à vontade. {nome}, {item}, {preco} e {cidade} são trocados na hora de copiar. */
export const RESPOSTAS_PADRAO: Omit<Resposta, "id">[] = [
  { titulo: "Ainda disponível", texto: "Oi, {nome}! Está disponível sim. {item} por {preco}. Quer combinar de ver?", ordem: 0 },
  { titulo: "Menor preço", texto: "O menor que consigo é {preco}, no Pix ou dinheiro, retirando aqui.", ordem: 1 },
  { titulo: "Onde retirar", texto: "A retirada é em {cidade}. Também entrego em Londrina e região, combinando antes.", ordem: 2 },
  { titulo: "Aceito Pix", texto: "Aceito Pix e dinheiro. O pagamento é na retirada, depois que você vê o produto.", ordem: 3 },
];

export type DadosResposta = { nome?: string | null; item?: string | null; preco?: string | null; cidade?: string | null };

/** Troca os marcadores; o que não tiver valor some sem deixar vírgula ou espaço sobrando. */
export function preencherResposta(texto: string, d: DadosResposta): string {
  return texto
    .replace(/\{(nome|item|preco|cidade)\}/g, (_, k: keyof DadosResposta) => d[k]?.trim() ?? "")
    .replace(/,\s*([!?.,])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ([!?.,])/g, "$1")
    .replace(/(^|\n)[ \t]*[.,][ \t]*/g, "$1")
    .trim();
}

// ---------- Telefone e datas ----------

/** Link para abrir a conversa no WhatsApp do próprio dono (ele mesmo toca em enviar). */
export function linkWhatsApp(telefone: string | null | undefined, texto?: string): string | null {
  let n = (telefone ?? "").replace(/\D/g, "");
  if (n.startsWith("0")) n = n.replace(/^0+/, "");
  if (n.length === 10 || n.length === 11) n = "55" + n;
  if (n.length < 12 || n.length > 13) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/** timestamptz → valor de <input type="datetime-local"> no horário de São Paulo. */
export function paraCampoDataHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Valor de <input type="datetime-local"> (horário de São Paulo, sem horário de verão desde 2019) → ISO. */
export function lerDataHora(valor: string | null | undefined): string | null {
  const m = valor?.trim().match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}:00-03:00` : null;
}

/** "hoje 14:30", "amanhã 09:00", "ontem 18:10", "25/10 10:00". */
export function quandoTexto(iso: string, agora: Date): string {
  const [dia, hora] = paraCampoDataHora(iso).split("T");
  const hoje = paraCampoDataHora(agora.toISOString()).slice(0, 10);
  const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const dif = Math.round((d(dia) - d(hoje)) / 86_400_000);
  const nome = dif === 0 ? "hoje" : dif === 1 ? "amanhã" : dif === -1 ? "ontem" : `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
  return `${nome} ${hora}`;
}
