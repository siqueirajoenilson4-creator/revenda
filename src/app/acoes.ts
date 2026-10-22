"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { usuario, regras as lerRegras } from "@/lib/dados";
import { REGRAS_PADRAO, type Regras } from "@/lib/calculo";
import { hoje, lerNumero, lerReais } from "@/lib/formato";
import { lerImportacao } from "@/lib/backup";
import { BUCKET_FOTOS } from "@/lib/supabase/config";
import { ehCanal, ehEntregaVenda, ehPagamento } from "@/lib/vendas";
import { ehCanalAnuncio, ehEntrega, ehEstado, ehSituacaoPublicacao, renovarEm } from "@/lib/anuncios";
import { ehSituacaoContato, lerDataHora } from "@/lib/interessados";

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

type Supabase = Awaited<ReturnType<typeof usuario>>["supabase"];

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
  const { data: it, error } = await supabase
    .from("itens")
    .update({ preco_alvo: preco, situacao: "anunciado" })
    .eq("id", id)
    .neq("situacao", "vendido")
    .select("nome, categoria")
    .maybeSingle();
  if (error) return { erro: error.message };
  if (!it) return { erro: "Este item já foi vendido." };
  const erroPreco = await guardarPreco(supabase, id, preco, it);
  if (erroPreco) return { erro: erroPreco };
  atualizarTudo();
  return { ok: "Marcado como anunciado." };
}

/**
 * Preço novo do item: vai para o anúncio (criado se ainda não existe) e entra
 * no histórico só quando muda. Devolve a mensagem de erro, se houver.
 */
async function guardarPreco(
  supabase: Supabase,
  itemId: string,
  preco: number,
  item: { nome: string; categoria: string | null },
): Promise<string | null> {
  const { data: atual } = await supabase.from("anuncios").select("id, preco").eq("item_id", itemId).maybeSingle();
  const mudou = !atual || Number(atual.preco) !== preco;
  let anuncioId = atual?.id as string | undefined;
  if (!anuncioId) {
    const { data: novo, error } = await supabase
      .from("anuncios")
      .insert({ item_id: itemId, titulo: item.nome, categoria: item.categoria, preco })
      .select("id")
      .single();
    if (error) return error.message;
    anuncioId = novo.id as string;
  } else if (mudou) {
    const { error } = await supabase.from("anuncios").update({ preco }).eq("id", anuncioId);
    if (error) return error.message;
  }
  if (mudou) {
    const { error } = await supabase.from("precos").insert({ anuncio_id: anuncioId, preco, data: hoje() });
    if (error) return error.message;
  }
  return null;
}

/** Ao vender, os anúncios do item saem do ar na ferramenta; ao desfazer, voltam. */
async function marcarPublicacoes(supabase: Supabase, itemId: string, de: string[], para: string) {
  const { data: a } = await supabase.from("anuncios").select("id").eq("item_id", itemId).maybeSingle();
  if (a) await supabase.from("publicacoes").update({ situacao: para }).eq("anuncio_id", a.id).in("situacao", de);
}

function detalhesVenda(f: FormData) {
  const canal = texto(f, "canal");
  const pagamento = texto(f, "pagamento");
  const entrega = texto(f, "entrega");
  return {
    canal: ehCanal(canal) ? canal : null,
    pagamento: ehPagamento(pagamento) ? pagamento : null,
    comprador_nome: texto(f, "comprador_nome"),
    comprador_contato: texto(f, "comprador_contato"),
    cidade: texto(f, "cidade"),
    entrega: ehEntregaVenda(entrega) ? entrega : null,
    obs: texto(f, "obs"),
  };
}

/**
 * Registra a venda. Campos: id, valor, data e, opcionais, canal, pagamento,
 * entrega, custo_entrega (vira gasto do item), comprador_nome,
 * comprador_contato, cidade, obs e contato_id (o interessado que comprou).
 */
