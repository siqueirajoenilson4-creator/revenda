"use client";

import Link from "next/link";
import { useState } from "react";
import type { EstadoConservacao, Publicacao } from "@/lib/anuncios";
import { categoriaMarketplace, condicaoMarketplace, type PedidoRobo } from "@/lib/robo";
import { dataCurta } from "@/lib/visao";
import { FOTO_MAIS, Icone } from "@/components/IconesItem";
import { SeloPublicacao } from "@/components/Selos";
import { BotoesFotos } from "./BotoesFotos";
import { BotaoCopiar } from "./Copiar";
import { FormPublicacao } from "./FormPublicacao";
import { ABRIR_FORA, LAPIS } from "./icones";
import { BotaoRenovei } from "./Renovei";
import { BotaoRobo } from "./Robo";
import { diaSP, linkCurto, precoParaColar, quandoRenovar, type FotoAnuncio } from "./util";

const CRIAR_ANUNCIO = "https://www.facebook.com/marketplace/create/item";

const PASSOS = [
  "Copie o título, a descrição e o preço e pegue as fotos.",
  "Abra o Marketplace, crie o anúncio e cole cada campo.",
  "Publicou? Cole o link do anúncio aqui embaixo e salve.",
];

const GRANDE = "botao-secundario min-h-12 px-3 md:min-h-11";

