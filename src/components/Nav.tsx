"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use, useEffect, useRef, useState, type ReactNode } from "react";
import { sair } from "@/app/acoes";
import { CHAVE_CONVERSA } from "@/lib/assistente";
import { COOKIE_MENU } from "@/lib/menu";
import type { NumerosMenu } from "@/lib/caixa";
import { reaisInteiros } from "@/lib/visao";

// Ícones no traço do Lucide (24×24, stroke 2).
const I = {
  painel: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  calcular: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M16 14v4M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
    </>
  ),
  patio: (
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </>
  ),
  vendas: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11" />
    </>
  ),
  anuncios: <path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" />,
  conversas: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  caixa: (
    <>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
  assistente: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22ZM8 12h.01M12 12h.01M16 12h.01" />,
  regras: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4" />,
  mais: <path d="M4 12h16M4 6h16M4 18h16" />,
  fechar: <path d="M18 6 6 18M6 6l12 12" />,
  sair: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  recolher: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M16 15l-3-3 3-3" />
    </>
  ),
  expandir: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M14 9l3 3-3 3" />
    </>
  ),
};

type Contador = "patio" | "renovar" | "esperando";
type Entrada = { href: string; rotulo: string; curto: string; icone: ReactNode; contador?: Contador };

const MENU: Entrada[] = [
  { href: "/painel", rotulo: "Visão geral", curto: "Início", icone: I.painel },
  { href: "/calcular", rotulo: "Calcular compra", curto: "Calcular", icone: I.calcular },
  { href: "/estoque", rotulo: "Pátio / Estoque", curto: "Pátio", icone: I.patio, contador: "patio" },
  { href: "/vendas", rotulo: "Vendas", curto: "Vendas", icone: I.vendas },
  { href: "/anuncios", rotulo: "Anúncios", curto: "Anúncios", icone: I.anuncios, contador: "renovar" },
  { href: "/interessados", rotulo: "Interessados", curto: "Conversas", icone: I.conversas, contador: "esperando" },
  { href: "/caixa", rotulo: "Caixa", curto: "Caixa", icone: I.caixa },
  { href: "/assistente", rotulo: "Assistente", curto: "Assistente", icone: I.assistente },
  { href: "/regras", rotulo: "Regras", curto: "Regras", icone: I.regras },
];
const porHref = (href: string) => MENU.find((m) => m.href === href)!;
// Celular: quatro abas fixas e o resto na folha "Mais".
const ABAS = ["/painel", "/estoque", "/vendas", "/interessados"].map(porHref);
const MAIS = ["/calcular", "/anuncios", "/caixa", "/assistente", "/regras"].map(porHref);

function Icone({ children, className = "size-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function Marca() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-marca font-display text-lg font-bold text-marca-texto">
      RV
    </span>
  );
}

/** A conversa do assistente tem números do negócio: não fica no aparelho depois de sair. */
function esquecerConversa() {
  try {
    localStorage.removeItem(CHAVE_CONVERSA);
  } catch {
    // navegador sem armazenamento
  }
}

/**
 * Computador: recolhe ou abre o menu lateral. Marca o #app do layout (o CSS
 * esconde o menu) e grava num cookie, para a escolha valer ao recarregar.
 */
function menuFechado(fechar: boolean) {
  const app = document.getElementById("app");
  if (app) {
    if (fechar) app.dataset.menu = "fechado";
    else delete app.dataset.menu;
  }
  document.cookie = `${COOKIE_MENU}=${fechar ? "fechado" : "aberto"}; path=/; max-age=31536000; samesite=lax`;
  // O foco vai para o botão que aparece no lugar.
  document.getElementById(fechar ? "abrir-menu" : "recolher-menu")?.focus();
}

// ---------- Números (chegam depois do menu) ----------

type Numeros = Promise<NumerosMenu | null>;
type Tom = "neutro" | "atencao" | "ruim";

function contagem(n: NumerosMenu, c: Contador): { valor: number; tom: Tom; texto: string } | null {
  if (c === "patio") return n.patio ? { valor: n.patio, tom: "neutro", texto: `${n.patio} no pátio` } : null;
  if (c === "renovar") return n.renovar ? { valor: n.renovar, tom: "atencao", texto: `${n.renovar} para renovar` } : null;
  if (!n.esperando) return null;
  return {
    valor: n.esperando,
    tom: n.esperandoDemais ? "ruim" : "atencao",
    texto: `${n.esperando} esperando resposta${n.esperandoDemais ? `, ${n.esperandoDemais} há mais de 2 h` : ""}`,
  };
}

const COR: Record<Exclude<Tom, "neutro">, string> = {
  atencao: "bg-marca text-marca-texto",
  ruim: "bg-ruim text-white",
};

