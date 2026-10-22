import type { ReactNode } from "react";

// Ícones das telas do pátio, no traço do Lucide (24×24, stroke 2), como no menu.

export function Icone({ children, className = "size-4" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Indicador de carregando (para no movimento reduzido, o texto ao lado continua). */
export function Girando({ className = "size-4" }: { className?: string }) {
  return (
    <Icone className={`animate-spin ${className}`}>
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </Icone>
  );
}

export const LUPA = (
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>
);
export const VOLTAR = <path d="m15 18-6-6 6-6" />;
export const FECHAR = <path d="M18 6 6 18M6 6l12 12" />;
export const LIXEIRA = <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />;
export const ESTRELA = <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" />;
export const DESFAZER = <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />;
export const CONVERSA = <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22ZM8 12h.01M12 12h.01M16 12h.01" />;
export const FOTO_MAIS = (
  <>
    <path d="M16 5h6M19 2v6M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" />
    <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    <circle cx="9" cy="9" r="2" />
  </>
);
