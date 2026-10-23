// Robô no Facebook Marketplace. Só age em abas que o próprio sistema abriu
// (o background guarda o trabalho por aba); em qualquer outra página do
// Marketplace não faz nada. Trabalha no ritmo de uma pessoa e, se não achar
// algum campo, para e pede para terminar à mão; o link é pego do mesmo jeito.

const MEUS_ANUNCIOS = "https://www.facebook.com/marketplace/you/selling";

const pedir = (m) => chrome.runtime.sendMessage(m);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
/** Pausa de gente: entre min e max milissegundos. */
const pausa = (min = 700, max = 1600) => esperar(min + Math.random() * (max - min));
const norm = (t) =>
  (t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*[-–—]\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

let parado = false;

// ---------- Painel de andamento (canto da tela) ----------

let painel;
function mostrar(texto, tom = "normal") {
  if (!painel) {
    painel = document.createElement("div");
    painel.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:340px;padding:14px 16px;border-radius:12px;" +
      "background:#141b23;color:#fff;font:14px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)";
    painel.innerHTML =
      '<div style="font-weight:700;margin-bottom:4px">Robô da Revenda</div><div data-texto></div>' +
      '<button data-parar style="margin-top:10px;padding:6px 12px;border-radius:8px;border:0;background:#f5a524;color:#141b23;font-weight:700;cursor:pointer">Parar o robô</button>';
    painel.querySelector("[data-parar]").onclick = async () => {
      parado = true;
      await pedir({ tipo: "cancelar" });
      mostrar("Robô parado. Pode continuar à mão.", "erro");
    };
    document.body.appendChild(painel);
  }
  const el = painel.querySelector("[data-texto]");
  el.textContent = texto;
  el.style.color = tom === "erro" ? "#ffb4a8" : tom === "ok" ? "#9be7a7" : "#fff";
}

function andamento(texto, erro = false) {
  mostrar(texto, erro ? "erro" : "normal");
  pedir({ tipo: "andamento", texto, erro });
}

class Parou extends Error {}
function conferir() {
  if (parado) throw new Parou();
}

// ---------- Achar coisas na tela ----------

async function aguardar(achar, ms = 15000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    conferir();
    const x = achar();
    if (x) return x;
    await esperar(300);
  }
  return null;
}

const visivel = (el) => !!el && el.getClientRects().length > 0;

/** Campo pelo rótulo que aparece na tela ("Título", "Preço"...). */
function campo(...rotulos) {
  const alvos = rotulos.map(norm);
  for (const label of document.querySelectorAll("label")) {
    if (!visivel(label)) continue;
    const textos = [...label.querySelectorAll("span")].map((s) => norm(s.textContent));
    if (!textos.some((t) => alvos.includes(t))) continue;
    const el = label.querySelector("input:not([type=file]), textarea, [contenteditable=true]");
    if (el) return el;
    if (label.getAttribute("role") === "combobox" || label.querySelector("[role=combobox]")) return label;
  }
  for (const r of alvos) {
    const el = [...document.querySelectorAll("input[aria-label], textarea[aria-label], [role=combobox][aria-label]")].find(
      (e) => visivel(e) && norm(e.getAttribute("aria-label")) === r,
    );
    if (el) return el;
  }
  return null;
}

/** Botão pelo nome. `comeco`: aceita texto que começa assim ("Mais detalhes Atraia mais..."). */
function botao(textos, comeco = false) {
  const alvos = [].concat(textos).map(norm);
  const casa = (t) => alvos.some((a) => t === a || (comeco && t.startsWith(a)));
  return [...document.querySelectorAll('[role="button"], button')].find((b) => {
    if (!visivel(b) || b.getAttribute("aria-disabled") === "true" || b.disabled) return false;
    return casa(norm(b.getAttribute("aria-label"))) || casa(norm(b.textContent));
  });
}

/** Clique de gente: o Facebook abre algumas listas no pointerdown, não no click. */
function clicar(el) {
  const r = el.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, view: window, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
  el.dispatchEvent(new PointerEvent("pointerdown", o));
  el.dispatchEvent(new MouseEvent("mousedown", o));
  el.dispatchEvent(new PointerEvent("pointerup", o));
  el.dispatchEvent(new MouseEvent("mouseup", o));
  el.click();
}

