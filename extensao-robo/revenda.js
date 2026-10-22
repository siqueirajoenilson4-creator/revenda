// Ponte entre o site da Revenda e o robô. Roda dentro das páginas do sistema.
// O site manda "publicar" por window.postMessage; o robô devolve andamento e o link.

const DO_SITE = "revenda-site";
const DO_ROBO = "revenda-robo";

document.documentElement.dataset.roboRevenda = chrome.runtime.getManifest().version;

window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.origem !== DO_SITE) return;
  if (e.data.tipo === "publicar") chrome.runtime.sendMessage({ tipo: "publicar", pedido: e.data.pedido });
  if (e.data.tipo === "recebido") chrome.runtime.sendMessage({ tipo: "entregue", id: e.data.id });
});

// Andamento e resultado que o robô manda para esta aba.
chrome.runtime.onMessage.addListener((m) => {
  if (m?.tipo === "andamento" || m?.tipo === "publicado") window.postMessage({ ...m, origem: DO_ROBO }, location.origin);
});

// Publicações que terminaram com o sistema fechado: entrega quando a página estiver pronta.
function entregarPendentes() {
  chrome.runtime.sendMessage({ tipo: "pendentes" }, (lista) => {
    for (const m of lista ?? []) window.postMessage({ ...m, origem: DO_ROBO }, location.origin);
  });
}
if (document.readyState === "complete") setTimeout(entregarPendentes, 1500);
else window.addEventListener("load", () => setTimeout(entregarPendentes, 1500));
