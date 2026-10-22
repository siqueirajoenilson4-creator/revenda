import { startTransition, useMemo, useSyncExternalStore, type FormEvent } from "react";

const MINUTO = 60_000;

function assinar(avisar: () => void) {
  const id = setInterval(avisar, 15_000);
  return () => clearInterval(id);
}
const minutoAgora = () => Math.floor(Date.now() / MINUTO);

/**
 * Relógio do aparelho, de minuto em minuto. Na hidratação usa a hora do
 * servidor, então o HTML bate; logo depois passa para a hora do aparelho.
 */
export function useAgora(servidor: string): Date {
  const minuto = useSyncExternalStore(assinar, minutoAgora, () => Math.floor(new Date(servidor).getTime() / MINUTO));
  return useMemo(() => new Date(minuto * MINUTO), [minuto]);
}

/** Envia sem o React limpar os campos: se a gravação falhar, o que foi digitado continua lá. */
export function aoEnviar(acao: (dados: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => acao(dados));
  };
}

/** Copia para a área de transferência; sem HTTPS (ou sem permissão) cai no jeito antigo. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;