// ---------- Ações ----------

async function digitar(el, valor) {
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  await pausa(300, 700);
  el.focus();
  el.click();
  await pausa(200, 500);
  document.execCommand("selectAll", false);
  // Em pedaços, como quem cola e ajusta: o React do Facebook registra cada um.
  const pedacos = valor.match(/[\s\S]{1,40}/g) ?? [""];
  for (const p of pedacos) {
    conferir();
    document.execCommand("insertText", false, p);
    await esperar(40 + Math.random() * 120);
  }
  const atual = "value" in el ? el.value : el.textContent;
  if (norm(atual) !== norm(valor) && "value" in el) {
    // Plano B: troca o valor direto e avisa o React.
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, valor);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  el.blur?.();
}

// O Facebook muda o texto das opções de condição de tempos em tempos: aceita os nomes antigos e os novos.
const CONDICOES = [
  ["novo"],
  ["usado - estado de novo", "usado - como novo"],
  ["usado - em boas condicoes", "usado - em bom estado"],
  ["usado - em condicoes razoaveis", "usado - em estado razoavel"],
];
const parecidos = (opcao) => CONDICOES.find((g) => g.includes(norm(opcao))) ?? [norm(opcao)];

async function escolher(rotulo, opcao) {
  const c = campo(rotulo);
  if (!c) return false;
  c.scrollIntoView({ block: "center", behavior: "smooth" });
  await pausa(300, 700);
  if (c.getAttribute("aria-expanded") !== "true") c.click();
  const alvos = parecidos(opcao);
  const acharOpcao = () => {
    const ops = [...document.querySelectorAll('[role="option"], [role="menuitemradio"], [role="menuitem"], [role="radio"]')].filter(visivel);
    const op = ops.find((o) => alvos.includes(norm(o.textContent))) ?? ops.find((o) => alvos.some((a) => norm(o.textContent).startsWith(a)));
    if (op) return op;
    // Sem papel de opção: o texto exato, fora do próprio campo, e o pai clicável dele.
    const span = [...document.querySelectorAll("span")].find((e) => visivel(e) && !c.contains(e) && alvos.includes(norm(e.textContent)));
    return span?.closest('[role="button"], [tabindex], [role="option"]') ?? span ?? null;
  };
  let item = await aguardar(acharOpcao, 4000);
  if (!item) {
    clicar(c); // segunda tentativa, com clique completo
    item = await aguardar(acharOpcao, 5000);
  }
  if (!item) {
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }
  await pausa(300, 800);
  clicar(item);
  await pausa(400, 900);
  return true;
}

async function subirFotos(urls) {
  const input = await aguardar(() =>
    [...document.querySelectorAll('input[type="file"]')].find((i) => (i.accept ?? "").includes("image")),
  );
  if (!input) return false;
  const dt = new DataTransfer();
  for (let i = 0; i < urls.length; i++) {
    conferir();
    andamento(`Baixando foto ${i + 1} de ${urls.length}…`);
    const r = await pedir({ tipo: "foto", url: urls[i] });
    if (!r || r.erro) throw new Error("Não deu para baixar as fotos. Abra o anúncio no sistema de novo e tente outra vez.");
    const bytes = Uint8Array.from(atob(r.dados), (c) => c.charCodeAt(0));
    dt.items.add(new File([bytes], `foto-${i + 1}.jpg`, { type: r.tipo }));
  }
  andamento("Enviando as fotos…");
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await pausa(2500, 4000);
  return true;
}

// ---------- Fases ----------

