import type { Metadata } from "next";
import { Icone } from "@/components/IconesItem";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

const FUNCOES = [
  { titulo: "Calcular compra", texto: "Quanto pagar para fechar com a margem das suas regras." },
  { titulo: "Pátio / Estoque", texto: "Custo, gastos e dias parado de cada item." },
  { titulo: "Visão geral", texto: "Lucro, caixa livre e o que está parado há tempo demais." },
];

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { negado } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-[minmax(320px,2fr)_3fr]">
      {/* Celular: faixa escura no topo. Computador: coluna escura à esquerda. */}
      <aside className="bg-lateral px-4 pt-[env(safe-area-inset-top)] md:flex md:flex-col md:border-r md:border-lateral-borda md:px-10 md:py-10 lg:px-14">
        <div className="flex min-h-13 items-center gap-2.5 md:min-h-0">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-marca font-display text-lg font-bold text-marca-texto">
            RV
          </span>
          <div className="min-w-0">
            <div className="text-base leading-tight font-bold text-white">Revenda</div>
            <div className="text-xs text-lateral-fraco">Londrina e região</div>
          </div>
        </div>

        <div className="mt-auto hidden max-w-sm md:block">
          <p className="sobrescrito text-lateral-fraco">Compra e revenda de usados</p>
          <ul className="escalonado mt-3 divide-y divide-lateral-borda border-y border-lateral-borda">
            {FUNCOES.map((f) => (
              <li key={f.titulo} className="py-3.5">
                <div className="text-[15px] font-semibold text-white">{f.titulo}</div>
                <div className="mt-0.5 text-sm text-lateral-texto">{f.texto}</div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-lateral-fraco">Uso interno · acesso só do dono</p>
        </div>
      </aside>

      <main className="flex flex-1 justify-center px-4 pt-8 pb-12 md:items-center md:px-10 md:py-12">
        <div className="entra w-full max-w-sm">
          <p className="sobrescrito mb-0.5 text-[12px]">Acesso do dono</p>
          <h1 className="titulo-pagina">Entrar</h1>
          <p className="mt-0.5 text-[15px] text-suave">Use o e-mail e a senha da sua conta.</p>
          {negado && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-ruim/25 bg-ruim-fundo px-3 py-2.5 text-sm font-medium text-ruim"
            >
              <Icone className="mt-px size-4">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </Icone>
              Esta conta não tem acesso à revenda. Entre com a conta do dono.
            </p>
          )}
          <FormLogin />
        </div>
      </main>
    </div>
  );
}