export async function vendi(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const id = texto(f, "id");
  const valor = lerReais(texto(f, "valor"));
  const custoEntrega = lerReais(texto(f, "custo_entrega")) ?? 0;
  if (!id) return { erro: "Escolha o item vendido." };
  if (valor == null || valor <= 0) return { erro: "Por quanto vendeu?" };
  if (custoEntrega < 0) return { erro: "Custo da entrega inválido." };
  const dia = data(f, "data") ?? hoje();

  const { data: vendido, error } = await supabase
    .from("itens")
    .update({ situacao: "vendido", venda_valor: valor, venda_data: dia })
    .eq("id", id)
    .neq("situacao", "vendido")
    .select("id")
    .maybeSingle();
  if (error) return { erro: error.message };
  if (!vendido) return { erro: "Este item já está vendido. Para mudar, desfaça a venda no item." };

  let gastoEntrega: string | null = null;
  if (custoEntrega > 0) {
    const { data: g, error: eg } = await supabase
      .from("gastos")
      .insert({ item_id: id, descricao: "Entrega da venda", valor: custoEntrega, data: dia })
      .select("id")
      .single();
    if (eg) return { erro: eg.message };
    gastoEntrega = g.id;
  }
  const { error: ev } = await supabase
    .from("vendas")
    .upsert({ item_id: id, ...detalhesVenda(f), gasto_entrega_id: gastoEntrega });
  if (ev) return { erro: ev.message };

  await marcarPublicacoes(supabase, id, ["publicado", "pausado"], "vendido");
  const contatoId = texto(f, "contato_id");
  if (contatoId) {
    await supabase.from("contatos").update({ situacao: "comprou", aguardando_desde: null }).eq("id", contatoId);
  }
  atualizarTudo();
  return { ok: "Venda registrada." };
}

/** Canal, pagamento e comprador de uma venda já registrada (vendas antigas "Não informado"). */
export async function salvarDetalhesVenda(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const id = texto(f, "id");
  if (!id) return { erro: "Item não encontrado." };
  const { error } = await supabase.from("vendas").upsert({ item_id: id, ...detalhesVenda(f) });
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Venda atualizada." };
}

