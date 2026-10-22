"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { adicionarGasto, anunciar, apagarItem, vendi, type Resultado } from "@/app/acoes";
import { lerReais, paraCampo, reais } from "@/lib/formato";
import { Campo, CampoReais, Mensagem } from "./Campos";

export type ItemResumo = {
  id: string;
  nome: string;
  tipo: "revenda" | "capital";
  situacao: "comprado" | "anunciado" | "vendido";
  preco_alvo: number | null;
  custo: number;
};

type Painel = "gasto" | "anunciar" | "vendi" | "apagar" | null;

/** Painel por cima da tela (folha embaixo no celular, caixa central no computador). */
export function Folha({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] md:items-center" onClick={aoFechar}>
      <div
        role="dialog"
        aria-label={titulo}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-borda bg-superficie p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">{titulo}</h2>
          <button type="button" onClick={aoFechar} className="-m-2 rounded-md p-2 text-suave hover:bg-superficie-2" aria-label="Fechar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function useFechaAoConcluir(estado: Resultado, fechar: () => void) {
  useEffect(() => {
    if (estado?.ok) fechar();
  }, [estado, fechar]);
}

function FormGasto({ item, hoje, fechar }: { item: ItemResumo; hoje: string; fechar: () => void }) {
  const [estado, acao, enviando] = useActionState(adicionarGasto, undefined);
  useFechaAoConcluir(estado, fechar);
  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="item_id" value={item.id} />
      <Campo rotulo="Com o quê" name="descricao" placeholder="Ex.: pneu, limpeza, documento" required autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <CampoReais rotulo="Valor" name="valor" required />
        <Campo rotulo="Data" name="data" type="date" defaultValue={hoje} />
      </div>
      <Mensagem estado={estado} />
      <button className="botao-principal w-full" disabled={enviando}>{enviando ? "Salvando…" : "Lançar gasto"}</button>
    </form>
  );
}

function FormAnunciar({ item, fechar }: { item: ItemResumo; fechar: () => void }) {
  const [estado, acao, enviando] = useActionState(anunciar, undefined);
  useFechaAoConcluir(estado, fechar);
  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={item.id} />
      <CampoReais rotulo="Preço do anúncio" name="preco" defaultValue={paraCampo(item.preco_alvo)} required autoFocus />
      <p className="text-sm text-suave">
        Marca o item como anunciado. A tela de anúncios com OLX e Facebook chega na Fase 2.
      </p>
      <Mensagem estado={estado} />
      <button className="botao-principal w-full" disabled={enviando}>{enviando ? "Salvando…" : "Marcar como anunciado"}</button>
    </form>
  );
}

function FormVendi({ item, hoje, fechar }: { item: ItemResumo; hoje: string; fechar: () => void }) {
  const [estado, acao, enviando] = useActionState(vendi, undefined);
  const [valor, setValor] = useState(paraCampo(item.preco_alvo));
  useFechaAoConcluir(estado, fechar);
  const v = lerReais(valor);
  const lucro = v != null ? v - item.custo : null;
  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={item.id} />
      <div className="grid grid-cols-2 gap-3">
        <CampoReais rotulo="Vendi por" name="valor" value={valor} onChange={(e) => setValor(e.target.value)} required autoFocus />
        <Campo rotulo="Data" name="data" type="date" defaultValue={hoje} />
      </div>
      {item.tipo === "capital" ? (
        <p className="text-sm text-suave">Capital próprio: o valor entra no caixa, mas não conta como lucro.</p>
      ) : (
        lucro != null && (
          <p className={`text-sm font-medium ${lucro > 0 ? "text-bom" : "text-ruim"}`}>
            Custo {reais(item.custo)} → lucro de {reais(lucro)}
          </p>
        )
      )}
      <Mensagem estado={estado} />
      <button className="botao-principal w-full" disabled={enviando}>{enviando ? "Salvando…" : "Registrar venda"}</button>
    </form>
  );
}

