import { ViewTransition } from "react";

// Cada troca de tela monta um template novo: a tela anterior sai e a nova sobe
// (CSS em globals.css, classe "pagina"). O menu fica fora e não se mexe.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="pagina" exit="pagina" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
