// Coordena o robô: guarda o trabalho de cada aba do Facebook, baixa as fotos
// (o Facebook não deixa a página buscar fora) e devolve o resultado ao sistema.

const CRIAR = "https://www.facebook.com/marketplace/create/item";

// trabalhos: { [abaFacebook]: { pedido, abaRevenda, fase } } — em storage.session
// para sobreviver ao service worker dormir.
async function trabalhos() {
  return (await chrome.storage.session.get("trabalhos")).trabalhos ?? {};
}
async function salvarTrabalhos(t) {
  await chrome.storage.session.set({ trabalhos: t });
}

async function pendentes() {
  return (await chrome.storage.local.get("pendentes")).pendentes ?? [];
}

function avisarSistema(abaRevenda, msg) {
  if (abaRevenda == null) return;
  chrome.tabs.sendMessage(abaRevenda, msg).catch(() => {});
}

async function fotoComoDataUrl(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`foto ${r.status}`);
  const blob = await r.blob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { tipo: blob.type || "image/jpeg", dados: btoa(bin) };
}

chrome.runtime.onMessage.addListener((m, sender, responder) => {
  (async () => {
    const aba = sender.tab?.id;
    switch (m?.tipo) {
      case "publicar": {
        const nova = await chrome.tabs.create({ url: CRIAR, active: true });
        const t = await trabalhos();
        t[nova.id] = { pedido: m.pedido, abaRevenda: aba, fase: "preencher" };
        await salvarTrabalhos(t);
        responder(true);
        break;
      }
      case "trabalho": {
        responder((await trabalhos())[aba] ?? null);
        break;
      }
      case "fase": {
        const t = await trabalhos();
        if (t[aba]) t[aba].fase = m.fase;
        await salvarTrabalhos(t);
        responder(true);
        break;
      }
      case "foto": {
        try {
          responder(await fotoComoDataUrl(m.url));
        } catch (e) {
          responder({ erro: String(e) });
        }
        break;
      }
      case "andamento": {
        const t = (await trabalhos())[aba];
        if (t) avisarSistema(t.abaRevenda, { tipo: "andamento", anuncioId: t.pedido.anuncioId, texto: m.texto, erro: m.erro });
        responder(true);
        break;
      }
      case "concluido": {
        const t = await trabalhos();
        const job = t[aba];
        if (job) {
          const aviso = { tipo: "publicado", id: crypto.randomUUID(), anuncioId: job.pedido.anuncioId, link: m.link ?? null };
          // Guarda até o sistema confirmar que gravou (entregue).
          await chrome.storage.local.set({ pendentes: [...(await pendentes()), aviso] });
          avisarSistema(job.abaRevenda, aviso);
          delete t[aba];
          await salvarTrabalhos(t);
        }
        responder(true);
        break;
      }
      case "cancelar": {
        const t = await trabalhos();
        delete t[aba];
        await salvarTrabalhos(t);
        responder(true);
        break;
      }
      case "pendentes": {
        responder(await pendentes());
        break;
      }
      case "entregue": {
        await chrome.storage.local.set({ pendentes: (await pendentes()).filter((p) => p.id !== m.id) });
        responder(true);
        break;
      }
      default:
        responder(null);
    }
  })();
  return true; // resposta assíncrona
});

// Aba do Facebook fechada no meio: esquece o trabalho.
chrome.tabs.onRemoved.addListener(async (aba) => {
  const t = await trabalhos();
  if (t[aba]) {
    avisarSistema(t[aba].abaRevenda, { tipo: "andamento", anuncioId: t[aba].pedido.anuncioId, texto: "A aba do Facebook foi fechada antes de publicar.", erro: true });
    delete t[aba];
    await salvarTrabalhos(t);
  }
});