export async function desfazerVenda(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const [{ data: i }, { data: v }] = await Promise.all([
    supabase.from("itens").select("preco_alvo").eq("id", id).single(),
    supabase.from("vendas").select("gasto_entrega_id").eq("item_id", id).maybeSingle(),
  ]);
  const { error } = await supabase
    .from("itens")
    .update({
      situacao: i?.preco_alvo ? "anunciado" : "comprado",
      venda_valor: null,
      venda_data: null,
    })
    .eq("id", id);
  if (error) return { erro: error.message };
  if (v?.gasto_entrega_id) await supabase.from("gastos").delete().eq("id", v.gasto_entrega_id);
  await supabase.from("vendas").delete().eq("item_id", id);
  await marcarPublicacoes(supabase, id, ["vendido"], "publicado");
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

/** Nova ordem das fotos (a primeira é a capa do anúncio). */
export async function reordenarFotos(itemId: string, ids: string[]): Promise<Resultado> {
  const { supabase } = await usuario();
  const { data: todas } = await supabase.from("fotos").select("id").eq("item_id", itemId);
  const existentes = new Set((todas ?? []).map((t) => t.id as string));
  if (ids.length !== existentes.size || !ids.every((x) => existentes.has(x))) {
    return { erro: "As fotos mudaram. Recarregue a tela." };
  }
  const feitos = await Promise.all(ids.map((fid, i) => supabase.from("fotos").update({ ordem: i }).eq("id", fid)));
  const falha = feitos.find((r) => r.error)?.error;
  if (falha) return { erro: falha.message };
  atualizarTudo();
}

// ---------- Anúncios (Facebook e OLX manuais por enquanto: ele publica e cola o link) ----------

export async function salvarAnuncio(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const itemId = texto(f, "item_id");
  const titulo = texto(f, "titulo");
  const preco = lerReais(texto(f, "preco"));
  if (!itemId) return { erro: "Item não encontrado." };
  if (!titulo) return { erro: "O anúncio precisa de um título." };
  if (preco == null || preco <= 0) return { erro: "Qual o preço do anúncio?" };
  const estado = texto(f, "estado_conservacao");
  const entrega = texto(f, "entrega");

  const { data: it } = await supabase.from("itens").select("nome, categoria, situacao").eq("id", itemId).single();
  if (!it) return { erro: "Item não encontrado." };
  const erroPreco = await guardarPreco(supabase, itemId, preco, it);
  if (erroPreco) return { erro: erroPreco };

  const { error } = await supabase
    .from("anuncios")
    .update({
      titulo,
      descricao: texto(f, "descricao") ?? "",
      categoria: texto(f, "categoria"),
      cidade: texto(f, "cidade"),
      estado_conservacao: ehEstado(estado) ? estado : null,
      aceita_troca: f.get("aceita_troca") === "on",
      entrega: ehEntrega(entrega) ? entrega : null,
    })
    .eq("item_id", itemId);
  if (error) return { erro: error.message };
  if (it.situacao !== "vendido") await supabase.from("itens").update({ preco_alvo: preco }).eq("id", itemId);
  atualizarTudo();
  return { ok: "Anúncio salvo." };
}

/** Situação e link do anúncio num canal. Publicar marca a data e o dia de renovar. */
export async function salvarPublicacao(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const anuncioId = texto(f, "anuncio_id");
  const canal = texto(f, "canal");
  const situacao = texto(f, "situacao") ?? "publicado";
  const link = texto(f, "link");
  if (!anuncioId) return { erro: "Salve o anúncio antes." };
  if (!ehCanalAnuncio(canal)) return { erro: "Canal inválido." };
  if (!ehSituacaoPublicacao(situacao)) return { erro: "Situação inválida." };
  if (link && !/^https?:\/\/\S+$/i.test(link)) return { erro: "Cole o link completo (começa com https://)." };

  const [{ data: anuncio }, { data: atual }] = await Promise.all([
    supabase.from("anuncios").select("item_id, preco").eq("id", anuncioId).single(),
    supabase
      .from("publicacoes")
      .select("situacao, publicado_em, renovar_em")
      .eq("anuncio_id", anuncioId)
      .eq("canal", canal)
      .maybeSingle(),
  ]);
  if (!anuncio) return { erro: "Anúncio não encontrado." };
  const publicando = situacao === "publicado" && atual?.situacao !== "publicado";
  const { error } = await supabase.from("publicacoes").upsert(
    {
      anuncio_id: anuncioId,
      canal,
      situacao,
      link,
      publicado_em: publicando ? new Date().toISOString() : (atual?.publicado_em ?? null),
      renovar_em: publicando ? renovarEm(canal, hoje()) : situacao === "publicado" ? (atual?.renovar_em ?? null) : null,
    },
    { onConflict: "anuncio_id,canal" },
  );
  if (error) return { erro: error.message };
  if (situacao === "publicado") {
    await supabase
      .from("itens")
      .update({ situacao: "anunciado", preco_alvo: anuncio.preco })
      .eq("id", anuncio.item_id)
      .eq("situacao", "comprado");
  }
  atualizarTudo();
  return { ok: publicando ? "Publicação registrada." : "Salvo." };
}

/** "Renovei": o anúncio voltou para o topo e o lembrete anda mais 7 dias. */
export async function renovarPublicacao(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { data: p } = await supabase.from("publicacoes").select("canal").eq("id", id).single();
  if (!p || !ehCanalAnuncio(p.canal)) return { erro: "Publicação não encontrada." };
  const { error } = await supabase
    .from("publicacoes")
    .update({ situacao: "publicado", publicado_em: new Date().toISOString(), renovar_em: renovarEm(p.canal, hoje()) })
    .eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Renovado." };
}

export async function apagarPublicacao(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { error } = await supabase.from("publicacoes").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Canal removido." };
}

// ---------- Interessados ----------

/** Criar (sem id) ou editar (com id). "aguardando" marcado = a pessoa está esperando resposta. */
export async function salvarContato(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const id = texto(f, "id");
  const nome = texto(f, "nome");
  const canal = texto(f, "canal");
  const situacao = texto(f, "situacao") ?? "novo";
  const oferta = lerReais(texto(f, "oferta"));
  if (!nome) return { erro: "Qual o nome do interessado?" };
  if (!ehCanal(canal)) return { erro: "Por onde ele chamou?" };
  if (!ehSituacaoContato(situacao)) return { erro: "Situação inválida." };
  if (oferta != null && oferta < 0) return { erro: "Oferta inválida." };
  const retorno = texto(f, "retorno_em");
  const retornoEm = lerDataHora(retorno);
  if (retorno && !retornoEm) return { erro: "Data de retorno inválida." };

  let aguardando: string | null = null;
  if (f.get("aguardando") === "on" && situacao !== "comprou" && situacao !== "perdido") {
    const { data: atual } = id
      ? await supabase.from("contatos").select("aguardando_desde").eq("id", id).maybeSingle()
      : { data: null };
    aguardando = atual?.aguardando_desde ?? new Date().toISOString();
  }
  const linha = {
    item_id: texto(f, "item_id"),
    canal,
    nome,
    telefone: texto(f, "telefone"),
    oferta,
    situacao,
    proximo_passo: texto(f, "proximo_passo"),
    retorno_em: retornoEm,
    aguardando_desde: aguardando,
  };
  const { error } = id
    ? await supabase.from("contatos").update(linha).eq("id", id)
    : await supabase.from("contatos").insert(linha);
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: id ? "Interessado atualizado." : "Interessado registrado." };
}

export async function mudarSituacaoContato(id: string, situacao: string): Promise<Resultado> {
  const { supabase } = await usuario();
  if (!ehSituacaoContato(situacao)) return { erro: "Situação inválida." };
  const encerrado = situacao === "comprou" || situacao === "perdido";
  const { error } = await supabase
    .from("contatos")
    .update(encerrado ? { situacao, aguardando_desde: null } : { situacao })
    .eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
}

