import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { rotulo: ReactNode; dica?: ReactNode };

export function Campo({ rotulo, dica, className, ...props }: Props) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="rotulo">{rotulo}</span>
      <input className="campo" {...props} />
      {dica && <span className="mt-1 block text-xs text-suave">{dica}</span>}
    </label>
  );
}

/** Campo de dinheiro: teclado numérico no celular, aceita "1.234,56". */
export function CampoReais({ rotulo, dica, className, ...props }: Props) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="rotulo">{rotulo}</span>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-suave">R$</span>
        <input className="campo pl-10" inputMode="decimal" autoComplete="off" placeholder="0" {...props} />
      </div>
      {dica && <span className="mt-1 block text-xs text-suave">{dica}</span>}
    </label>
  );
}

export function Mensagem({ estado }: { estado?: { erro?: string; ok?: string } }) {
  if (estado?.erro) return <p role="alert" className="rounded-xl bg-ruim-fundo px-3 py-2 text-sm text-ruim">{estado.erro}</p>;
  if (estado?.ok) return <p role="status" className="rounded-xl bg-bom-fundo px-3 py-2 text-sm text-bom">{estado.ok}</p>;
  return null;
}
