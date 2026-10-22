"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { importar, salvarRegras, type Resultado } from "@/app/acoes";
import { limitePorItem, simular, type Regras } from "@/lib/calculo";
import { lerNumero, lerReais, paraCampo, reais } from "@/lib/formato";
import { Campo, CampoReais, Mensagem } from "@/components/Campos";
import { Girando, Icone } from "@/components/IconesItem";

const pct = (n: number) => String(n).replace(".", ",");

const ARQUIVO = (
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
  </>
);
const ENVIAR = <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const SETA = <path d="m9 18 6-6-6-6" />;

/** O que está digitado agora, com a mesma validação de salvarRegras; campo inválido fica com o valor salvo. */
function lerRascunho(form: HTMLFormElement, salvas: Regras): Regras {
  const f = new FormData(form);
  const novas = { ...salvas };
  for (const k of Object.keys(salvas) as (keyof Regras)[]) {
    const bruto = String(f.get(k) ?? "");
    const ePct = k.endsWith("_pct");
    const v = ePct ? lerNumero(bruto) : lerReais(bruto);
    if (v == null || (ePct && v > 100) || (k !== "saldo_inicial" && v < 0)) continue;
    novas[k] = v;
  }
  return novas;
}

const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold">{children}</strong>;

function Bloco({ titulo, sub, pratica, children }: { titulo: string; sub: string; pratica: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="cartao overflow-hidden p-0">
      <div className="px-4 pt-4 md:px-5 md:pt-5">
        <h2 id={id} className="titulo-secao">
          {titulo}
        </h2>
        <p className="mt-0.5 text-[13px] text-suave">{sub}</p>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 md:p-5">{children}</div>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-borda bg-superficie-2 px-4 py-3 text-[13px] md:px-5">
        <span className="sobrescrito">Na prática</span>
        <span className="min-w-0">{pratica}</span>
      </p>
    </section>
  );
}

export function FormRegras({ regras: salvas, caixa }: { regras: Regras; caixa: number }) {
  const [estado, acao, enviando] = useActionState(salvarRegras, undefined);
  const [rascunho, setRascunho] = useState<{ estado: Resultado; regras: Regras } | null>(null);
  // Depois de enviar, o React volta os campos ao valor salvo: o rascunho só vale até a próxima resposta.
  const r = rascunho && rascunho.estado === estado ? rascunho.regras : salvas;
  const mudou = (Object.keys(salvas) as (keyof Regras)[]).some((k) => r[k] !== salvas[k]);

  const exemplo = simular({ venda: 50000, trato: 0, km: 0, outros: 0 }, r);
  const caixaAgora = caixa - salvas.saldo_inicial + r.saldo_inicial;
  const limite = limitePorItem(caixaAgora, r);

  return (
    <form
      action={acao}
      onChange={(e) => setRascunho({ estado, regras: lerRascunho(e.currentTarget, salvas) })}
      className="escalonado space-y-4"
    >
      <Bloco
        titulo="Margem e preço"
        sub="O que precisa sobrar em cada compra."
        pratica={
          exemplo.pagueNoMax != null ? (
            <>
              Item que vende por R$ 500: você recebe <B>{reais(exemplo.recebe, true)}</B> e paga no máximo{" "}
              <B>{reais(exemplo.pagueNoMax, true)}</B>.
            </>
          ) : (
            <>Um item de R$ 500 sem outros custos não compensa com essas regras.</>
          )
        }
      >
        <Campo
          rotulo="Margem mínima"
          name="margem_min_pct"
          sufixo="%"
          inputMode="decimal"
          defaultValue={pct(salvas.margem_min_pct)}
          required
          dica="Sobre tudo o que gastou no item. Mais alta, você paga menos."
        />
        <CampoReais
          rotulo="Lucro mínimo por item"
          name="lucro_min"
          defaultValue={paraCampo(salvas.lucro_min)}
          required
          dica="Abaixo disso não vale o trabalho, mesmo com margem boa."
        />
        <Campo
          rotulo="Pechincha do comprador"
          name="pechincha_pct"
          sufixo="%"
          inputMode="decimal"
          defaultValue={pct(salvas.pechincha_pct)}
          required
          dica="Quanto o comprador costuma tirar do preço anunciado."
        />
        <Campo
          rotulo="Taxa do anúncio"
          name="taxa_pct"
          sufixo="%"
          inputMode="decimal"
          defaultValue={pct(salvas.taxa_pct)}
          required
          dica="Comissão da plataforma. Zero se anuncia de graça."
        />
      </Bloco>

      <Bloco
        titulo="Deslocamento"
        sub="Quanto custa ir buscar."
        pratica={
          <>
            Buscar a 20 km (40 km ida e volta) soma <B>{reais(Math.round(40 * r.custo_km))}</B> ao custo do item.
          </>
        }
      >
        <CampoReais
          rotulo="Custo por km"
          name="custo_km"
          sufixo="/km"
          defaultValue={paraCampo(salvas.custo_km)}
          required
          dica="Gasolina e desgaste da moto. Entra como gasto do item."
        />
      </Bloco>

      <Bloco
        titulo="Caixa"
        sub="Quanto pode sair em cada compra."
        pratica={
          limite == null ? (
            <span className="font-semibold text-ruim">Caixa zerado: venda a moto antes de comprar.</span>
          ) : (
            <>
              Caixa livre hoje <B>{reais(caixaAgora, true)}</B>: não passe de <B>{reais(limite, true)}</B> num item só.
            </>
          )
        }
      >
        <CampoReais
          rotulo="Saldo inicial do caixa"
          name="saldo_inicial"
          defaultValue={paraCampo(salvas.saldo_inicial)}
          required
          dica="Dinheiro que você tinha para começar."
        />
        <Campo
          rotulo="Reserva intocável"
          name="reserva_pct"
          sufixo="%"
          inputMode="decimal"
          defaultValue={pct(salvas.reserva_pct)}
          required
          dica="Parte do caixa que nunca vai para compra."
        />
        <Campo
          rotulo="Máximo num item"
          name="max_item_pct"
          sufixo="%"
          inputMode="decimal"
          defaultValue={pct(salvas.max_item_pct)}
          required
          dica="Teto de uma compra só, em % do caixa. Evita prender tudo numa peça."
        />
      </Bloco>

      <Bloco
        titulo="Meta do mês"
        sub="O lucro que você quer fazer por mês."
        pratica={
          r.meta_lucro_mes > 0 ? (
            <>
              Dá <B>{reais(Math.round(r.meta_lucro_mes / 4.3), true)}</B> de lucro por semana, ou{" "}
              <B>{Math.ceil(r.meta_lucro_mes / Math.max(r.lucro_min, 1))}</B> vendas no lucro mínimo.
            </>
          ) : (
            <>Sem meta: a barra do menu fica escondida.</>
          )
        }
      >
        <CampoReais
          rotulo="Meta de lucro do mês"
          name="meta_lucro_mes"
          defaultValue={paraCampo(salvas.meta_lucro_mes)}
          required
          dica="Aparece no menu e na Visão geral. Conta só o lucro das vendas de revenda."
        />
      </Bloco>

      <div className="cartao flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          {mudou ? (
            <p className="aparece flex items-center gap-2 text-sm font-semibold text-atencao">
              <span className="size-2 shrink-0 rounded-full bg-atencao" aria-hidden />
              Alterações ainda não salvas.
            </p>
          ) : estado?.erro || estado?.ok ? (
            <Mensagem estado={estado} />
          ) : (
            <p className="text-[13px] text-suave">Vale para o Calcular e para o limite do caixa.</p>
          )}
        </div>
        <button className="botao-principal w-full sm:w-auto sm:min-w-40" disabled={enviando}>
          {enviando ? (
            <>
              <Girando className="size-4 motion-reduce:animate-none" />
              Salvando…
            </>
          ) : (
            "Salvar regras"
          )}
        </button>
      </div>
    </form>
  );
}