function ConfirmarApagar({ item, fechar, depois }: { item: ItemResumo; fechar: () => void; depois?: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  const router = useRouter();
  return (
    <div className="space-y-3">
      <p>
        Apagar <strong>{item.nome}</strong>? Os gastos e as fotos dele também somem. Não dá para desfazer.
      </p>
      <Mensagem estado={{ erro }} />
      <div className="flex gap-2">
        <button
          type="button"
          className="botao-perigo flex-1"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await apagarItem(item.id);
              if (r?.erro) return setErro(r.erro);
              fechar();
              if (depois) router.push(depois);
            })
          }
        >
          {pendente ? "Apagando…" : "Sim, apagar"}
        </button>
        <button type="button" className="botao-secundario flex-1" onClick={fechar}>Cancelar</button>
      </div>
    </div>
  );
}

const TITULOS: Record<Exclude<Painel, null>, string> = {
  gasto: "Lançar gasto",
  anunciar: "Anunciar",
  vendi: "Registrar venda",
  apagar: "Apagar item",
};

/** Menu "Mais" (fecha ao clicar fora ou apertar Esc). */
function MenuMais({ children }: { children: (fechar: () => void) => ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);
  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        className="botao-pequeno px-2"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Mais ações"
        onClick={() => setAberto((x) => !x)}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-borda bg-superficie py-1 shadow-lg">
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  );
}

const itemMenu = "block w-full px-3 py-2 text-left text-sm hover:bg-superficie-2";

export function ItemAcoes({
  item,
  hoje,
  noDetalhe = false,
  compacto = false,
}: {
  item: ItemResumo;
  hoje: string;
  noDetalhe?: boolean;
  /** Listas: "+ Gasto", "Vendi" e o resto no menu "Mais". */
  compacto?: boolean;
}) {
  const [painel, setPainel] = useState<Painel>(null);
  const fechar = () => setPainel(null);
  const vendido = item.situacao === "vendido";

  return (
    <>
      {compacto ? (
        <div className="flex items-center justify-end gap-1.5">
          <button type="button" className="botao-pequeno" onClick={() => setPainel("gasto")}>+ Gasto</button>
          {!vendido && (
            <button type="button" className="botao-pequeno" onClick={() => setPainel("vendi")}>Vendi</button>
          )}
          <MenuMais>
            {(fecharMenu) => (
              <>
                {!vendido && (
                  <button type="button" role="menuitem" className={itemMenu} onClick={() => { fecharMenu(); setPainel("anunciar"); }}>
                    Anunciar
                  </button>
                )}
                <Link role="menuitem" className={itemMenu} href={`/estoque/${item.id}/editar`}>Editar</Link>
                <button type="button" role="menuitem" className={`${itemMenu} text-ruim`} onClick={() => { fecharMenu(); setPainel("apagar"); }}>
                  Apagar
                </button>
              </>
            )}
          </MenuMais>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="botao-secundario" onClick={() => setPainel("gasto")}>+ Gasto</button>
          {!vendido && (
            <button type="button" className="botao-principal" onClick={() => setPainel("vendi")}>Vendi</button>
          )}
          {!vendido && (
            <button type="button" className="botao-secundario" onClick={() => setPainel("anunciar")}>Anunciar</button>
          )}
          <Link className="botao-secundario" href={`/estoque/${item.id}/editar`}>Editar</Link>
          <button type="button" className="botao-secundario text-ruim" onClick={() => setPainel("apagar")}>Apagar</button>
        </div>
      )}
      {painel && (
        <Folha titulo={`${TITULOS[painel]} · ${item.nome}`} aoFechar={fechar}>
          {painel === "gasto" && <FormGasto item={item} hoje={hoje} fechar={fechar} />}
          {painel === "anunciar" && <FormAnunciar item={item} fechar={fechar} />}
          {painel === "vendi" && <FormVendi item={item} hoje={hoje} fechar={fechar} />}
          {painel === "apagar" && (
            <ConfirmarApagar item={item} fechar={fechar} depois={noDetalhe ? "/estoque" : undefined} />
          )}
        </Folha>
      )}
    </>
  );
}
