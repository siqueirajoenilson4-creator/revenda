"use client";

import { useRef, useState, useTransition } from "react";
import { apagarFoto, registrarFoto, tornarCapa } from "@/app/acoes";
import { supabaseNavegador } from "@/lib/supabase/client";
import { BUCKET_FOTOS } from "@/lib/supabase/config";

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
      setEnviando(`Enviando ${n + 1} de ${lista.length}…`);
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

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {fotos.map((f, i) => (
          <div key={f.id} className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.assinada} alt={`${nome}, foto ${i + 1}`} className="size-32 rounded-xl object-cover md:size-40" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white">Capa</span>
            )}
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
              {i > 0 ? (
                <button
                  type="button"
                  disabled={pendente}
                  className="rounded-md bg-black/60 px-2 py-1 text-xs text-white"
                  onClick={() => iniciar(async () => void (await tornarCapa(f.id)))}
                >
                  Usar de capa
                </button>
              ) : <span />}
              {apagando === f.id ? (
                <button
                  type="button"
                  disabled={pendente}
                  className="rounded-md bg-ruim px-2 py-1 text-xs font-semibold text-white"
                  onClick={() => iniciar(async () => { await apagarFoto(f.id); setApagando(null); })}
                >
                  Apagar?
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-md bg-black/60 px-2 py-1 text-xs text-white"
                  onClick={() => setApagando(f.id)}
                  aria-label="Apagar foto"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={!!enviando}
          className="flex size-32 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-borda text-sm text-suave hover:border-marca hover:text-marca md:size-40"
        >
          <span className="text-2xl">+</span>
          {enviando ?? "Adicionar fotos"}
        </button>
      </div>
      <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(e) => enviar(e.target.files)} />
      {erro && <p className="mt-1 text-sm text-ruim">{erro}</p>}
    </div>
  );
}
