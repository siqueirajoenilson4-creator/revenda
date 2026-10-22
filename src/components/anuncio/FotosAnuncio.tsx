"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, type PointerEvent } from "react";
import { reordenarFotos } from "@/app/acoes";
import { FOTO_MAIS, Icone } from "@/components/IconesItem";
import { BotoesFotos } from "./BotoesFotos";
import { ALCA, ANTES, DEPOIS } from "./icones";
import { plural, type FotoAnuncio } from "./util";

function mover<T>(lista: T[], de: number, para: number): T[] {
  const nova = [...lista];
  const [x] = nova.splice(de, 1);
  nova.splice(para, 0, x);
  return nova;
}

const ids = (l: FotoAnuncio[]) => l.map((f) => f.id).join();

const SETA =
  "flex min-h-11 items-center justify-center text-suave transition-colors hover:bg-superficie-2 hover:text-texto disabled:pointer-events-none disabled:opacity-30";

/**
 * Ordem das fotos do anúncio (a primeira é a capa). Arrasta pela alça (no
 * computador, pela foto toda) ou usa as setas. Salva na hora; se falhar, volta.
 */
export function FotosAnuncio({ itemId, nome, fotos }: { itemId: string; nome: string; fotos: FotoAnuncio[] }) {
  const [ordem, mudarOrdem] = useOptimistic(fotos, (_: FotoAnuncio[], nova: FotoAnuncio[]) => nova);
  const [arrasto, setArrasto] = useState<{ id: string; lista: FotoAnuncio[]; antes: string } | null>(null);
  const [aviso, setAviso] = useState<{ erro?: string; ok?: string } | null>(null);
  const [salvando, iniciar] = useTransition();
  const lista = arrasto?.lista ?? ordem;

  function salvar(nova: FotoAnuncio[], texto: string) {
    setAviso(null);
    iniciar(async () => {
      mudarOrdem(nova);
      const r = await reordenarFotos(itemId, nova.map((f) => f.id));
      setAviso(r?.erro ? { erro: `${r.erro} A ordem voltou ao que era.` } : { ok: texto });
    });
  }

  function comecar(e: PointerEvent<HTMLUListElement>) {
    const alvo = e.target as HTMLElement;
    const foto = alvo.closest<HTMLElement>("[data-foto]");
    const pelaAlca = alvo.closest("[data-alca]");
    if (!foto || e.button !== 0 || salvando) return;
    // No toque, só a alça arrasta (o resto da foto continua rolando a página).
    if (!pelaAlca && (e.pointerType !== "mouse" || alvo.closest("button"))) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrasto({ id: foto.dataset.foto!, lista: ordem, antes: ids(ordem) });
  }

  function arrastar(e: PointerEvent<HTMLUListElement>) {
    if (!arrasto) return;
    const sob = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-foto]")?.dataset.foto;
    if (!sob || sob === arrasto.id) return;
    const de = arrasto.lista.findIndex((f) => f.id === arrasto.id);
    const para = arrasto.lista.findIndex((f) => f.id === sob);
    if (de < 0 || para < 0) return;
    setArrasto({ ...arrasto, lista: mover(arrasto.lista, de, para) });
  }

  function soltar() {
    if (!arrasto) return;
    setArrasto(null);
    if (ids(arrasto.lista) !== arrasto.antes) {
      const n = arrasto.lista.findIndex((f) => f.id === arrasto.id) + 1;
      salvar(arrasto.lista, n === 1 ? "Nova capa salva." : `Foto movida para a posição ${n}.`);
    }
  }

  function setinha(i: number, para: number) {
    salvar(mover(lista, i, para), para === 0 ? "Nova capa salva." : `Foto movida para a posição ${para + 1}.`);
  }

  return (
    <section aria-labelledby="fotos-anuncio" className="cartao md:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 id="fotos-anuncio" className="titulo-secao">
          Fotos
        </h2>
        <span className="text-[13px] text-suave">
          {fotos.length ? `${plural(fotos.length, "foto", "fotos")} · a primeira é a capa` : "a primeira vira capa"}
        </span>
      </div>

      {fotos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border-2 border-dashed border-borda-forte p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Nenhuma foto ainda</p>
            <p className="mt-0.5 text-sm text-suave">Envie as fotos no item; elas aparecem aqui na ordem do anúncio.</p>
          </div>
          <Link href={`/estoque/${itemId}`} className="botao-secundario shrink-0">
            <Icone>{FOTO_MAIS}</Icone>
            Enviar fotos
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-suave">
            Arraste pela alça <Icone className="inline size-3.5 align-[-2px]">{ALCA}</Icone> ou use as setas. A ordem salva sozinha.
          </p>
          <ul
            onPointerDown={comecar}
            onPointerMove={arrastar}
            onPointerUp={soltar}
            onPointerCancel={() => setArrasto(null)}
            aria-busy={salvando}
            className="grid grid-cols-2 gap-2 select-none sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3"
          >
            {lista.map((f, i) => {
              const arrastando = arrasto?.id === f.id;
              return (
                <li
                  key={f.id}
                  data-foto={f.id}
                  className={`relative overflow-hidden rounded-lg border bg-superficie transition-[scale,box-shadow,border-color] duration-150 ${
                    arrastando ? "z-10 scale-[1.03] border-grafico shadow-(--sombra-alta)" : "border-borda"
                  } ${arrasto ? "" : "md:cursor-grab"}`}
                >
                  <div className="relative aspect-square bg-superficie-2">
                    {f.assinada && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.assinada}
                        alt={`${nome}, foto ${i + 1}`}
                        draggable={false}
                        className="pointer-events-none absolute inset-0 size-full object-cover"
                      />
                    )}
                    <span
                      className={`absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase ${
                        i === 0 ? "bg-marca text-marca-texto" : "bg-lateral/80 text-white"
                      }`}
                    >
                      {i === 0 ? "Capa" : i + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 border-t border-borda">
                    <button
                      type="button"
                      className={SETA}
                      disabled={i === 0 || salvando}
                      onClick={() => setinha(i, i - 1)}
                      aria-label={i === 1 ? `Usar a foto ${i + 1} como capa` : `Mover a foto ${i + 1} para a posição ${i}`}
                    >
                      <Icone>{ANTES}</Icone>
                    </button>
                    <span
                      data-alca
                      title="Arraste para mudar a ordem"
                      className={`flex min-h-11 touch-none items-center justify-center text-suave ${
                        arrastando ? "cursor-grabbing text-texto" : "cursor-grab"
                      }`}
                    >
                      <Icone>{ALCA}</Icone>
                    </span>
                    <button
                      type="button"
                      className={SETA}
                      disabled={i === lista.length - 1 || salvando}
                      onClick={() => setinha(i, i + 1)}
                      aria-label={`Mover a foto ${i + 1} para a posição ${i + 2}`}
                    >
                      <Icone>{DEPOIS}</Icone>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <p
            role={aviso?.erro ? "alert" : "status"}
            className={`mt-2 min-h-5 text-[13px] ${aviso?.erro ? "font-semibold text-ruim" : "text-suave"}`}
          >
            {salvando ? "Salvando a ordem…" : (aviso?.erro ?? aviso?.ok ?? "")}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            <BotoesFotos fotos={ordem} nome={nome} />
          </div>
        </>
      )}
    </section>
  );
}
