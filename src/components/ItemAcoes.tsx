"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { adicionarGasto, anunciar, apagarItem, vendi, type Resultado } from "@/app/acoes";
import { lerReais, paraCampo, pctTexto, reais } from "@/lib/formato";
import { Campo, CampoReais, Mensagem } from "./Campos";
import { CONVERSA, FECHAR, Icone, LIXEIRA } from "./IconesItem";

export type ItemResumo = {
  id: string;
  nome: string;
  tipo: "revenda" | "capital";
  situacao: "comprado" | "anunciado" | "vendido";
  preco_alvo: number | null;
  custo: number;
};

type Painel = "gasto" | "anunciar" | "vendi" | "apagar";

/** Painel por cima da tela (folha embaixo no celular, caixa central no computador). */
export function Folha({
  titulo,
  sobre,
  aoFechar,
  children,
}: {
  titulo: string;
  sobre?: string;
  aoFechar: () => void;
  children: ReactNode;
}) {
  const id = useId();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);
  // No body: um cartão com translate (hover) prenderia o position: fixed dentro dele.
  return createPortal(
    <div
      className="aparece fixed inset-0 z-40 flex items-end justify-center bg-lateral/60 backdrop-blur-[2px] md:items-center md:p-6"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="entra max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-borda bg-superficie p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-(--sombra-alta) md:max-w-md md:rounded-xl md:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {sobre && <p className="sobrescrito truncate">{sobre}</p>}
            <h2 id={id} className="titulo-secao">{titulo}</h2>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-suave transition-colors hover:bg-superficie-2 hover:text-texto"
          >
            <Icone className="size-5">{FECHAR}</Icone>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function useFechaAoConcluir(estado: Resultado, fechar: () => void) {
  useEffect(() => {
    if (estado?.ok) fechar();
  }, [estado, fechar]);
}

/** Custo, lucro e margem sobre o custo, ao vivo enquanto digita o valor. */
function Conta({ custo, valor, rotuloLucro }: { custo: number; valor: number | null; rotuloLucro: string }) {
  const lucro = valor != null ? valor - custo : null;
  const margem = lucro != null && custo > 0 ? lucro / custo : null;
  const tom = lucro == null ? "" : lucro > 0 ? "text-bom" : "text-ruim";
  return (
    <dl className="grid grid-cols-3 divide-x divide-borda rounded-lg border border-borda bg-superficie-2 py-2.5">
      <div className="min-w-0 px-3">
        <dt className="sobrescrito truncate">Custo</dt>
        <dd className="font-semibold">{reais(custo, true)}</dd>
      </div>
      <div className="min-w-0 px-3">
        <dt className="sobrescrito truncate">{rotuloLucro}</dt>
        <dd className={`truncate font-semibold ${tom}`}>{reais(lucro, true)}</dd>
      </div>
      <div className="min-w-0 px-3">
        <dt className="sobrescrito truncate">Margem</dt>
        <dd className={`font-semibold ${tom}`}>{pctTexto(margem, 0)}</dd>
      </div>
    </dl>
  );
}

const AVISO_CAPITAL = "Capital próprio: o valor entra no caixa, mas não conta como lucro.";

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
      <p className="text-[13px] text-suave">Soma no custo do item (hoje {reais(item.custo)}) e sai do caixa.</p>
      <Mensagem estado={estado} />
      <button className="botao-principal w-full" disabled={enviando}>{enviando ? "Salvando…" : "Lançar gasto"}</button>
    </form>
  );
}

function FormAnunciar({ item, fechar }: { item: ItemResumo; fechar: () => void }) {
  const [estado, acao, enviando] = useActionState(anunciar, undefined);
  const [preco, setPreco] = useState(paraCampo(item.preco_alvo));
  useFechaAoConcluir(estado, fechar);
  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={item.id} />
      <CampoReais
        rotulo="Preço do anúncio"
        name="preco"
        value={preco}
        onChange={(e) => setPreco(e.target.value)}
        required
        autoFocus
      />
      {item.tipo === "capital" ? (
        <p className="text-[13px] text-suave">{AVISO_CAPITAL}</p>
      ) : (
        <Conta custo={item.custo} valor={lerReais(preco)} rotuloLucro="Lucro prev." />
      )}
      <Mensagem estado={estado} />
      <button className="botao-principal w-full" disabled={enviando}>
        {enviando ? "Salvando…" : item.situacao === "anunciado" ? "Salvar novo preço" : "Marcar como anunciado"}
      </button>
    </form>
  );
}