/** Anota uma mensagem. Entrada = ele mandou (fica esperando resposta); saída = você respondeu. */
export async function registrarMensagem(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const contatoId = texto(f, "contato_id");
  const direcao = texto(f, "direcao") === "entrada" ? "entrada" : "saida";
  const msg = texto(f, "texto");
  if (!contatoId) return { erro: "Interessado não encontrado." };
  if (!msg) return { erro: "Escreva a mensagem." };
  const { data: c } = await supabase.from("contatos").select("aguardando_desde").eq("id", contatoId).single();
  if (!c) return { erro: "Interessado não encontrado." };
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("mensagens")
    .insert({ contato_id: contatoId, direcao, texto: msg, enviada_em: agora });
  if (error) return { erro: error.message };
  await supabase
    .from("contatos")
    .update({ aguardando_desde: direcao === "entrada" ? (c.aguardando_desde ?? agora) : null })
    .eq("id", contatoId);
  atualizarTudo();
  return { ok: "Anotado." };
}

/** Respondeu pelo app do canal: sai da lista de espera. */
export async function marcarRespondido(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { error } = await supabase.from("contatos").update({ aguardando_desde: null }).eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
}

export async function apagarContato(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { error } = await supabase.from("contatos").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return { ok: "Interessado apagado." };
}

// ---------- Respostas prontas ----------

export async function salvarResposta(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await usuario();
  const id = texto(f, "id");
  const titulo = texto(f, "titulo");
  const corpo = texto(f, "texto");
  if (!titulo || !corpo) return { erro: "Preencha o nome e o texto da resposta." };
  if (id) {
    const { error } = await supabase.from("respostas").update({ titulo, texto: corpo }).eq("id", id);
    if (error) return { erro: error.message };
  } else {
    const { data: ultima } = await supabase
      .from("respostas")
      .select("ordem")
      .order("ordem", { ascending: false })
      .limit(1);
    const { error } = await supabase
      .from("respostas")
      .insert({ titulo, texto: corpo, ordem: (ultima?.[0]?.ordem ?? -1) + 1 });
    if (error) return { erro: error.message };
  }
  atualizarTudo();
  return { ok: "Resposta salva." };
}

export async function apagarResposta(id: string): Promise<Resultado> {
  const { supabase } = await usuario();
  const { error } = await supabase.from("respostas").delete().eq("id", id);
  if (error) return { erro: error.message };
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
  meta_lucro_mes: "Meta de lucro do mês",
};

/** Salva só os campos que vieram no formulário; os outros ficam como estão. */
export async function salvarRegras(_: Resultado, f: FormData): Promise<Resultado> {
  const { id, supabase } = await usuario();
  const novas = { ...(await lerRegras()) };
  for (const k of Object.keys(REGRAS_PADRAO) as (keyof Regras)[]) {
    if (!f.has(k)) continue;
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
  for (const { gastos, venda, anuncio, ...item } of lido.itens) {
    const { data: novo, error } = await supabase.from("itens").insert(item).select("id").single();
    if (error) return { erro: `Parei no item "${item.nome}": ${error.message}. ${criados} importados antes.` };
    if (gastos.length) {
      const { error: eg } = await supabase
        .from("gastos")
        .insert(gastos.map((g) => ({ ...g, item_id: novo.id })));
      if (eg) return { erro: `Gastos de "${item.nome}": ${eg.message}` };
    }
    if (venda) {
      const { error: ev } = await supabase.from("vendas").insert({ ...venda, item_id: novo.id });
      if (ev) return { erro: `Venda de "${item.nome}": ${ev.message}` };
    }
    if (anuncio) {
      const { publicacoes, precos, ...dados } = anuncio;
      const { data: a, error: ea } = await supabase
        .from("anuncios")
        .insert({ ...dados, item_id: novo.id })
        .select("id")
        .single();
      if (ea) return { erro: `Anúncio de "${item.nome}": ${ea.message}` };
      const filhos = await Promise.all([
        publicacoes.length ? supabase.from("publicacoes").insert(publicacoes.map((p) => ({ ...p, anuncio_id: a.id }))) : null,
        precos.length ? supabase.from("precos").insert(precos.map((p) => ({ ...p, anuncio_id: a.id }))) : null,
      ]);
      const ef = filhos.find((r) => r?.error)?.error;
      if (ef) return { erro: `Anúncio de "${item.nome}": ${ef.message}` };
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