/** Já publicado: datas, link, lembrete de renovar e troca de link. */
function Publicado({ anuncioId, pub, hoje }: { anuncioId: string; pub: Publicacao; hoje: string }) {
  const [trocando, setTrocando] = useState(false);
  const quando = pub.renovar_em ? quandoRenovar(pub.renovar_em, hoje) : null;
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="sobrescrito">Publicado em</dt>
          <dd className="mt-0.5 font-semibold">{pub.publicado_em ? dataCurta(diaSP(pub.publicado_em), hoje) : "—"}</dd>
        </div>
        <div>
          <dt className="sobrescrito">Renovar</dt>
          <dd className={`mt-0.5 font-semibold ${quando?.vencido ? "text-atencao" : ""}`}>
            {quando ? quando.texto.replace(/^Renovar /, "").replace(/^h/, "H").replace(/^em /, "") : "—"}
          </dd>
        </div>
      </dl>

      {quando?.vencido ? (
        <div className="aparece space-y-2.5 rounded-lg bg-atencao-fundo p-3">
          <p className="text-[14px] font-semibold text-atencao">
            Hora de renovar. No Facebook, abra o anúncio e toque em Renovar; depois confirme aqui.
          </p>
          <div className="flex flex-wrap gap-2">
            <BotaoRenovei id={pub.id} className="botao-secundario flex-1 sm:flex-none" />
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-suave">Renove a cada 7 dias: depois de uma semana o Marketplace empurra o anúncio para baixo.</p>
      )}

      {trocando ? (
        <FormPublicacao
          anuncioId={anuncioId}
          canal="marketplace"
          situacao={pub.situacao}
          link={pub.link}
          botao="Salvar link"
          aoSalvar={() => setTrocando(false)}
          aoCancelar={() => setTrocando(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {pub.link ? (
            <a
              href={pub.link}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-secundario min-w-0 flex-1 justify-start sm:flex-none"
              title={pub.link}
            >
              <Icone>{ABRIR_FORA}</Icone>
              <span className="truncate">{linkCurto(pub.link)}</span>
            </a>
          ) : (
            <span className="text-[13px] text-suave">Sem link salvo.</span>
          )}
          <button type="button" className="botao-pequeno min-h-11 md:min-h-9" onClick={() => setTrocando(true)}>
            <Icone>{LAPIS}</Icone>
            {pub.link ? "Trocar link" : "Colar link"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Facebook assistido: a ferramenta monta e copia; quem publica é ele, no app. */
export function Marketplace({
  anuncioId,
  pub,
  titulo,
  descricao,
  preco,
  estado,
  categoria,
  fotos,
  item,
  hoje,
  alterado,
}: {
  anuncioId: string | null;
  pub: Publicacao | undefined;
  titulo: string;
  descricao: string;
  preco: string;
  estado: EstadoConservacao | "";
  categoria: string;
  fotos: FotoAnuncio[];
  item: { id: string; nome: string };
  hoje: string;
  alterado: boolean;
}) {
  const noAr = pub?.situacao === "publicado";
  const urls = fotos.flatMap((f) => (f.assinada ? [f.assinada] : []));
  const motivoRobo = !anuncioId
    ? "Salve o anúncio primeiro."
    : alterado
      ? "Salve as mudanças antes: o robô publica o anúncio salvo."
      : !titulo.trim() || !precoParaColar(preco)
        ? "Falta o título ou o preço."
        : !urls.length
          ? "O Marketplace pede pelo menos uma foto."
          : undefined;
  const pedido: PedidoRobo | null =
    anuncioId && !motivoRobo
      ? {
          anuncioId,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          preco: precoParaColar(preco),
          condicao: condicaoMarketplace(estado),
          categoria: categoriaMarketplace(categoria, item.nome),
          fotos: urls,
        }
      : null;
  return (
    <section aria-labelledby="publicar-mkt" className="cartao md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="publicar-mkt" className="titulo-secao">
            Publicar no Facebook Marketplace
          </h2>
          <p className="mt-0.5 text-[13px] text-suave">Com o robô (no computador) ou à mão: copie, publique no app e cole o link.</p>
        </div>
        {pub && <SeloPublicacao situacao={pub.situacao} />}
      </div>

      {!noAr && (
        <ol className="mt-3 space-y-1.5 text-[14px]">
          {PASSOS.map((p, i) => (
            <li key={p} className="flex gap-2.5">
              <span className="numero flex size-5 shrink-0 items-center justify-center rounded-full bg-superficie-2 text-[12px] ring-1 ring-borda-forte ring-inset">
                {i + 1}
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <BotaoCopiar rotulo="Copiar título" texto={titulo.trim()} vazio="Escreva o título primeiro." className={GRANDE} />
        <BotaoCopiar rotulo="Copiar descrição" texto={descricao.trim()} vazio="Escreva a descrição primeiro." className={GRANDE} />
        <BotaoCopiar rotulo="Copiar preço" texto={precoParaColar(preco)} vazio="Coloque o preço primeiro." className={GRANDE} />
        {fotos.length ? (
          <BotoesFotos fotos={fotos} nome={item.nome} modo="melhor" className={GRANDE} />
        ) : (
          <Link href={`/estoque/${item.id}`} className={GRANDE}>
            <Icone className="size-[18px]">{FOTO_MAIS}</Icone>
            <span className="truncate">Enviar fotos</span>
          </Link>
        )}
        {!noAr && <BotaoRobo pedido={pedido} motivo={motivoRobo} className="botao-principal min-h-12 w-full md:min-h-11" />}
        <a href={CRIAR_ANUNCIO} target="_blank" rel="noopener noreferrer" className={`${GRANDE} col-span-2`}>
          <Icone className="size-[18px]">{ABRIR_FORA}</Icone>
          Abrir o Marketplace
        </a>
      </div>
      {alterado && (
        <p className="aparece mt-2 text-[13px] font-semibold text-atencao">
          Os botões copiam o que está na tela, que ainda não foi salvo.
        </p>
      )}

      <div className="mt-4 border-t border-borda pt-4">
        {!anuncioId ? (
          <p className="text-sm text-suave">Salve o anúncio para guardar o link da publicação.</p>
        ) : noAr ? (
          <Publicado anuncioId={anuncioId} pub={pub!} hoje={hoje} />
        ) : (
          <FormPublicacao
            anuncioId={anuncioId}
            canal="marketplace"
            situacao="publicado"
            link={pub?.link}
            rotuloLink="Cole o link do anúncio publicado"
            botao="Salvar como publicado"
            principal
          />
        )}
      </div>
    </section>
  );
}
