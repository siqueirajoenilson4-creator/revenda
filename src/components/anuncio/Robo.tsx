"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DO_ROBO, DO_SITE, MARCA_ROBO, type MensagemRobo, type MensagemSite, type PedidoRobo } from "@/lib/robo";
import { Girando, Icone } from "@/components/IconesItem";

const ROBO = (
  <>
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <path d="M12 8V4M8 4h8M9 13h.01M15 13h.01M10 17h4" />
  </>
);

/** Versão da extensão instalada neste navegador, ou null. Ela se anuncia no <html>. */
function useRoboInstalado(): string | null {
  return useSyncExternalStore(
    (avisar) => {
      const o = new MutationObserver(avisar);
      o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-robo-revenda"] });
      return () => o.disconnect();
    },
    () => document.documentElement.dataset[MARCA_ROBO] ?? null,
    () => null,
  );
}

/**
 * "Publicar com o robô": manda o anúncio salvo para a extensão, que abre o
 * Marketplace numa aba nova, preenche, sobe as fotos e publica. O andamento
 * aparece aqui; o link volta sozinho (PonteRobo).
 */
export function BotaoRobo({ pedido, motivo, className }: { pedido: PedidoRobo | null; motivo?: string; className: string }) {
  const versao = useRoboInstalado();
  const [andamento, setAndamento] = useState<{ texto: string; erro?: boolean } | null>(null);
  const anuncioId = pedido?.anuncioId;

  useEffect(() => {
    function aoReceber(e: MessageEvent) {
      const m = e.data as MensagemRobo | undefined;
      if (e.source !== window || m?.origem !== DO_ROBO || m.anuncioId !== anuncioId) return;
      if (m.tipo === "andamento") setAndamento({ texto: m.texto, erro: m.erro });
      else setAndamento({ texto: "Publicado! O link foi salvo." });
    }
    window.addEventListener("message", aoReceber);
    return () => window.removeEventListener("message", aoReceber);
  }, [anuncioId]);

  if (!versao) {
    return (
      <div className="col-span-2 space-y-2 rounded-lg bg-superficie-2 p-3">
        <p className="text-[13px] text-suave">
          <strong className="font-semibold text-texto">Robô do Marketplace:</strong> no computador, baixe e abra o instalador.
          Ele põe a extensão no Chrome sozinho; depois recarregue esta página.
        </p>
        <a href="/Instalar-Robo-Revenda.exe" download className="botao-secundario w-full">
          <Icone className="size-[18px]">{ROBO}</Icone>
          Baixar o instalador do robô
        </a>
      </div>
    );
  }

  return (
    <div className="col-span-2 space-y-2">
      <button
        type="button"
        className={className}
        disabled={!pedido}
        title={motivo}
        onClick={() => {
          if (!pedido) return;
          setAndamento({ texto: "Abrindo o Marketplace…" });
          window.postMessage({ origem: DO_SITE, tipo: "publicar", pedido } satisfies MensagemSite, window.location.origin);
        }}
      >
        <Icone className="size-[18px]">{ROBO}</Icone>
        Publicar com o robô
      </button>
      {!pedido && motivo && <p className="text-[13px] text-suave">{motivo}</p>}
      {andamento && (
        <p
          role="status"
          className={`aparece flex items-center gap-2 text-[13px] font-semibold ${andamento.erro ? "text-ruim" : "text-texto"}`}
        >
          {!andamento.erro && !andamento.texto.startsWith("Publicado") && <Girando className="size-3.5" />}
          {andamento.texto}
        </p>
      )}
    </div>
  );
}
