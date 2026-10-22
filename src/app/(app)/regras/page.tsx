import type { Metadata } from "next";
import type { ReactNode } from "react";
import { caixaLivre } from "@/lib/calculo";
import { itens, regras as lerRegras } from "@/lib/dados";
import { FormRegras, FormImportar } from "./Formularios";
import { Cabecalho } from "@/components/Cabecalho";
import { Icone } from "@/components/IconesItem";

export const metadata: Metadata = { title: "Regras" };

const BAIXAR = <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const JSON_ = (
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
  </>
);
const PLANILHA = (
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h2M14 13h2M8 17h2M14 17h2" />
  </>
);

function Exportar({ formato, icone, titulo, detalhe }: { formato: string; icone: ReactNode; titulo: string; detalhe: string }) {
  return (
    <a
      href={`/api/exportar?formato=${formato}`}
      download
      className="group botao-secundario min-h-14 justify-start gap-3 px-3 py-2.5 text-left"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-superficie-2 text-suave ring-1 ring-borda ring-inset">
        <Icone className="size-[18px]">{icone}</Icone>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block">{titulo}</span>
        <span className="block text-[13px] font-normal text-suave">{detalhe}</span>
      </span>
      <Icone className="size-[18px] text-suave transition-transform duration-200 ease-saida group-hover:translate-y-0.5">
        {BAIXAR}
      </Icone>
    </a>
  );
}

export default async function Regras() {
  const [r, lista] = await Promise.all([lerRegras(), itens("nenhuma")]);
  return (
    <>
      <Cabecalho sobre="Configuração" titulo="Regras" sub="Margens, custos e limites usados em todas as contas." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-6">
        <FormRegras regras={r} caixa={caixaLivre(lista, r)} />

        <div className="escalonado grid gap-4 lg:grid-cols-2 lg:items-start xl:grid-cols-1">
          <section aria-labelledby="titulo-backup" className="cartao p-0">
            <div className="px-4 pt-4 md:px-5 md:pt-5">
              <h2 id="titulo-backup" className="titulo-secao">
                Backup
              </h2>
              <p className="mt-0.5 text-[13px] text-suave">Baixe tudo de vez em quando e guarde no Drive ou no e-mail.</p>
            </div>
            <div className="grid gap-2 p-4 md:p-5">
              <Exportar formato="json" icone={JSON_} titulo="Exportar JSON" detalhe="Cópia completa, volta pelo Importar" />
              <Exportar formato="csv" icone={PLANILHA} titulo="Exportar CSV" detalhe="Abre no Excel" />
            </div>
          </section>
          <FormImportar />
        </div>
      </div>
    </>
  );
}