const LUGAR = {
  lateral: "min-w-5 rounded-md px-1.5 text-center text-[11px] leading-5 font-bold",
  aba: "absolute -top-1.5 left-3.5 min-w-[18px] rounded-full px-1 text-center text-[10px] leading-[18px] font-bold ring-2 ring-superficie",
  topo: "absolute top-1 right-1 min-w-[18px] rounded-full px-1 text-center text-[10px] leading-[18px] font-bold ring-2 ring-lateral",
};

function LerContagem({ numeros, tipo, onde }: { numeros: Numeros; tipo: Contador; onde: keyof typeof LUGAR }) {
  const n = use(numeros);
  const c = n && contagem(n, tipo);
  // Nas abas e no topo só aparece o que pede ação; o tamanho do pátio fica no menu lateral.
  if (!c || (c.tom === "neutro" && onde !== "lateral")) return null;
  return (
    <>
      <span
        aria-hidden
        className={`aparece ${
          c.tom === "neutro" ? "text-[12px] font-semibold text-lateral-fraco tabular-nums" : `${LUGAR[onde]} ${COR[c.tom]}`
        }`}
      >
        {c.valor > 99 ? "99+" : c.valor}
      </span>
      <span className="sr-only">, {c.texto}</span>
    </>
  );
}

function Contagem(props: { numeros: Numeros; tipo?: Contador; onde: keyof typeof LUGAR }) {
  if (!props.tipo) return null;
  return (
    <Suspense fallback={null}>
      <LerContagem numeros={props.numeros} tipo={props.tipo} onde={props.onde} />
    </Suspense>
  );
}

function Barra({ fracao, className }: { fracao: number; className: string }) {
  return (
    <span className={`block overflow-hidden rounded-full bg-lateral-ativo ${className}`} aria-hidden>
      <span
        className="cresce-x block h-full rounded-full bg-marca transition-[width] duration-500 ease-saida"
        style={{ width: `${Math.min(100, fracao * 100)}%` }}
      />
    </span>
  );
}

/** Computador: a meta do mês no pé do menu lateral. */
function MetaLateral({ numeros }: { numeros: Numeros }) {
  const n = use(numeros);
  if (!n) return null;
  const { meta, mes } = n;
  const temMeta = meta.meta > 0;
  return (
    <Link
      href={temMeta ? "/vendas" : "/regras"}
      className="aparece block rounded-xl border border-lateral-borda p-3 transition-colors duration-150 hover:bg-lateral-ativo/50"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="sobrescrito text-lateral-fraco">Meta de {mes}</span>
        {meta.batida && <span className="text-[11px] font-bold tracking-[0.07em] text-marca uppercase">batida</span>}
      </span>
      <span className="mt-1 block text-[13px] text-lateral-texto">
        <span className="numero text-[19px] text-white">{reaisInteiros(meta.lucro)}</span>{" "}
        {temMeta ? `de ${reaisInteiros(meta.meta)}` : "de lucro"}
      </span>
      {temMeta ? (
        <>
          <Barra fracao={meta.fracao ?? 0} className="mt-2 h-2" />
          <span className="mt-1.5 block text-[12px] text-lateral-fraco">
            {meta.batida ? `meta batida, ${reaisInteiros(meta.lucro - meta.meta)} acima` : `faltam ${reaisInteiros(meta.falta)} de lucro`}
          </span>
        </>
      ) : (
        <span className="mt-0.5 block text-[12px] text-lateral-fraco">Defina a meta em Regras</span>
      )}
    </Link>
  );
}

/** Celular: lucro do mês e a mini barra da meta, no topo. */
function MetaTopo({ numeros }: { numeros: Numeros }) {
  const n = use(numeros);
  if (!n) return null;
  const { meta, mes } = n;
  const temMeta = meta.meta > 0;
  return (
    <Link
      href={temMeta ? "/vendas" : "/regras"}
      className="aparece flex min-h-11 min-w-0 flex-col items-end justify-center gap-1 rounded-lg px-2 transition-colors active:bg-lateral-ativo"
    >
      <span className="sr-only">
        Lucro de {mes}: {reaisInteiros(meta.lucro)}
        {temMeta && `, meta de ${reaisInteiros(meta.meta)}${meta.batida ? ", meta batida" : ""}`}
      </span>
      <span aria-hidden className="flex items-baseline gap-1 leading-none whitespace-nowrap">
        <span className="numero text-[18px] text-white">{reaisInteiros(meta.lucro)}</span>
        {temMeta && <span className="text-[11px] text-lateral-fraco max-[359px]:hidden">/ {reaisInteiros(meta.meta)}</span>}
      </span>
      {temMeta ? (
        <Barra fracao={meta.fracao ?? 0} className="h-1 w-full min-w-16" />
      ) : (
        <span aria-hidden className="text-[11px] leading-none text-lateral-fraco">
          lucro de {mes}
        </span>
      )}
    </Link>
  );
}

