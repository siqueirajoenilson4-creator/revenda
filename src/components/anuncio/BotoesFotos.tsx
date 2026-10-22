"use client";

import { useState, useSyncExternalStore } from "react";
import { Girando, Icone } from "@/components/IconesItem";
import { BAIXAR, COMPARTILHAR } from "./icones";
import { nomeArquivo, type FotoAnuncio } from "./util";

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function buscarArquivos(fotos: FotoAnuncio[], nome: string, aoAvancar: (n: number) => void): Promise<File[]> {
  const arquivos: File[] = [];
  for (const [i, f] of fotos.entries()) {
    aoAvancar(i + 1);
    if (!f.assinada) throw new Error("sem link");
    const r = await fetch(f.assinada);
    if (!r.ok) throw new Error(String(r.status));
    const blob = await r.blob();
    arquivos.push(new File([blob], nomeArquivo(nome, i + 1), { type: blob.type || "image/jpeg" }));
  }
  return arquivos;
}

function baixar(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Compartilhar arquivos só vale no celular (salva na galeria e abre no Facebook).
let podeCache: boolean | undefined;
function detectarCompartilhar(): boolean {
  if (podeCache === undefined) {
    try {
      podeCache =
        window.matchMedia("(pointer: coarse)").matches &&
        typeof navigator.share === "function" &&
        !!navigator.canShare?.({ files: [new File([""], "foto.jpg", { type: "image/jpeg" })] });
    } catch {
      podeCache = false;
    }
  }
  return podeCache;
}
const semAssinatura = () => () => {};

export function usePodeCompartilhar(): boolean {
  return useSyncExternalStore(semAssinatura, detectarCompartilhar, () => false);
}

const ERRO_BUSCA = "Não deu para pegar as fotos. Recarregue a tela e tente de novo.";

/**
 * "Baixar fotos" (um arquivo por foto, na ordem) e "Compartilhar fotos" (folha do
 * celular, para salvar na galeria). `modo`: os dois, ou só o melhor para o aparelho.
 */
export function BotoesFotos({
  fotos,
  nome,
  modo = "ambos",
  className = "botao-secundario",
}: {
  fotos: FotoAnuncio[];
  nome: string;
  modo?: "ambos" | "melhor";
  className?: string;
}) {
  const podeCompartilhar = usePodeCompartilhar();
  const [status, setStatus] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<"baixar" | "compartilhar" | null>(null);
  // Fotos já baixadas para compartilhar (o Safari exige um toque logo antes de abrir a folha).
  const [prontas, setProntas] = useState<{ chave: string; arquivos: File[] } | null>(null);
  const chave = fotos.map((f) => f.id + (f.assinada ?? "")).join("|");
  const total = fotos.length;

  async function pegar(): Promise<File[] | null> {
    if (prontas?.chave === chave) return prontas.arquivos;
    try {
      const arquivos = await buscarArquivos(fotos, nome, (n) =>
        setStatus(total > 1 ? `Preparando ${n} de ${total}…` : "Preparando…"),
      );
      setProntas({ chave, arquivos });
      return arquivos;
    } catch {
      setErro(ERRO_BUSCA);
      return null;
    }
  }

  async function aoBaixar() {
    setErro(null);
    setOcupado("baixar");
    const arquivos = await pegar();
    if (arquivos) {
      for (const [i, a] of arquivos.entries()) {
        setStatus(total > 1 ? `Baixando ${i + 1} de ${total}…` : "Baixando…");
        baixar(a);
        await esperar(350); // o navegador bloqueia vários downloads de uma vez
      }
      setStatus(total > 1 ? `${total} fotos baixadas, na ordem do anúncio.` : "Foto baixada.");
    } else setStatus(null);
    setOcupado(null);
  }

  async function aoCompartilhar() {
    setErro(null);
    setOcupado("compartilhar");
    const arquivos = await pegar();
    setOcupado(null);
    if (!arquivos) return setStatus(null);
    try {
      await navigator.share({ files: arquivos, title: nome });
      setStatus(null);
    } catch (e) {
      const nomeErro = e instanceof Error ? e.name : "";
      if (nomeErro === "AbortError") setStatus(null);
      else if (nomeErro === "NotAllowedError") setStatus("Fotos prontas. Toque de novo em Compartilhar.");
      else {
        setStatus(null);
        setErro("Não deu para compartilhar. Use Baixar fotos.");
      }
    }
  }

  if (!total) return null;
  const mostrarBaixar = modo === "ambos" || !podeCompartilhar;
  const mostrarCompartilhar = podeCompartilhar;
  const retorno = (erro || status) && (
    <p
      role={erro ? "alert" : "status"}
      className={`aparece col-span-full basis-full text-[13px] ${erro ? "font-semibold text-ruim" : "text-suave"}`}
    >
      {erro ?? status}
    </p>
  );

  return (
    <>
      {mostrarCompartilhar && (
        <button type="button" className={className} onClick={aoCompartilhar} disabled={!!ocupado}>
          {ocupado === "compartilhar" ? <Girando className="size-[18px]" /> : <Icone className="size-[18px]">{COMPARTILHAR}</Icone>}
          <span className="truncate">Compartilhar fotos</span>
        </button>
      )}
      {mostrarBaixar && (
        <button type="button" className={className} onClick={aoBaixar} disabled={!!ocupado}>
          {ocupado === "baixar" ? (
            <Girando className="size-[18px]" />
          ) : (
            <Icone className="size-[18px]">{BAIXAR}</Icone>
          )}
          <span className="truncate">Baixar fotos</span>
        </button>
      )}
      {retorno}
    </>
  );
}
