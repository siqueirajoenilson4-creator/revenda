"use client";

import { useState } from "react";
import {
  CANAIS_ANUNCIO,
  historicoPreco,
  rotuloCanalAnuncio,
  type Anuncio,
  type CanalAnuncio,
} from "@/lib/anuncios";
import { reais } from "@/lib/formato";
import { dataCurta } from "@/lib/visao";
import { SeloPublicacao } from "@/components/Selos";
import { Icone } from "@/components/IconesItem";
import { FotosAnuncio } from "./FotosAnuncio";
import { FormPublicacao } from "./FormPublicacao";
import { Marketplace } from "./Marketplace";
import { TextoAnuncio } from "./TextoAnuncio";
import { ABRIR_FORA } from "./icones";
import { camposDe, linkCurto, mesmoTexto, type CamposAnuncio, type FotoAnuncio, type ItemAnuncio } from "./util";

/** OLX, grupos, WhatsApp e outros: situação e link, à mão. */
function OutrosCanais({ anuncio }: { anuncio: Anuncio | null }) {
  const [novo, setNovo] = useState<CanalAnuncio | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const pubs = (anuncio?.publicacoes ?? []).filter((p) => p.canal !== "marketplace");
  const livres = CANAIS_ANUNCIO.filter((c) => c.id !== "marketplace" && !pubs.some((p) => p.canal === c.id));

  return (
    <section aria-labelledby="outros-canais" className="cartao md:p-5">
      <h2 id="outros-canais" className="titulo-secao">
        Outros canais
      </h2>
      <p className="mt-0.5 mb-3 text-[13px] text-suave">OLX, grupos e WhatsApp: publique, cole o link e acompanhe aqui.</p>
      {!anuncio ? (
        <p className="text-sm text-suave">Salve o anúncio para registrar os canais.</p>
      ) : (
        <div className="space-y-3">
          {pubs.map((p) =>
            editando === p.id ? (
              <div key={p.id} className="rounded-lg border border-borda p-3">
                <p className="mb-2 font-semibold">{rotuloCanalAnuncio(p.canal)}</p>
                <FormPublicacao
                  anuncioId={anuncio.id}
                  canal={p.canal}
                  situacao={p.situacao === "rascunho" ? "rascunho" : "publicado"}
                  link={p.link}
                  escolherSituacao
                  botao="Salvar"
                  aoSalvar={() => setEditando(null)}
                  aoCancelar={() => setEditando(null)}
                />
              </div>
            ) : (
              <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-borda px-3 py-2.5">
                <span className="font-semibold">{rotuloCanalAnuncio(p.canal)}</span>
                <SeloPublicacao situacao={p.situacao} />
                <span className="flex-1" />
                {p.link && (
                  <a href={p.link} target="_blank" rel="noopener noreferrer" className="botao-pequeno max-w-48" title={p.link}>
                    <Icone>{ABRIR_FORA}</Icone>
                    <span className="truncate">{linkCurto(p.link)}</span>
                  </a>
                )}
                <button type="button" className="botao-pequeno" onClick={() => setEditando(p.id)}>
                  Editar
                </button>
              </div>
            ),
          )}

          {novo ? (
            <div className="rounded-lg border border-borda p-3">
              <p className="mb-2 font-semibold">{rotuloCanalAnuncio(novo)}</p>
              <FormPublicacao
                anuncioId={anuncio.id}
                canal={novo}
                situacao="publicado"
                escolherSituacao
                botao="Salvar canal"
                aoSalvar={() => setNovo(null)}
                aoCancelar={() => setNovo(null)}
              />
            </div>
          ) : (
            livres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {livres.map((c) => (
                  <button key={c.id} type="button" className="botao-pequeno" onClick={() => setNovo(c.id)}>
                    + {c.rotulo}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function HistoricoPreco({ anuncio, hoje }: { anuncio: Anuncio | null; hoje: string }) {
  const lista = anuncio ? historicoPreco(anuncio.precos) : [];
  if (lista.length < 2) return null;
  return (
    <section aria-labelledby="historico-preco" className="cartao md:p-5">
      <h2 id="historico-preco" className="titulo-secao mb-2">
        Histórico de preço
      </h2>
      <ul className="divide-y divide-borda text-[15px]">
        {lista.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2">
            <span className="text-suave">{dataCurta(p.data, hoje)}</span>
            <span className="font-semibold">
              {reais(p.preco)}
              {p.diferenca != null && p.diferenca !== 0 && (
                <span className={`ml-2 text-[13px] ${p.diferenca < 0 ? "text-ruim" : "text-bom"}`}>
                  {p.diferenca < 0 ? "−" : "+"}
                  {reais(Math.abs(p.diferenca))}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Tela do anúncio: texto e fotos à esquerda; Marketplace e outros canais à direita. */
export function EditorAnuncio({
  item,
  anuncio,
  fotos,
  hoje,
}: {
  item: ItemAnuncio;
  anuncio: Anuncio | null;
  fotos: FotoAnuncio[];
  hoje: string;
}) {
  const salvos = camposDe(anuncio, item);
  const [campos, setCampos] = useState<CamposAnuncio>(salvos);
  // Depois de salvar, a página volta com o anúncio novo: a tela passa a valer como salva.
  const [base, setBase] = useState(salvos);
  if (!mesmoTexto(base, salvos)) {
    setBase(salvos);
    setCampos(salvos);
  }
  const alterado = !mesmoTexto(campos, salvos);
  const pub = anuncio?.publicacoes.find((p) => p.canal === "marketplace");

  return (
    <div className="escalonado grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="space-y-4">
        <TextoAnuncio item={item} campos={campos} mudar={(p) => setCampos((c) => ({ ...c, ...p }))} alterado={alterado} />
        <section className="cartao md:p-5">
          <FotosAnuncio itemId={item.id} nome={item.nome} fotos={fotos} />
        </section>
      </div>
      <div className="space-y-4">
        <Marketplace
          anuncioId={anuncio?.id ?? null}
          pub={pub}
          titulo={campos.titulo}
          descricao={campos.descricao}
          preco={campos.preco}
          estado={campos.estado}
          categoria={campos.categoria}
          fotos={fotos}
          item={{ id: item.id, nome: item.nome }}
          hoje={hoje}
          alterado={alterado}
        />
        <OutrosCanais anuncio={anuncio} />
        <HistoricoPreco anuncio={anuncio} hoje={hoje} />
      </div>
    </div>
  );
}
