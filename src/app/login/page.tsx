import type { Metadata } from "next";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { negado } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">Revenda</h1>
        <p className="mb-6 text-suave">Compra e venda de usados</p>
        {negado && (
          <p role="alert" className="mb-4 rounded-xl bg-ruim-fundo px-3 py-2 text-sm text-ruim">
            Esta conta não tem acesso à revenda. Entre com a conta do dono.
          </p>
        )}
        <FormLogin />
      </div>
    </main>
  );
}
