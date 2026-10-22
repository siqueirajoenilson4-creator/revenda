import { Nav } from "@/components/Nav";
import { sessao } from "@/lib/dados";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  // Só a sessão (conferida localmente); os dados e a checagem de dono ficam nas páginas.
  const { email } = await sessao();
  return (
    <>
      <Nav email={email} />
      <div className="md:pl-60">
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:px-8 md:pb-12 md:pt-7">{children}</main>
      </div>
    </>
  );
}
