"use client";

import { useActionState, useId, useState } from "react";
import { salvarPublicacao, type Resultado } from "@/app/acoes";
import type { CanalAnuncio, SituacaoPublicacao } from "@/lib/anuncios";
import { Campo, Mensagem } from "@/components/Campos";

const PLACEHOLDER: Partial<Record<CanalAnuncio, string>> = {
  marketplace: "https://www.facebook.com/marketplace/item/…",
  olx: "https://pr.olx.com.br/…",
  grupos: "https://www.facebook.com/groups/…",
};

/**
 * Link e situação de um canal (salvarPublicacao). Aceita o texto inteiro que o
 * app copia ("Veja isto: https://…") e guarda só o endereço.
 */
export function FormPublicacao({
  anuncioId,
  canal,
  situacao,
  link,
  botao,
  rotuloLink = "Link do anúncio",
  escolherSituacao,
  principal,
  aoSalvar,
  aoCancelar,
}: {
  anuncioId: string;
  canal: CanalAnuncio;
  situacao: SituacaoPublicacao;
  link?: string | null;
  botao: string | ((s: SituacaoPublicacao) => string);
  rotuloLink?: string;
  /** Mostra a escolha entre publicado e rascunho (canal novo). */
  escolherSituacao?: boolean;
  principal?: boolean;
  aoSalvar?: () => void;
  aoCancelar?: () => void;
}) {
  const [sit, setSit] = useState(situacao);
  const nome = useId();
  const [estado, acao, salvando] = useActionState(async (anterior: Resultado, f: FormData) => {
    const bruto = String(f.get("link") ?? "").trim();
    f.set("link", bruto.match(/https?:\/\/\S+/i)?.[0] ?? bruto);
    const r = await salvarPublicacao(anterior, f);
    if (r?.ok) aoSalvar?.();
    return r;
  }, undefined);

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="anuncio_id" value={anuncioId} />
      <input type="hidden" name="canal" value={canal} />
      <input type="hidden" name="situacao" value={sit} />
      {escolherSituacao && (
        <fieldset>
          <legend className="rotulo">Situação</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["publicado", "rascunho"] as const).map((s) => (
              <label
                key={s}
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-[15px] font-semibold transition-colors md:min-h-10 ${
                  sit === s ? "border-texto bg-superficie-2" : "border-borda-forte hover:bg-superficie-2"
                }`}
              >
                <input
                  type="radio"
                  name={nome}
                  checked={sit === s}
                  onChange={() => setSit(s)}
                  className="size-4 accent-marca"
                />
                {s === "publicado" ? "Já publiquei" : "Ainda não"}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Campo
        rotulo={rotuloLink}
        name="link"
        type="text"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        defaultValue={link ?? ""}
        placeholder={PLACEHOLDER[canal] ?? "https://…"}
      />
      <Mensagem estado={estado?.erro ? estado : undefined} />
      <div className="flex flex-wrap gap-2">
        <button className={`${principal ? "botao-principal" : "botao-secundario"} flex-1 sm:flex-none`} disabled={salvando}>
          {salvando ? "Salvando…" : typeof botao === "function" ? botao(sit) : botao}
        </button>
        {aoCancelar && (
          <button type="button" className="botao-secundario flex-1 sm:flex-none" onClick={aoCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
