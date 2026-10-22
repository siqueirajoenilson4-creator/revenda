"use client";

import { useActionState, useEffect } from "react";
import { entrar } from "@/app/acoes";
import { CHAVE_CONVERSA } from "@/lib/assistente";
import { Campo, Mensagem } from "@/components/Campos";
import { Girando } from "@/components/IconesItem";

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
    <form action={acao} aria-busy={enviando} className="cartao mt-5 space-y-4 p-5">
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required />
      <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
      <Mensagem estado={estado} />
      <button className="botao-principal w-full disabled:opacity-80" disabled={enviando}>
        {enviando && <Girando />}
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
