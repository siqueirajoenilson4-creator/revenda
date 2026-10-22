"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/acoes";
import { CHAVE_CONVERSA } from "@/lib/assistente";

/** A conversa do assistente tem números do negócio: não fica no aparelho depois de sair. */
function esquecerConversa() {
  try {
    localStorage.removeItem(CHAVE_CONVERSA);
  } catch {
    // navegador sem armazenamento
  }
}

// Ícones no traço do Lucide (24×24, stroke 2).
const ABAS = [
  {
    href: "/painel",
    rotulo: "Painel",
    icone: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
  },
  {
    href: "/estoque",
    rotulo: "Estoque",
    icone: (
      <>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
      </>
    ),
  },
  {
    href: "/calcular",
    rotulo: "Calcular",
    icone: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M8 6h8M16 14v4M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
      </>
    ),
  },
  {
    href: "/assistente",
    rotulo: "Assistente",
    icone: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22ZM8 12h.01M12 12h.01M16 12h.01" />,
  },
  {
    href: "/regras",
    rotulo: "Regras",
    icone: (
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4" />
    ),
  },
];

function Icone({ children, className = "size-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export function Nav({ email }: { email: string }) {
  const caminho = usePathname();
  const ativa = (href: string) => caminho === href || caminho.startsWith(href + "/");

  return (
    <>
      {/* Computador: menu lateral escuro */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-lateral px-3 py-5 md:flex">
        <div className="mb-7 flex items-center gap-2.5 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-9 rounded-lg" />
          <div>
            <div className="text-[15px] font-semibold leading-tight text-white">Revenda</div>
            <div className="text-xs text-lateral-texto">Londrina e região</div>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {ABAS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              prefetch
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                ativa(a.href) ? "bg-lateral-ativo text-white" : "text-lateral-texto hover:bg-lateral-ativo/60 hover:text-white"
              }`}
            >
              <Icone className={`size-[18px] ${ativa(a.href) ? "text-marca" : ""}`}>{a.icone}</Icone>
              {a.rotulo}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 px-2 pt-4 text-xs text-lateral-texto">
          <div className="truncate" title={email}>{email}</div>
          <form action={sair} onSubmit={esquecerConversa}>
            <button className="mt-1 font-medium text-slate-300 hover:text-white">Sair</button>
          </form>
        </div>
      </aside>

      {/* Celular: abas fixas embaixo */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-borda bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ABAS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            prefetch
            className={`flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-medium ${
              ativa(a.href) ? "text-marca" : "text-suave"
            }`}
          >
            <span className={`rounded-full px-4 py-0.5 ${ativa(a.href) ? "bg-marca-fundo" : ""}`}>
              <Icone>{a.icone}</Icone>
            </span>
            {a.rotulo}
          </Link>
        ))}
      </nav>
    </>
  );
}
