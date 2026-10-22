import type { Metadata } from "next";
import { regras as lerRegras } from "@/lib/dados";
import { FormRegras, FormImportar } from "./Formularios";
import { Cabecalho } from "@/components/Cabecalho";

export const metadata: Metadata = { title: "Regras" };

export default async function Regras() {
  const r = await lerRegras();
  return (
    <>
      <Cabecalho titulo="Regras" sub="Margens, custos e limites usados em todas as contas" />
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
        <FormRegras regras={r} />
        <section className="cartao space-y-4">
          <div>
            <h2 className="font-semibold">Backup</h2>
            <p className="mb-3 text-sm text-suave">Baixe tudo de vez em quando e guarde no Drive ou no e-mail.</p>
            <div className="flex flex-wrap gap-2">
              <a href="/api/exportar?formato=json" className="botao-secundario">Exportar JSON</a>
              <a href="/api/exportar?formato=csv" className="botao-secundario">Exportar CSV (Excel)</a>
            </div>
          </div>
          <hr className="border-borda" />
          <FormImportar />
        </section>
      </div>
    </>
  );
}