function FormVendi({ item, hoje, fechar }: { item: ItemResumo; hoje: string; fechar: () => void }) {
  const [estado, acao, enviando] = useActionState(vendi, undefined);
  const [valor, setValor] = useState(paraCampo(item.preco_alvo));
  useFechaAoConcluir(estado, fechar);
  const v = lerReais(valor);
  const desconto = v != null && item.preco_alvo && v < item.preco_alvo ? item.preco_alvo - v : null;
  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={item.id} />
      <div className="grid grid-cols-2 gap-3">
        <CampoReais rotulo="Vendi por" name="valor" value={valor} onChange={(e) => setValor(e.target.value)} required autoFocus />
        <Campo rotulo="Data" name="data" type="date" defaultValue={hoje} />
      </div>
      {item.tipo === "capital" ? (
        <p className="text-[13px] text-suave">{AVISO_CAPITAL}</p>
      ) : (
        <Conta custo={item.custo} valor={v} rotuloLucro="Lucro" />
      )}
      {desconto != null && (
        <p className="text-[13px] text-suave">
          {reais(desconto)} abaixo do anúncio ({pctTexto(desconto / item.preco_alvo!, 0)} de desconto).
        </p>
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
    <div className="space-y-4">
      <p className="text-[15px]">
        Apagar <strong>{item.nome}</strong>? Os gastos e as fotos dele também somem. Não dá para desfazer.
      </p>
      <Mensagem estado={{ erro }} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="botao-secundario" onClick={fechar}>Cancelar</button>
        <button
          type="button"
          className="botao-perigo"
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
      </div>
    </div>
  );
}

const TITULOS: Record<Painel, string> = {
  gasto: "Lançar gasto",
  anunciar: "Anunciar",
  vendi: "Registrar venda",
  apagar: "Apagar item",
};

/** Menu "Mais" (fecha ao clicar fora ou apertar Esc). */
function MenuMais({ paraCima, children }: { paraCima?: boolean; children: (fechar: () => void) => ReactNode }) {
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
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        className={`botao-pequeno min-h-11 w-11 px-0 md:min-h-9 md:w-9 ${aberto ? "border-suave/50 bg-superficie-2" : ""}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Mais ações"
        onClick={() => setAberto((x) => !x)}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {aberto && (
        <div
          role="menu"
          className={`aparece absolute right-0 z-20 w-48 overflow-hidden rounded-lg border border-borda bg-superficie py-1 shadow-(--sombra-alta) ${
            paraCima ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  );
}

const ITEM_MENU =
  "flex min-h-11 w-full items-center px-3 text-left text-[15px] font-medium transition-colors hover:bg-superficie-2 md:min-h-9 md:text-sm";
const PEQUENO = "botao-pequeno min-h-11 text-sm md:min-h-9 md:text-[13px]";
const SECUNDARIO = "botao-secundario px-3 sm:px-4";

export function ItemAcoes({
  item,
  hoje,
  noDetalhe = false,
  compacto = false,
  soMenu = false,
}: {
  item: ItemResumo;
  hoje: string;
  noDetalhe?: boolean;
  /** Cartões da lista: a ação mais provável, "+ Gasto" e o resto no menu "Mais". */
  compacto?: boolean;
  /** Tabela: só o menu "Mais", com todas as ações. */
  soMenu?: boolean;
}) {
  const [painel, setPainel] = useState<Painel | null>(null);
  const fechar = () => setPainel(null);
  const vendido = item.situacao === "vendido";
  const parado = item.situacao === "comprado";
  // A ação mais provável: anunciar o que está parado, vender o que já está anunciado.
  const principal: Painel | null = vendido ? null : parado ? "anunciar" : "vendi";
  const rotulo: Record<Painel, string> = {
    gasto: "Lançar gasto",
    anunciar: parado ? "Anunciar" : "Mudar preço",
    vendi: "Registrar venda",
    apagar: "Apagar",
  };
  const editar = `/estoque/${item.id}/editar`;

  const menu = (opcoes: Painel[]) => (
    <MenuMais paraCima={compacto}>
      {(fecharMenu) => {
        const abrir = (p: Painel) => () => {
          fecharMenu();
          setPainel(p);
        };
        return (
          <>
            {opcoes.map((p) => (
              <button key={p} type="button" role="menuitem" className={ITEM_MENU} onClick={abrir(p)}>
                {rotulo[p]}
              </button>
            ))}
            <Link role="menuitem" className={ITEM_MENU} href={editar}>Editar</Link>
            <div className="my-1 border-t border-borda" role="separator" />
            <button type="button" role="menuitem" className={`${ITEM_MENU} text-ruim`} onClick={abrir("apagar")}>
              Apagar
            </button>
          </>
        );
      }}
    </MenuMais>
  );

  let botoes: ReactNode;
  if (soMenu) {
    botoes = (
      <div className="flex justify-end">
        {menu(vendido ? ["gasto"] : parado ? ["anunciar", "vendi", "gasto"] : ["vendi", "anunciar", "gasto"])}
      </div>
    );
  } else if (compacto) {
    botoes = (
      <div className="flex items-center gap-2">
        {principal && (
          <button type="button" className={`${PEQUENO} flex-1`} onClick={() => setPainel(principal)}>
            {parado ? "Anunciar" : "Vendi"}
          </button>
        )}
        <button type="button" className={`${PEQUENO} flex-1`} onClick={() => setPainel("gasto")}>+ Gasto</button>
        {menu(vendido ? [] : parado ? ["vendi"] : ["anunciar"])}
      </div>
    );
  } else {
    botoes = (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {principal && (
          <button type="button" className="botao-principal sm:min-w-32" onClick={() => setPainel(principal)}>
            {parado ? "Anunciar" : "Vendi"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {!vendido && (
            <button type="button" className={SECUNDARIO} onClick={() => setPainel(parado ? "vendi" : "anunciar")}>
              {parado ? "Vendi" : "Mudar preço"}
            </button>
          )}
          <button type="button" className={SECUNDARIO} onClick={() => setPainel("gasto")}>+ Gasto</button>
          <Link className={SECUNDARIO} href={editar}>Editar</Link>
          {!vendido && (
            <Link className={SECUNDARIO} href={`/assistente?anuncio=${item.id}`} title="Escrever anúncio com o assistente">
              <Icone>{CONVERSA}</Icone>
              Escrever anúncio
            </Link>
          )}
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-3 text-sm font-semibold text-ruim transition-[background-color,scale] duration-150 select-none hover:bg-ruim-fundo active:scale-[0.97] sm:ml-auto md:min-h-10"
          onClick={() => setPainel("apagar")}
        >
          <Icone>{LIXEIRA}</Icone>
          Apagar
        </button>
      </div>
    );
  }

  return (
    <>
      {botoes}
      {painel && (
        <Folha
          sobre={item.nome}
          titulo={painel === "anunciar" && !parado ? "Mudar preço do anúncio" : TITULOS[painel]}
          aoFechar={fechar}
        >
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