// ---------- Menu ----------

export function Nav({ email, numeros }: { email: string; numeros: Numeros }) {
  const caminho = usePathname();
  const ativa = (href: string) => caminho === href || caminho.startsWith(href + "/");

  return (
    <>
      {/* Computador: menu lateral escuro */}
      <aside className="menu-lateral rolagem-fina fixed inset-y-0 left-0 z-30 hidden w-58 flex-col overflow-y-auto bg-lateral px-4 py-6 md:flex">
        <div className="mb-6 flex items-center gap-2.5 pl-2">
          <Marca />
          <div className="min-w-0 flex-1">
            <div className="text-base leading-tight font-bold text-white">Revenda</div>
            <div className="text-xs text-lateral-fraco">Londrina e região</div>
          </div>
          <button
            type="button"
            id="recolher-menu"
            onClick={() => menuFechado(true)}
            title="Esconder o menu"
            aria-label="Esconder o menu"
            className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-lateral-fraco transition-colors hover:bg-lateral-ativo hover:text-white"
          >
            <Icone className="size-[18px]">{I.recolher}</Icone>
          </button>
        </div>
        <nav aria-label="Menu" className="flex flex-col gap-0.5">
          {MENU.map((a) => {
            const on = ativa(a.href);
            return (
              <Link
                key={a.href}
                href={a.href}
                prefetch
                aria-current={on ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors duration-150 ${
                  on ? "bg-lateral-ativo text-white" : "text-lateral-texto hover:bg-lateral-ativo/60 hover:text-white"
                }`}
              >
                <Icone
                  className={`size-[18px] shrink-0 transition-colors duration-150 ${on ? "text-marca" : "text-lateral-fraco group-hover:text-lateral-texto"}`}
                >
                  {a.icone}
                </Icone>
                <span className="min-w-0 flex-1 truncate">{a.rotulo}</span>
                <Contagem numeros={numeros} tipo={a.contador} onde="lateral" />
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3 pt-6">
          <Suspense fallback={null}>
            <MetaLateral numeros={numeros} />
          </Suspense>
          <div className="flex items-center gap-2 px-1 text-[13px]">
            <span className="min-w-0 flex-1 truncate text-lateral-fraco" title={email}>
              {email}
            </span>
            <form action={sair} onSubmit={esquecerConversa}>
              <button className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 font-semibold text-lateral-texto transition-colors hover:bg-lateral-ativo hover:text-white">
                <Icone className="size-3.5">{I.sair}</Icone>
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Computador, com o menu recolhido: botão para abrir de novo */}
      <button
        type="button"
        id="abrir-menu"
        onClick={() => menuFechado(false)}
        title="Mostrar o menu"
        aria-label="Mostrar o menu"
        className="abrir-menu fixed top-4 left-3 z-30 size-10 items-center justify-center rounded-lg bg-lateral text-lateral-texto shadow-(--sombra) transition-colors hover:text-white"
      >
        <Icone className="size-[18px]">{I.expandir}</Icone>
      </button>

      {/* Celular: faixa escura no topo */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-lateral pt-[env(safe-area-inset-top)] pr-2 pl-4 md:hidden"
        style={{ viewTransitionName: "topo" }}
      >
        <Link href="/painel" className="flex min-h-13 shrink-0 items-center gap-2.5">
          <Marca />
          <span className="text-base font-bold text-white">Revenda</span>
        </Link>
        <div className="flex min-w-0 items-center">
          <Suspense fallback={null}>
            <MetaTopo numeros={numeros} />
          </Suspense>
          <Link
            href="/interessados"
            aria-current={ativa("/interessados") ? "page" : undefined}
            className="relative flex size-11 shrink-0 items-center justify-center rounded-lg text-lateral-texto transition-colors active:bg-lateral-ativo"
          >
            <Icone>{I.conversas}</Icone>
            <span className="sr-only">Interessados</span>
            <Contagem numeros={numeros} tipo="esperando" onde="topo" />
          </Link>
        </div>
      </header>

      {/* Celular: abas fixas embaixo */}
      <nav
        aria-label="Seções"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-borda bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        style={{ viewTransitionName: "abas" }}
      >
        {ABAS.map((a) => {
          const on = ativa(a.href);
          return (
            <Link
              key={a.href}
              href={a.href}
              prefetch
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-15 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-150 active:bg-superficie-2 ${
                on ? "text-texto" : "text-suave"
              }`}
            >
              <Traco on={on} />
              <span className="relative">
                <Icone className={`size-[22px] transition-transform duration-200 ${on ? "-translate-y-px" : ""}`}>{a.icone}</Icone>
                <Contagem numeros={numeros} tipo={a.contador} onde="aba" />
              </span>
              {a.curto}
            </Link>
          );
        })}
        <Mais email={email} numeros={numeros} caminho={caminho} ativa={ativa} />
      </nav>
    </>
  );
}

