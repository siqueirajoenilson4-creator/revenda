"use client";

import { useRef, useState, useTransition } from "react";
import { apagarFoto, registrarFoto, tornarCapa } from "@/app/acoes";
import { supabaseNavegador } from "@/lib/supabase/client";
import { BUCKET_FOTOS } from "@/lib/supabase/config";
import { ESTRELA, FOTO_MAIS, Girando, Icone, LIXEIRA } from "./IconesItem";

const LADO_MAX = 1600;

/** Reduz a foto no próprio celular antes de enviar (economiza dados e espaço). */
async function comprimir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Não deu para ler a foto."))), "image/jpeg", 0.82),
  );
}

type FotoTela = { id: string; assinada?: string };

// Botão de 36px sobre a foto, com área de toque de 44px.
const BOTAO_FOTO =
  "absolute top-1.5 flex size-9 items-center justify-center rounded-md bg-lateral/75 text-white backdrop-blur-sm transition-[background-color,scale] duration-150 after:absolute after:-inset-1 hover:bg-lateral active:scale-[0.94] disabled:opacity-60";

export function Fotos({ itemId, userId, fotos, nome }: { itemId: string; userId: string; fotos: FotoTela[]; nome: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro(null);
    const supabase = supabaseNavegador();
    const lista = Array.from(arquivos);
    for (const [n, arquivo] of lista.entries()) {
      setEnviando(lista.length > 1 ? `Enviando ${n + 1} de ${lista.length}…` : "Enviando…");
      try {
        const blob = await comprimir(arquivo);
        const caminho = `${userId}/${itemId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        const r = await registrarFoto(itemId, caminho);
        if (r?.erro) throw new Error(r.erro);
      } catch (e) {
        setErro(`Falhou a foto ${arquivo.name}: ${e instanceof Error ? e.message : "erro"}`);
        break;
      }
    }
    setEnviando(null);
    if (entrada.current) entrada.current.value = "";
  }

  const executar = (acao: () => Promise<{ erro?: string } | undefined>) =>
    iniciar(async () => {
      setErro(null);
      const r = await acao();
      if (r?.erro) setErro(r.erro);
    });

  const escolher = () => entrada.current?.click();
  const progresso = (
    <span aria-live="polite" className="block">
      {enviando ?? "Adicionar fotos"}
    </span>
  );

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="titulo-secao">Fotos</h2>
        <span className="text-[13px] text-suave">
          {fotos.length
            ? `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"} · a primeira é a capa`
            : "a primeira vira capa"}
        </span>
      </div>

      {fotos.length === 0 ? (
        <button
          type="button"
          onClick={escolher}
          disabled={!!enviando}
          className="flex min-h-36 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-borda-forte px-4 py-6 text-[15px] font-semibold text-suave transition-colors hover:border-suave hover:bg-superficie-2 hover:text-texto disabled:cursor-wait"
        >
          {enviando ? <Girando className="size-6" /> : <Icone className="size-6">{FOTO_MAIS}</Icone>}
          {progresso}
          {!enviando && <span className="text-[13px] font-normal">Tire na hora ou escolha da galeria.</span>}
        </button>
      ) : (
        <ul
          aria-busy={pendente}
          className={`escalonado grid grid-cols-3 gap-2 transition-opacity md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 ${pendente ? "opacity-60" : ""}`}
        >
          {fotos.map((f, i) => (
            <li
              key={f.id}
              className={`relative aspect-square overflow-hidden rounded-lg border border-borda bg-superficie-2 ${
                i === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.assinada} alt={`${nome}, foto ${i + 1}`} className="absolute inset-0 size-full object-cover" />
              {i === 0 ? (
                <span className="absolute top-2 left-2 rounded-md bg-lateral px-1.5 py-0.5 text-[11px] font-bold tracking-[0.04em] text-white uppercase">
                  Capa
                </span>
              ) : (
                <button
                  type="button"
                  disabled={pendente}
                  aria-label={`Usar a foto ${i + 1} como capa`}
                  title="Usar como capa"
                  className={`${BOTAO_FOTO} left-1.5`}
                  onClick={() => executar(() => tornarCapa(f.id))}
                >
                  <Icone>{ESTRELA}</Icone>
                </button>
              )}
              <button
                type="button"
                aria-label={`Apagar a foto ${i + 1}`}
                title="Apagar foto"
                className={`${BOTAO_FOTO} right-1.5`}
                onClick={() => setApagando(f.id)}
              >
                <Icone>{LIXEIRA}</Icone>
              </button>
              {apagando === f.id && (
                <div className="aparece absolute inset-0 flex flex-col items-center justify-center gap-2 bg-lateral/85 p-2">
                  <span className="text-sm font-semibold text-white">Apagar foto?</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={pendente}
                      className="min-h-10 min-w-11 rounded-md bg-ruim px-2.5 text-[13px] font-bold text-white transition-[filter] hover:brightness-110"
                      onClick={() =>
                        executar(async () => {
                          const r = await apagarFoto(f.id);
                          setApagando(null);
                          return r;
                        })
                      }
                    >
                      {pendente ? "…" : "Sim"}
                    </button>
                    <button
                      type="button"
                      className="min-h-10 min-w-11 rounded-md bg-superficie px-2.5 text-[13px] font-semibold text-texto"
                      onClick={() => setApagando(null)}
                    >
                      Não
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          <li className="aspect-square">
            <button
              type="button"
              onClick={escolher}
              disabled={!!enviando}
              className="flex size-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-borda-forte p-2 text-center text-[13px] font-semibold text-suave transition-colors hover:border-suave hover:bg-superficie-2 hover:text-texto disabled:cursor-wait"
            >
              {enviando ? <Girando className="size-5" /> : <Icone className="size-5">{FOTO_MAIS}</Icone>}
              {progresso}
            </button>
          </li>
        </ul>
      )}
      <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(e) => enviar(e.target.files)} />
      {erro && (
        <p role="alert" className="mt-2 text-sm text-ruim">
          {erro}
        </p>
      )}
    </div>
  );
}
