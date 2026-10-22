"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { registrarCompra } from "@/app/acoes";
import { simular, type LinhaConta, type Regras, type ResultadoSimulacao, type Veredito } from "@/lib/calculo";
import { lerNumero, lerReais, paraCampo, reais } from "@/lib/formato";
import { Campo, CampoReais, Mensagem } from "@/components/Campos";
import { Girando, Icone } from "@/components/IconesItem";
import { Numero } from "@/components/Numero";

const CERTO = (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </>
);
const ALERTA = (
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4M12 17h.01" />
  </>
);
const XIS = (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6M9 9l6 6" />
  </>
);
const CARTEIRA = (
  <>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </>
);
const SETA = <path d="m6 9 6 6 6-6" />;

const VEREDITO: Record<Veredito, { texto: string; classe: string; icone: ReactNode }> = {
  bom: { texto: "Bom negócio", classe: "bg-bom-fundo text-bom ring-bom/30", icone: CERTO },
  apertado: { texto: "Apertado", classe: "bg-atencao-fundo text-atencao ring-atencao/30", icone: ALERTA },
  prejuizo: { texto: "Prejuízo", classe: "bg-ruim-fundo text-ruim ring-ruim/30", icone: XIS },
};

const VAZIO = { nome: "", venda: "", trato: "", km: "", outros: "", pedido: "" };
const pct = (n: number) => String(n).replace(".", ",") + "%";

type Props = { regras: Regras; caixa: number; limite: number | null; hoje: string };