/** Marca da aba ativa, em cima. */
function Traco({ on }: { on: boolean }) {
  return (
    <span
      className={`absolute top-0 h-[3px] w-7 rounded-b-full bg-marca transition-[scale,opacity] duration-300 ease-saida ${
        on ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
      }`}
      aria-hidden
    />
  );
}

const SAIDA_MS = 200;

/**
 * Aba "Mais" e a folha que sobe com o resto do menu. É um <dialog> modal: o
 * navegador prende o foco nele, devolve o foco ao fechar e trata o Esc.
 */
function Mais({
  email,
  numeros,
  caminho,
  ativa,
}: {
  email: string;
  numeros: Numeros;
  caminho: string;
  ativa: (href: string) => boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const relogio = useRef<number | undefined>(undefined);
  // Guarda em que tela abriu: ao navegar, a folha fecha sozinha.
  const [abertaEm, setAbertaEm] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const aberta = abertaEm === caminho;
  const on = aberta || MAIS.some((a) => ativa(a.href));

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    else if (!aberta && d.open) d.close();
  }, [aberta]);

  useEffect(() => () => window.clearTimeout(relogio.current), []);

  function fechar() {
    if (saindo) return;
    setSaindo(true);
    relogio.current = window.setTimeout(() => ref.current?.close(), SAIDA_MS);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={aberta}
        aria-controls="folha-mais"
        onClick={() => (aberta ? fechar() : setAbertaEm(caminho))}
        className={`relative flex min-h-15 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-150 active:bg-superficie-2 ${
          on ? "text-texto" : "text-suave"
        }`}
      >
        <Traco on={on} />
        <span className="relative">
          <Icone className={`size-[22px] transition-transform duration-200 ${on ? "-translate-y-px" : ""}`}>{I.mais}</Icone>
          <Contagem numeros={numeros} tipo="renovar" onde="aba" />
        </span>
        Mais
      </button>

      <dialog
        ref={ref}
        id="folha-mais"
        aria-labelledby="titulo-mais"
        onCancel={(e) => {
          e.preventDefault();
          fechar();
        }}
        onClose={() => {
          window.clearTimeout(relogio.current);
          setAbertaEm(null);
          setSaindo(false);
        }}
        // A folha não cobre a tela toda: tocar no resto fecha.
        onClick={(e) => {
          if (e.target === e.currentTarget) fechar();
        }}
        className="m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-texto backdrop:bg-transparent"
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-lateral/55 transition-opacity duration-200 starting:opacity-0 ${
            saindo ? "opacity-0" : "opacity-100"
          }`}
        />
        <div
          className={`absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-borda bg-superficie pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-(--sombra-alta) transition-transform starting:translate-y-full ${
            saindo ? "translate-y-full duration-200 ease-in" : "duration-300 ease-saida"
          }`}
        >
          <div className="flex items-center justify-between py-1 pr-2 pl-5">
            <h2 id="titulo-mais" className="sobrescrito">
              Mais
            </h2>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="flex size-11 items-center justify-center rounded-lg text-suave transition-colors active:bg-superficie-2"
            >
              <Icone>{I.fechar}</Icone>
            </button>
          </div>
          <ul className="px-2">
            {MAIS.map((a) => {
              const atual = ativa(a.href);
              return (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    prefetch
                    aria-current={atual ? "page" : undefined}
                    onClick={() => ref.current?.close()}
                    className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-base font-semibold transition-colors active:bg-superficie-2 ${
                      atual ? "bg-superficie-2" : ""
                    }`}
                  >
                    <Icone className={`size-5 shrink-0 ${atual ? "text-texto" : "text-suave"}`}>{a.icone}</Icone>
                    <span className="min-w-0 flex-1 truncate">{a.rotulo}</span>
                    <Contagem numeros={numeros} tipo={a.contador} onde="lateral" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mx-5 mt-2 flex items-center gap-3 border-t border-borda pt-3">
            <span className="min-w-0 flex-1 truncate text-[13px] text-suave">{email}</span>
            <form action={sair} onSubmit={esquecerConversa}>
              <button className="botao-pequeno min-h-11">
                <Icone className="size-4">{I.sair}</Icone>
                Sair
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
