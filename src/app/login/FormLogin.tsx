"use client";

import { useActionState, useEffect } from "react";
import { entrar } from "@/app/acoes";
import { CHAVE_CONVERSA } from "@/lib/assistente";
import { Campo, Mensagem } from "@/components/Campos";

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, undefined);

  // Sessão que expirou sem clicar em "Sair": a conversa do assistente também não fica no aparelho.
  useEffect(() => {
    try {
      localStorage.removeItem(CHAVE_CONVERSA);
    } catch {
      // navegador sem armazenamento
    }
  }, []);

  return (
    <form action={acao} className="cartao space-y-4">
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
      <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
      <Mensagem estado={estado} />
      <button className="botao-principal w-full" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