export function Calculadora({ regras, caixa, limite, hoje }: Props) {
  const [v, setV] = useState(VAZIO);
  const [verConta, setVerConta] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [estado, acao, enviando] = useActionState(registrarCompra, undefined);
  const botaoComprei = useRef<HTMLButtonElement>(null);
  const id = useId();

  const venda = lerReais(v.venda);
  const s =
    venda && venda > 0
      ? simular(
          {
            venda,
            trato: lerReais(v.trato) ?? 0,
            km: lerNumero(v.km) ?? 0,
            outros: lerReais(v.outros) ?? 0,
            pedido: lerReais(v.pedido),
          },
          regras,
        )
      : null;

  const muda = (k: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  const passaDoLimite = (valor: number | null) => limite != null && valor != null && valor > limite;
  const acima = passaDoLimite(s?.pagueNoMax ?? null);
  const km = lerNumero(v.km) ?? 0;
  const deslocamento = Math.round(km * regras.custo_km);
  const preenchido = Object.values(v).some((x) => x.trim());

  const limpar = () => {
    setV(VAZIO);
    document.getElementById(`${id}-nome`)?.focus();
  };
  const cancelar = () => {
    setComprando(false);
    requestAnimationFrame(() => botaoComprei.current?.focus());
  };

  return (
    <div className="escalonado grid gap-4 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-6">
      {/* Campos da simulação */}
      <section aria-labelledby={`${id}-dados`} className="cartao @container p-0">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 md:px-5 md:pt-5">
          <h2 id={`${id}-dados`} className="titulo-secao">
            Dados da compra
          </h2>
          <button
            type="button"
            onClick={limpar}
            className={`botao-pequeno -my-1 max-md:min-h-11 ${preenchido ? "" : "invisible"}`}
          >
            Limpar
          </button>
        </div>

        <div className="divide-y divide-borda">
          <Grupo titulo="O item">
            <div className="grid gap-3 @md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @md:gap-4">
              <Campo
                id={`${id}-nome`}
                rotulo="O que é"
                value={v.nome}
                onChange={muda("nome")}
                placeholder="Ex.: Geladeira Brastemp 375 L"
              />
              <CampoReais
                rotulo="Vende por"
                value={v.venda}
                onChange={muda("venda")}
                dica="Preço de anúncio, antes da pechincha."
              />
            </div>
          </Grupo>

          <Grupo titulo="Custos até vender">
            <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @md:gap-4">
              <CampoReais rotulo="Trato/peças" value={v.trato} onChange={muda("trato")} />
              <Campo
                rotulo="Km ida e volta"
                value={v.km}
                onChange={muda("km")}
                inputMode="decimal"
                placeholder="0"
                sufixo="km"
                dica={km > 0 ? `${reais(deslocamento)} de deslocamento` : `${reais(regras.custo_km)} por km`}
              />
              <CampoReais
                rotulo="Outros gastos"
                value={v.outros}
                onChange={muda("outros")}
                className="col-span-2 @lg:col-span-1"
              />
            </div>
          </Grupo>

          <Grupo titulo="Negociação">
            <div className="grid gap-3 @md:grid-cols-2 @md:gap-4">
              <CampoReais
                rotulo="Vendedor pede"
                value={v.pedido}
                onChange={muda("pedido")}
                placeholder="opcional"
                dica="Diz se o preço dele fecha a conta."
              />
            </div>
          </Grupo>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-b-xl border-t border-borda bg-superficie-2 px-4 py-2.5 text-[13px] text-suave md:px-5">
          <span>
            Margem mín. {pct(regras.margem_min_pct)} · lucro mín. {reais(regras.lucro_min, true)} · pechincha{" "}
            {pct(regras.pechincha_pct)}
            {regras.taxa_pct > 0 && ` · taxa ${pct(regras.taxa_pct)}`}
          </span>
          <Link href="/regras" prefetch className="link -my-3 ml-auto inline-flex min-h-11 items-center">
            Ajustar regras
          </Link>
        </p>
      </section>

      {/* Resultado: fica à vista enquanto preenche, no computador */}
      <div className="space-y-3 lg:sticky lg:top-7">
        <section
          aria-labelledby={`${id}-resultado`}
          className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-(--sombra)"
        >
          <div className="bg-lateral px-4 py-4 text-white md:px-5 md:py-5">
            <h2 id={`${id}-resultado`} className="sobrescrito text-lateral-fraco">
              Pague no máximo
            </h2>
            <div key={!s ? "vazio" : s.pagueNoMax == null ? "nao" : "valor"} className="aparece">
              {!s ? (
                <>
                  <p className="numero mt-1 text-[52px] leading-none text-lateral-fraco md:text-[60px]">R$ —</p>
                  <p className="mt-2 text-[13px] text-lateral-texto">
                    Preencha por quanto você vende para ver quanto pode pagar.
                  </p>
                </>
              ) : s.pagueNoMax == null ? (
                <>
                  <p className="numero mt-1 text-[44px] leading-none md:text-[52px]">Não compensa</p>
                  <p className="mt-2 text-[13px] text-lateral-texto">
                    Com esse preço de venda e esses custos não sobra o lucro que as regras pedem.
                  </p>
                </>
              ) : (
                <>
                  <Numero
                    texto={reais(s.pagueNoMax, true)}
                    className="numero mt-1 block text-[52px] leading-none md:text-[60px]"
                  />
                  <p className="mt-2 text-[13px] text-lateral-texto">
                    Já com pechincha, custos e sua margem. Arredondado para baixo, de R$ 10 em R$ 10.
                  </p>
                </>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-borda border-b border-borda">
            <div className="min-w-0 px-4 py-3 md:px-5">
              <dt className="sobrescrito truncate">Você recebe</dt>
              <dd className="mt-0.5 truncate font-semibold">{s ? reais(s.recebe, true) : "—"}</dd>
            </div>
            <div className="min-w-0 px-4 py-3 md:px-5">
              <dt className="sobrescrito truncate">Custos até vender</dt>
              <dd className="mt-0.5 truncate font-semibold">{s ? reais(s.custos, true) : "—"}</dd>
            </div>
          </dl>

          <div
            className={`flex gap-3 px-4 py-3.5 transition-colors duration-300 md:px-5 ${
              limite == null ? "bg-ruim-fundo" : acima ? "bg-atencao-fundo" : ""
            }`}
          >
            <Icone
              className={`mt-0.5 size-[18px] transition-colors duration-300 ${
                limite == null ? "text-ruim" : acima ? "text-atencao" : "text-suave"
              }`}
            >
              {CARTEIRA}
            </Icone>
            <div className="min-w-0 flex-1 text-sm">
              <p className={`sobrescrito ${limite == null ? "text-ruim" : acima ? "text-atencao" : ""}`}>
                Limite do caixa
              </p>
              {limite == null ? (
                <p className="mt-0.5 font-semibold text-ruim">Caixa zerado: venda a moto antes de comprar.</p>
              ) : (
                <>
                  <p className="mt-0.5">
                    Não passe de <strong className="font-bold">{reais(limite, true)}</strong> num item só.
                  </p>
                  {acima ? (
                    <p className="aparece mt-0.5 text-[13px] font-semibold text-atencao">
                      Acima do limite do caixa para um item só.
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[13px] text-suave">Caixa livre agora: {reais(caixa)}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {s?.pedido && <FaixaVeredito pedido={s.pedido} pagueNoMax={s.pagueNoMax} />}

        {s && (
          <div className="aparece overflow-hidden rounded-xl border border-borda bg-superficie shadow-(--sombra)">
            {/* Contorno de foco para dentro: a caixa corta o que passa da borda. */}
            <button
              type="button"
              aria-expanded={verConta}
              aria-controls={`${id}-conta`}
              onClick={() => setVerConta((x) => !x)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-[15px] font-semibold transition-colors duration-150 hover:bg-superficie-2 focus-visible:-outline-offset-2! md:px-5"
            >
              {verConta ? "Esconder a conta" : "Ver a conta"}
              <Icone
                className={`size-[18px] text-suave transition-transform duration-300 ease-saida ${verConta ? "rotate-180" : ""}`}
              >
                {SETA}
              </Icone>
            </button>
            <div
              id={`${id}-conta`}
              inert={!verConta}
              className={`grid transition-[grid-template-rows] duration-300 ease-saida ${
                verConta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <dl className="divide-y divide-borda border-t border-borda text-sm">
                  {s.conta.map((l, i) => (
                    <LinhaDaConta key={i} linha={l} />
                  ))}
                </dl>
              </div>
            </div>
          </div>
        )}

        {!comprando ? (
          <button ref={botaoComprei} type="button" className="botao-principal w-full" onClick={() => setComprando(true)}>
            Comprei, registrar no estoque
          </button>
        ) : (
          <form action={acao} aria-labelledby={`${id}-registro`} className="cartao entra overflow-hidden p-0">
            <div className="px-4 pt-4 md:px-5 md:pt-5">
              <p className="sobrescrito">Vai para o pátio</p>
              <h2 id={`${id}-registro`} className="titulo-secao">
                Registrar compra
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 md:p-5">
              <Campo
                rotulo="O que é"
                name="nome"
                defaultValue={v.nome}
                required
                autoFocus={!v.nome}
                className="col-span-2"
              />
              <CampoReais
                rotulo="Paguei"
                name="pago"
                defaultValue={paraCampo(s?.pedido?.valor ?? s?.pagueNoMax ?? null)}
                required
                autoFocus={!!v.nome}
              />
              <Campo rotulo="Data" name="compra_data" type="date" defaultValue={hoje} />
              <CampoReais rotulo="Vou anunciar por" name="preco_alvo" defaultValue={paraCampo(venda)} />
              <Campo rotulo="Onde comprei" name="compra_local" placeholder="Cidade/bairro" />
              <input type="hidden" name="km" value={v.km} />
              {km > 0 && (
                <p className="col-span-2 text-[13px] text-suave">
                  O deslocamento ({v.km} km = {reais(deslocamento)}) entra como gasto do item.
                </p>
              )}
            </div>
            {(estado?.erro || estado?.ok) && (
              <div className="px-4 pb-4 md:px-5">
                <Mensagem estado={estado} />
              </div>
            )}
            <div className="flex gap-2 border-t border-borda bg-superficie-2 px-4 py-3 md:px-5">
              <button type="button" className="botao-secundario" onClick={cancelar}>
                Cancelar
              </button>
              <button className="botao-principal flex-1" disabled={enviando}>
                {enviando ? (
                  <>
                    <Girando className="size-4 motion-reduce:animate-none" />
                    Salvando…
                  </>
                ) : (
                  "Registrar"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// O espaçamento fica fora do fieldset: a legenda de um fieldset com padding vai parar na borda.
function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="px-4 py-4 md:px-5">
      <fieldset className="min-w-0">
        <legend className="sobrescrito">{titulo}</legend>
        <div className="mt-2.5">{children}</div>
      </fieldset>
    </div>
  );
}

/** Faixa do veredito quando o vendedor já disse quanto quer. */
function FaixaVeredito({
  pedido,
  pagueNoMax,
}: {
  pedido: NonNullable<ResultadoSimulacao["pedido"]>;
  pagueNoMax: number | null;
}) {
  const vd = VEREDITO[pedido.veredito];
  const negativo = pedido.lucroEsperado < 0;
  return (
    <section
      aria-label="Preço que o vendedor pede"
      className={`entra rounded-xl p-4 ring-1 ring-inset transition-colors duration-300 md:px-5 ${vd.classe}`}
    >
      <div className="flex items-end justify-between gap-4">
        <p className="flex min-w-0 items-center gap-2" aria-live="polite">
          <Icone className="size-5 md:size-6">{vd.icone}</Icone>
          <span className="font-display text-[24px] leading-none font-bold md:text-[28px]">{vd.texto}</span>
        </p>
        <div className="shrink-0 text-right">
          <p className="sobrescrito text-current">Lucro esperado</p>
          {/* Ao trocar de sinal recomeça do zero: a contagem não troca o sinal no meio. */}
          <Numero
            key={negativo ? "-" : "+"}
            texto={reais(pedido.lucroEsperado, true)}
            className="numero mt-0.5 block text-[26px] leading-none md:text-[30px]"
          />
        </div>
      </div>
      <p className="mt-2 text-[13px] font-medium">
        Pagando {reais(pedido.valor, true)} · lucro alvo {reais(pedido.lucroAlvo, true)}
      </p>
      {pedido.veredito !== "bom" && (pagueNoMax == null || pagueNoMax < pedido.valor) && (
        <p className="mt-3 border-t border-current/20 pt-3 text-[13px] font-semibold">
          {pagueNoMax != null
            ? `Contraproposta: ofereça até ${reais(pagueNoMax, true)}.`
            : "Não fecha a conta em nenhum preço."}
        </p>
      )}
    </section>
  );
}

/** Linha da conta: sinal à esquerda, valor alinhado à direita; as linhas "=" são subtotais. */
function LinhaDaConta({ linha }: { linha: LinhaConta }) {
  const sinal = linha.rotulo[0] === "=" || linha.rotulo[0] === "−" ? linha.rotulo[0] : "";
  const texto = sinal ? linha.rotulo.slice(1).trim() : linha.rotulo;
  const total = sinal === "=";
  // Nas linhas "−" o sinal já está na coluna da esquerda (e evita o "-R$ 0,00" da pechincha zero).
  const valor = sinal === "−" ? Math.abs(linha.valor) : linha.valor;
  return (
    <div className={`flex items-baseline gap-3 px-4 py-2 md:px-5 ${total ? "bg-superficie-2 font-semibold" : ""}`}>
      <dt className="flex min-w-0 flex-1 gap-2">
        <span className="w-3 shrink-0 text-center text-suave" aria-hidden>
          {sinal}
        </span>
        <span className="min-w-0">
          {texto}
          {linha.detalhe && <span className="block text-xs font-normal text-suave">{linha.detalhe}</span>}
        </span>
      </dt>
      <dd className="shrink-0 text-right tabular-nums">
        {sinal === "−" && <span className="sr-only">menos </span>}
        {reais(valor)}
      </dd>
    </div>
  );
}
