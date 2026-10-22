import { cookies } from "next/headers";
import { Nav } from "@/components/Nav";
import { COOKIE_MENU } from "@/lib/menu";
import { numeros, sessao } from "@/lib/dados";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  // Só a sessão (conferida localmente); os números do menu chegam depois, sem segurar a página.
  const [{ email }, jar] = await Promise.all([sessao(), cookies()]);
  const fechado = jar.get(COOKIE_MENU)?.value === "fechado";
  return (
    // data-menu: o menu lateral recolhido no computador (ver globals.css).
    <div id="app" data-menu={fechado ? "fechado" : undefined}>
      <Nav email={email} numeros={numeros()} />
      <div className="conteudo-app md:pl-58">
        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 md:px-8 md:pt-7 md:pb-12">{children}</main>
      </div>
    </div>
  );
}
