"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { salvarPublicacao } from "@/app/acoes";
import { DO_ROBO, DO_SITE, type MensagemRobo, type MensagemSite } from "@/lib/robo";

/**
 * Recebe da extensão do robô o anúncio que ele publicou no Marketplace e grava
 * como publicado. Fica no layout: o aviso chega em qualquer tela do sistema,
 * e a extensão guarda o recado até alguma tela confirmar ("recebido").
 */
export function PonteRobo() {
  const router = useRouter();
  useEffect(() => {
    async function aoReceber(e: MessageEvent) {
      const m = e.data as MensagemRobo | undefined;
      if (e.source !== window || m?.origem !== DO_ROBO || m.tipo !== "publicado") return;
      const f = new FormData();
      f.set("anuncio_id", m.anuncioId);
      f.set("canal", "marketplace");
      f.set("situacao", "publicado");
      if (m.link) f.set("link", m.link);
      const r = await salvarPublicacao(undefined, f);
      if (r?.erro) return; // fica guardado na extensão e tenta de novo na próxima tela
      window.postMessage({ origem: DO_SITE, tipo: "recebido", id: m.id } satisfies MensagemSite, window.location.origin);
      router.refresh();
    }
    window.addEventListener("message", aoReceber);
    return () => window.removeEventListener("message", aoReceber);
  }, [router]);
  return null;
}