export function FormImportar() {
  const [estado, acao, enviando] = useActionState(importar, undefined);
  const [escolhido, setEscolhido] = useState<{ estado: Resultado; nome: string; tamanho: string } | null>(null);
  // O React limpa o formulário depois de enviar: o nome do arquivo some junto.
  const arquivo = escolhido && escolhido.estado === estado ? escolhido : null;
  const id = useId();

  return (
    <form action={acao} aria-labelledby={id} className="cartao overflow-hidden p-0">
      <div className="px-4 pt-4 md:px-5 md:pt-5">
        <h2 id={id} className="titulo-secao">
          Importar itens
        </h2>
        <p className="mt-0.5 text-[13px] text-suave">
          JSON do Caderno de Revenda ou de um backup. Os itens são somados ao que já existe, nada é substituído.
        </p>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        <label className="relative flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-borda-forte bg-superficie-2 px-3 py-2.5 transition-colors duration-150 hover:border-suave/50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-grafico">
          <input
            type="file"
            name="arquivo"
            accept="application/json,.json"
            aria-label="Arquivo .json para importar"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setEscolhido(f ? { estado, nome: f.name, tamanho: `${Math.max(1, Math.round(f.size / 1024))} KB` } : null);
            }}
          />
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-superficie text-suave ring-1 ring-borda ring-inset">
            <Icone className="size-[18px]">{ARQUIVO}</Icone>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{arquivo ? arquivo.nome : "Arquivo .json"}</span>
            <span className="block text-[13px] text-suave">{arquivo ? arquivo.tamanho : "Nenhum arquivo escolhido"}</span>
          </span>
          <span className="botao-pequeno pointer-events-none shrink-0">{arquivo ? "Trocar" : "Escolher"}</span>
        </label>

        <details className="group">
          <summary className="link -my-1 inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm md:min-h-9 [&::-webkit-details-marker]:hidden">
            <Icone className="size-4 transition-transform duration-200 ease-saida group-open:rotate-90">{SETA}</Icone>
            Colar o conteúdo em vez do arquivo
          </summary>
          <label className="mt-2 block">
            <span className="sr-only">Conteúdo JSON</span>
            <textarea
              name="json"
              rows={5}
              className="campo font-mono text-xs"
              placeholder='{"itens": [{"nome": "...", "compra_valor": 300, ...}]}'
            />
          </label>
        </details>

        <p className="text-[13px] text-suave">Valores em reais, datas AAAA-MM-DD.</p>
        <Mensagem estado={estado} />
      </div>

      <div className="border-t border-borda bg-superficie-2 px-4 py-3 md:px-5">
        <button className="botao-secundario w-full" disabled={enviando}>
          {enviando ? (
            <>
              <Girando className="size-4 motion-reduce:animate-none" />
              Importando…
            </>
          ) : (
            <>
              <Icone className="size-[18px]">{ENVIAR}</Icone>
              Importar
            </>
          )}
        </button>
      </div>
    </form>
  );
}