async function preencher(pedido) {
  andamento("Esperando a tela de criar anúncio…");
  const titulo = await aguardar(() => campo("Título"), 25000);
  if (!titulo) throw new Error("Não achei a tela de criar anúncio. Confira se o Facebook está logado.");
  await pausa(1200, 2200);

  if (!(await subirFotos(pedido.fotos))) throw new Error("Não achei onde pôr as fotos.");

  andamento("Escrevendo o título…");
  await digitar(titulo, pedido.titulo);
  await pausa();

  andamento("Colocando o preço…");
  const preco = campo("Preço");
  if (!preco) throw new Error("Não achei o campo de preço.");
  await digitar(preco, pedido.preco);
  await pausa();

  andamento(`Escolhendo a categoria (${pedido.categoria})…`);
  if (!(await escolher("Categoria", pedido.categoria)) && !(await escolher("Categoria", "Diversos"))) {
    throw new Error("Não consegui escolher a categoria. Escolha à mão.");
  }
  await pausa();

  if (pedido.condicao) {
    andamento("Escolhendo a condição…");
    if (!(await escolher("Condição", pedido.condicao))) throw new Error("Não consegui escolher a condição. Escolha à mão.");
    await pausa();
  }

  if (pedido.descricao) {
    let desc = campo("Descrição");
    if (!desc) {
      // Às vezes fica dentro de "Mais detalhes".
      const mais = botao("Mais detalhes", true);
      if (mais) {
        mais.click();
        await pausa();
        desc = await aguardar(() => campo("Descrição"), 4000);
      }
    }
    if (!desc) throw new Error("Não achei a descrição.");
    andamento("Escrevendo a descrição…");
    await digitar(desc, pedido.descricao);
    await pausa(1000, 2000);
  }
}

async function publicar() {
  // Uma ou duas telas: "Avançar" (grupos e entrega) e depois "Publicar".
  for (let passo = 0; passo < 3; passo++) {
    const b = await aguardar(() => botao(["Publicar", "Avançar", "Próximo"]), 20000);
    if (!b) throw new Error("O botão Publicar não liberou. Confira os campos em vermelho e publique à mão.");
    const ehPublicar = norm(b.textContent) === "publicar" || norm(b.getAttribute("aria-label")) === "publicar";
    andamento(ehPublicar ? "Publicando…" : "Avançando…");
    await pausa(800, 1600);
    b.click();
    if (ehPublicar) return;
    await pausa(1500, 2500);
  }
  throw new Error("Não achei o botão Publicar.");
}

/** Espera sair da tela de criar (publicou), mesmo se ele terminou à mão. */
async function aguardarPublicacao(ms) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (!location.pathname.startsWith("/marketplace/create")) return true;
    await esperar(1000);
  }
  return false;
}

async function pegarLink(pedido) {
  andamento("Procurando o link do anúncio…");
  const alvo = norm(pedido.titulo).slice(0, 30);
  const link = await aguardar(() => {
    for (const a of document.querySelectorAll('a[href*="/marketplace/item/"]')) {
      if (norm(a.textContent).includes(alvo) || norm(a.closest("[role=article], div")?.textContent).includes(alvo)) {
        const m = a.href.match(/\/marketplace\/item\/(\d+)/);
        if (m) return `https://www.facebook.com/marketplace/item/${m[1]}/`;
      }
    }
    return null;
  }, 20000);
  return link;
}

async function rodar() {
  const trabalho = await pedir({ tipo: "trabalho" });
  if (!trabalho) return; // aba que o sistema não abriu: não mexe
  const { pedido, fase } = trabalho;

  try {
    if (fase === "preencher" && location.pathname.startsWith("/marketplace/create")) {
      try {
        await preencher(pedido);
        await publicar();
      } catch (e) {
        if (e instanceof Parou) return;
        andamento(`${e.message} Quando publicar, eu pego o link sozinho.`, true);
      }
      await pedir({ tipo: "fase", fase: "link" });
      if (!(await aguardarPublicacao(30 * 60 * 1000))) return;
      andamento("Publicado! Indo buscar o link…");
      await pausa(3000, 5000);
      location.href = MEUS_ANUNCIOS;
      return;
    }

    if (fase === "link") {
      if (!location.pathname.startsWith("/marketplace/you")) {
        location.href = MEUS_ANUNCIOS;
        return;
      }
      const link = await pegarLink(pedido);
      await pedir({ tipo: "concluido", link });
      mostrar(link ? "Pronto! Publicado e link salvo no sistema." : "Publicado! Não achei o link; cole à mão no sistema.", link ? "ok" : "erro");
    }
  } catch (e) {
    if (!(e instanceof Parou)) andamento(String(e.message ?? e), true);
  }
}

rodar();
