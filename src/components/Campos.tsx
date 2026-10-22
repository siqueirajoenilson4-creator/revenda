import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Icone } from "./IconesItem";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: ReactNode;
  dica?: ReactNode;
  /** Unidade dentro do campo, à direita ("%", "km", "/km"). */
  sufixo?: string;
};

// Folga à direita do texto para não passar por baixo da unidade.
const FOLGA: Record<number, string> = { 1: "pr-8", 2: "pr-10", 3: "pr-12" };

function Unidade({ children, lado }: { children: ReactNode; lado: "esquerda" | "direita" }) {
  return (
    <span
      className={`pointer-events-none absolute inset-y-0 flex items-center text-[15px] font-medium text-suave select-none ${
        lado === "esquerda" ? "left-3" : "right-3"
      }`}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** Rótulo em cima, campo e dica embaixo (lida pelo leitor de tela junto com o campo). */
function useCampo(props: { id?: string; dica?: ReactNode; sufixo?: string }) {
  const automatico = useId();
  const id = props.id ?? automatico;
  const dicaId = props.dica ? `${id}-dica` : undefined;
  const unidade = props.sufixo ? <span className="sr-only"> ({props.sufixo})</span> : null;
  return { id, dicaId, unidade };
}

function Moldura({
  id,
  dicaId,
  rotulo,
  dica,
  className,
  children,
}: {
  id: string;
  dicaId?: string;
  rotulo: ReactNode;
  dica?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      {children}
      {dica && (
        <p id={dicaId} className="mt-1.5 text-[13px] leading-snug text-suave">
          {dica}
        </p>
      )}
    </div>
  );
}

export function Campo({ rotulo, dica, sufixo, className, ...props }: Props) {
  const { id, dicaId, unidade } = useCampo({ id: props.id, dica, sufixo });
  const campo = (
    <input
      id={id}
      aria-describedby={dicaId}
      className={`campo ${sufixo ? (FOLGA[sufixo.length] ?? "pr-14") : ""}`}
      {...props}
    />
  );
  return (
    <Moldura
      id={id}
      dicaId={dicaId}
      rotulo={
        <>
          {rotulo}
          {unidade}
        </>
      }
      dica={dica}
      className={className}
    >
      {sufixo ? (
        <div className="relative">
          {campo}
          <Unidade lado="direita">{sufixo}</Unidade>
        </div>
      ) : (
        campo
      )}
    </Moldura>
  );
}

/** Campo de dinheiro: teclado numérico no celular, aceita "1.234,56". */
export function CampoReais({ rotulo, dica, sufixo, className, ...props }: Props) {
  const { id, dicaId, unidade } = useCampo({ id: props.id, dica, sufixo });
  return (
    <Moldura
      id={id}
      dicaId={dicaId}
      rotulo={
        <>
          {rotulo}
          <span className="sr-only">, em reais</span>
          {unidade}
        </>
      }
      dica={dica}
      className={className}
    >
      <div className="relative">
        <Unidade lado="esquerda">R$</Unidade>
        <input
          id={id}
          aria-describedby={dicaId}
          className={`campo pl-10 ${sufixo ? (FOLGA[sufixo.length] ?? "pr-14") : ""}`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          {...props}
        />
        {sufixo && <Unidade lado="direita">{sufixo}</Unidade>}
      </div>
    </Moldura>
  );
}

const CERTO = (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </>
);
const ALERTA = (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </>
);

/** Retorno de um formulário. Entra com fade e repete a entrada quando o texto muda. */
export function Mensagem({ estado }: { estado?: { erro?: string; ok?: string } }) {
  const erro = Boolean(estado?.erro);
  const texto = estado?.erro || estado?.ok;
  if (!texto) return null;
  return (
    <p
      key={texto}
      role={erro ? "alert" : "status"}
      className={`aparece flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm leading-snug font-semibold ${
        erro ? "bg-ruim-fundo text-ruim" : "bg-bom-fundo text-bom"
      }`}
    >
      <Icone className="mt-px size-4">{erro ? ALERTA : CERTO}</Icone>
      <span className="min-w-0">{texto}</span>
    </p>
  );
}
