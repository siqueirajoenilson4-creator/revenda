"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { usuario, regras as lerRegras } from "@/lib/dados";
import { REGRAS_PADRAO, type Regras } from "@/lib/calculo";
import { hoje, lerNumero, lerReais } from "@/lib/formato";
import { lerImportacao } from "@/lib/backup";
import { BUCKET_FOTOS } from "@/lib/supabase/config";

export type Resultado = { erro?: string; ok?: string } | undefined;

const texto = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const data = (f: FormData, k: string) => {
  const v = texto(f, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

function atualizarTudo() {
  revalidatePath("/", "layout");
}

// ---------- Login ----------

export async function entrar(_: Resultado, f: FormData): Promise<Resultado> {
  const email = texto(f, "email");
  const senha = texto(f, "senha");
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };
  const { data: dono } = await supabase.rpc("sou_dono");
  if (dono !== true) {
    await supabase.auth.signOut();
    return { erro: "Esta conta não tem acesso à revenda." };
  }
  redirect("/painel");
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- Itens ----------

/** "Comprei, registrar no estoque" a partir da tela Calcular. */
export async function registrarCompra(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const r = await lerRegras();
  const nome = texto(f, "nome");
  const pago = lerReais(texto(f, "pago"));
  if (!nome) return { erro: "Diga o que é o item." };
  if (pago == null || pago < 0) return { erro: "Quanto você pagou?" };
  const km = lerNumero(texto(f, "km")) ?? 0;
  const dataCompra = data(f, "compra_data") ?? hoje();

  const { data: novo, error } = await supabase
    .from("itens")
    .insert({
      nome,
      categoria: texto(f, "categoria"),
      compra_valor: pago,
      compra_data: dataCompra,
      compra_local: texto(f, "compra_local"),
      preco_alvo: lerReais(texto(f, "preco_alvo")),
    })
    .select("id")
    .single();
  if (error) return { erro: error.message };

  if (km > 0) {
    const { error: eg } = await supabase.from("gastos").insert({
      item_id: novo.id,
      descricao: `Deslocamento (${String(km).replace(".", ",")} km)`,
      valor: Math.round(km * r.custo_km),
      data: dataCompra,
    });
    if (eg) return { erro: eg.message };
  }
  atualizarTudo();
  redirect(`/estoque/${novo.id}`);
}

/** Criar (sem id) ou editar (com id) um item. */
export async function salvarItem(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const id = texto(f, "id");
  const nome = texto(f, "nome");
  if (!nome) return { erro: "O item precisa de um nome." };
  const tipo = texto(f, "tipo") === "capital" ? "capital" : "revenda";
  const compra = lerReais(texto(f, "compra_valor")) ?? 0;
  if (compra < 0) return { erro: "Valor de compra inválido." };
  const venda = lerReais(texto(f, "venda_valor"));
  const vendaData = data(f, "venda_data");
  const situacaoForm = texto(f, "situacao");
  let situacao = ["comprado", "anunciado", "vendido"].includes(situacaoForm ?? "")
    ? situacaoForm!
    : "comprado";
  if (situacao === "vendido" && venda == null) return { erro: "Informe o valor da venda." };
  if (situacao !== "vendido" && venda != null && vendaData) situacao = "vendido";

  const linha = {
    nome,
    categoria: texto(f, "categoria"),
    tipo,
    situacao,
    compra_valor: compra,
    compra_data: data(f, "compra_data"),
    compra_local: texto(f, "compra_local"),
    preco_alvo: lerReais(texto(f, "preco_alvo")),
    venda_valor: situacao === "vendido" ? venda : null,
    venda_data: situacao === "vendido" ? (vendaData ?? hoje()) : null,
    nota: texto(f, "nota"),
  };

  if (id) {
    const { error } = await supabase.from("itens").update(linha).eq("id", id);
    if (error) return { erro: error.message };
    atualizarTudo();
    redirect(`/estoque/${id}`);
  }
  const { data: novo, error } = await supabase.from("itens").insert(linha).select("id").single();
  if (error) return { erro: error.message };
  atualizarTudo();
  redirect(`/estoque/${novo.id}`);
}

export async function apagarItem(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { data: fotos } = await supabase.from("fotos").select("url").eq("item_id", id);
  if (fotos?.length) await supabase.storage.from(BUCKET_FOTOS).remove(fotos.map((f) => f.url));
  const { error } = await supabase.from("itens").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Item apagado." };
}

export async function anunciar(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const id = texto(f, "id");
  const preco = lerReais(texto(f, "preco"));
  if (!id) return { erro: "Item não encontrado." };
  if (preco == null || preco <= 0) return { erro: "Qual o preço do anúncio?" };
  const { error } = await supabase
    .from("itens")
    .update({ preco_alvo: preco, situacao: "anunciado" })
    .eq("id", id)
    .neq("situacao", "vendido");
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Marcado como anunciado." };
}

export async function vendi(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const id = texto(f, "id");
  const valor = lerReais(texto(f, "valor"));
  if (!id) return { erro: "Item não encontrado." };
  if (valor == null || valor <= 0) return { erro: "Por quanto vendeu?" };
  const { error } = await supabase
    .from("itens")
    .update({ situacao: "vendido", venda_valor: valor, venda_data: data(f, "data") ?? hoje() })
    .eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Venda registrada." };
}

export async function desfazerVenda(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { data: i } = await supabase.from("itens").select("preco_alvo").eq("id", id).single();
  const { error } = await supabase
    .from("itens")
    .update({
      situacao: i?.preco_alvo ? "anunciado" : "comprado",
      venda_valor: null,
      venda_data: null,
    })
    .eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Venda desfeita." };
}

// ---------- Gastos ----------

export async function adicionarGasto(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const itemId = texto(f, "item_id");
  const descricao = texto(f, "descricao");
  const valor = lerReais(texto(f, "valor"));
  if (!itemId) return { erro: "Item não encontrado." };
  if (!descricao) return { erro: "Com o que foi o gasto?" };
  if (valor == null || valor <= 0) return { erro: "Qual o valor do gasto?" };
  const { error } = await supabase
    .from("gastos")
    .insert({ item_id: itemId, descricao, valor, data: data(f, "data") ?? hoje() });
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Gasto lançado." };
}

export async function apagarGasto(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Gasto apagado." };
}

// ---------- Fotos (o arquivo sobe direto do navegador para o Supabase) ----------

export async function registrarFoto(itemId: string, caminho: string): Promise<Resultado> {
  const { id: userId, supabase } = await usuario();
  if (!caminho.startsWith(`${userId}/${itemId}/`)) return { erro: "Caminho de foto inválido." };
  const { count } = await supabase
    .from("fotos")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);
  const { error } = await supabase
    .from("fotos")
    .insert({ item_id: itemId, url: caminho, ordem: count ?? 0 });
  if (error) return { erro: error.message };
  atualizarTudo();
}

export async function apagarFoto(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { data: foto } = await supabase.from("fotos").select("url").eq("id", id).single();
  if (foto) await supabase.storage.from(BUCKET_FOTOS).remove([foto.url]);
  const { error } = await supabase.from("fotos").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
}

export async function tornarCapa(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { data: foto } = await supabase.from("fotos").select("item_id").eq("id", id).single();
  if (!foto) return { erro: "Foto não encontrada." };
  const { data: todas } = await supabase
    .from("fotos")
    .select("id")
    .eq("item_id", foto.item_id)
    .order("ordem");
  const ordem = [id, ...(todas ?? []).map((t) => t.id).filter((x) => x !== id)];
  for (const [i, fid] of ordem.entries()) {
    await supabase.from("fotos").update({ ordem: i }).eq("id", fid);
  }
  atualizarTudo();
}

// ---------- Regras e backup ----------

const ROTULOS: Record<keyof Regras, string> = {
  margem_min_pct: "Margem mínima",
  lucro_min: "Lucro mínimo",
  pechincha_pct: "Pechincha",
  taxa_pct: "Taxa do anúncio",
  custo_km: "Custo por km",
  saldo_inicial: "Saldo inicial",
  reserva_pct: "Reserva",
  max_item_pct: "Máximo num item",
};

export async function salvarRegras(_: Resultado, f: FormData): Promise<Resultado> {
  const { id, supabase } = await usuario();
  const novas = { ...REGRAS_PADRAO };
  for (const k of Object.keys(REGRAS_PADRAO) as (keyof Regras)[]) {
    const bruto = texto(f, k);
    const v = k.endsWith("_pct") ? lerNumero(bruto) : lerReais(bruto);
    if (v == null) return { erro: `Preencha: ${ROTULOS[k]}.` };
    if (k.endsWith("_pct") && (v < 0 || v > 100)) return { erro: `${ROTULOS[k]} deve ficar entre 0 e 100%.` };
    if (k !== "saldo_inicial" && v < 0) return { erro: `${ROTULOS[k]} não pode ser negativo.` };
    novas[k] = v;
  }
  const { error } = await supabase.from("regras").upsert({ user_id: id, ...novas });
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Regras salvas." };
}

export async function importar(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  await lerRegras();
  const arquivo = f.get("arquivo");
  const bruto =
    arquivo instanceof File && arquivo.size > 0 ? await arquivo.text() : texto(f, "json");
  if (!bruto) return { erro: "Escolha um arquivo .json ou cole o conteúdo." };

  let lido;
  try {
    lido = lerImportacao(bruto);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "JSON inválido." };
  }

  let criados = 0;
  for (const { gastos, ...item } of lido.itens) {
    const { data: novo, error } = await supabase.from("itens").insert(item).select("id").single();
    if (error) return { erro: `Parei no item "${item.nome}": ${error.message}. ${criados} importados antes.` };
    if (gastos.length) {
      const { error: eg } = await supabase
        .from("gastos")
        .insert(gastos.map((g) => ({ ...g, item_id: novo.id })));
      if (eg) return { erro: `Gastos de "${item.nome}": ${eg.message}` };
    }
    criados++;
  }
  if (lido.regras) {
    const atuais = await lerRegras();
    const { id } = await usuario();
    await supabase.from("regras").upsert({ user_id: id, ...atuais, ...lido.regras });
  }
  atualizarTudo();
  return { ok: `${criados} ${criados === 1 ? "item importado" : "itens importados"}.` };
}
