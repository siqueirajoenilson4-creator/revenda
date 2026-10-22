import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase/server";
import { custoItem, REGRAS_PADRAO, type Regras, type Situacao, type Tipo } from "./calculo";
import { hoje } from "./formato";
import { BUCKET_FOTOS } from "@/lib/supabase/config";

export type Gasto = { id: string; item_id: string; descricao: string; valor: number; data: string };
export type Foto = { id: string; item_id: string; url: string; ordem: number; assinada?: string };

export type Item = {
  id: string;
  nome: string;
  categoria: string | null;
  tipo: Tipo;
  situacao: Situacao;
  compra_valor: number;
  compra_data: string | null;
  compra_local: string | null;
  preco_alvo: number | null;
  venda_valor: number | null;
  venda_data: string | null;
  nota: string | null;
  criado_em: string;
  atualizado_em: string;
  gastos: Gasto[];
  fotos: Foto[];
};

const CAMPOS_REGRAS = Object.keys(REGRAS_PADRAO) as (keyof Regras)[];

/** Sessão (o JWT é conferido localmente, sem ida ao Supabase). Sem sessão → /login. */
export const sessao = cache(async () => {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return { id: data.claims.sub as string, email: (data.claims.email as string) ?? "", supabase };
});

/**
 * Usuário logado e dono (revenda.donos). O projeto Supabase é compartilhado,
 * então ter conta não basta: quem não é dono volta para o login.
 */
export const usuario = cache(async () => {
  const u = await sessao();
  const { data: dono } = await u.supabase.rpc("sou_dono");
  if (dono !== true) redirect("/login?negado=1");
  return u;
});

const SELECT_ITENS = "*, gastos(*), fotos(*)";

/**
 * Tudo que as telas precisam, numa viagem só ao banco: checagem de dono,
 * regras e itens vão em paralelo (cada ida ao Supabase custa ~0,3 s daqui).
 * No primeiro acesso cria as regras padrão e o item inicial (a CB300R).
 */
const carregar = cache(async (): Promise<{ regras: Regras; itens: Item[] }> => {
  const { id, supabase } = await sessao();
  const buscarItens = () =>
    supabase
      .from("itens")
      .select(SELECT_ITENS)
      .order("compra_data", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false });

  const [dono, r, its] = await Promise.all([
    supabase.rpc("sou_dono"),
    supabase.from("regras").select("*").maybeSingle(),
    buscarItens(),
  ]);
  if (dono.data !== true) redirect("/login?negado=1");
  if (r.error) throw r.error;
  if (its.error) throw its.error;
  if (r.data) return { regras: paraRegras(r.data), itens: (its.data ?? []).map(paraItem) };

  const { data: criada, error } = await supabase
    .from("regras")
    .upsert({ user_id: id }, { onConflict: "user_id", ignoreDuplicates: true })
    .select();
  if (error) throw error;
  if (criada?.length) {
    await supabase.from("itens").insert({
      nome: "Honda CB300R",
      categoria: "Moto",
      tipo: "capital",
      situacao: "comprado",
      compra_valor: 0,
      compra_data: hoje(),
      nota: "Documento atrasado e transferência pendente",
    });
  }
  const novos = await buscarItens();
  if (novos.error) throw novos.error;
  return { regras: { ...REGRAS_PADRAO }, itens: (novos.data ?? []).map(paraItem) };
});

export async function regras(): Promise<Regras> {
  return (await carregar()).regras;
}

function paraRegras(linha: Record<string, unknown>): Regras {
  const r = { ...REGRAS_PADRAO };
  for (const k of CAMPOS_REGRAS) r[k] = Number(linha[k]);
  return r;
}

function paraItem(linha: Record<string, unknown>): Item {
  const i = linha as unknown as Item;
  return {
    ...i,
    compra_valor: Number(i.compra_valor),
    preco_alvo: i.preco_alvo == null ? null : Number(i.preco_alvo),
    venda_valor: i.venda_valor == null ? null : Number(i.venda_valor),
    gastos: (i.gastos ?? [])
      .map((g) => ({ ...g, valor: Number(g.valor) }))
      .sort((a, b) => a.data.localeCompare(b.data)),
    fotos: (i.fotos ?? []).sort((a, b) => a.ordem - b.ordem),
  };
}

/** Todos os itens com gastos e fotos. Com `assinar`, gera links das fotos (todas ou só a capa). */
export async function itens(assinar: "capa" | "todas" | "nenhuma" = "capa"): Promise<Item[]> {
  const lista = (await carregar()).itens.map((i) => ({ ...i, fotos: i.fotos.map((f) => ({ ...f })) }));
  if (assinar !== "nenhuma") await assinarFotos(lista, assinar);
  return lista;
}

export async function item(id: string): Promise<Item | null> {
  const { supabase } = await sessao();
  const [dono, { data, error }] = await Promise.all([
    supabase.rpc("sou_dono"),
    supabase.from("itens").select(SELECT_ITENS).eq("id", id).maybeSingle(),
  ]);
  if (dono.data !== true) redirect("/login?negado=1");
  if (error) throw error;
  if (!data) return null;
  const i = paraItem(data);
  await assinarFotos([i], "todas");
  return i;
}

async function assinarFotos(lista: Item[], quais: "capa" | "todas") {
  const fotos = lista.flatMap((i) => (quais === "capa" ? i.fotos.slice(0, 1) : i.fotos));
  if (!fotos.length) return;
  const { supabase } = await sessao();
  const { data } = await supabase.storage
    .from(BUCKET_FOTOS)
    .createSignedUrls(fotos.map((f) => f.url), 60 * 60);
  const porCaminho = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  for (const f of fotos) f.assinada = porCaminho.get(f.url) ?? undefined;
}

/** Só o que os botões de ação precisam (evita mandar o item inteiro ao navegador). */
export function resumoAcoes(i: Item) {
  return { id: i.id, nome: i.nome, tipo: i.tipo, situacao: i.situacao, preco_alvo: i.preco_alvo, custo: custoItem(i) };
}
