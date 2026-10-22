"use client";

import { useActionState, useState } from "react";
import { registrarCompra } from "@/app/acoes";
import { simular, type Regras } from "@/lib/calculo";
import { lerNumero, lerReais, paraCampo, reais } from "@/lib/formato";
import { Campo, CampoReais, Mensagem } from "@/components/Campos";

const VEREDITO = {
  bom: { texto: "Bom negócio", classe: "bg-bom-fundo text-bom border-bom/40" },
  apertado: { texto: "Apertado", classe: "bg-atencao-fundo text-atencao border-atencao/40" },
  prejuizo: { texto: "Prejuízo", classe: "bg-ruim-fundo text-ruim border-ruim/40" },
};

type Props = { regras: Regras; caixa: number; limite: number | null; hoje: string };

export function Calculadora({ regras, caixa, limite, hoje }: Props) {
  const [v, setV] = useState({ nome: "", venda: "", trato: "", km: "", outros: "", pedido: "" });
  const [verConta, setVerConta] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [estado, acao, enviando] = useActionState(registrarCompra, undefined);

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

  const muda = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  const passaDoLimite = (valor: number | null) => limite != null && valor != null && valor > limite;

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <div className="cartao space-y-3">
        <Campo rotulo="O que é" value={v.nome} onChange={muda("nome")} placeholder="Ex.: Geladeira Brastemp 375 L" />
        <CampoReais rotulo="Vende por" value={v.venda} onChange={muda("venda")} />
        <div className="grid grid-cols-2 gap-3">
          <CampoReais rotulo="Trato/peças" value={v.trato} onChange={muda("trato")} />
          <Campo rotulo="Km ida e volta" value={v.km} onChange={muda("km")} inputMode="decimal" placeholder="0" />
          <CampoReais rotulo="Outros gastos" value={v.outros} onChange={muda("outros")} />
          <CampoReais rotulo="Vendedor pede" value={v.pedido} onChange={muda("pedido")} placeholder="opcional" />
        </div>
      </div>

      <div className="space-y-3">
        {!s ? (
          <div className="cartao text-suave">Preencha por quanto você vende para ver quanto pode pagar.</div>
        ) : (
          <>
            <div className="cartao border-marca/30 bg-marca-fundo">
              <div className="text-[13px] font-medium text-suave">Pague no máximo</div>
              {s.pagueNoMax == null ? (
                <div className="text-3xl font-bold text-ruim">Não compensa</div>
              ) : (
                <div className="text-4xl font-semibold tabular-nums tracking-tight">{reais(s.pagueNoMax, true)}</div>
              )}
              {passaDoLimite(s.pagueNoMax) && (
                <p className="mt-2 text-sm text-atencao">Acima do limite do caixa para um item só.</p>
              )}
            </div>

            {s.pedido && (
              <div className={`rounded-2xl border p-4 ${VEREDITO[s.pedido.veredito].classe}`}>
                <div className="text-xl font-bold">{VEREDITO[s.pedido.veredito].texto}</div>
                <div className="text-sm">
                  Pagando {reais(s.pedido.valor, true)}, lucro esperado de{" "}
                  <strong>{reais(s.pedido.lucroEsperado)}</strong> (alvo {reais(s.pedido.lucroAlvo)}).
                </div>
              </div>
            )}

            <button type="button" className="text-sm font-medium text-marca underline" onClick={() => setVerConta((x) => !x)}>
              {verConta ? "Esconder a conta" : "Ver a conta"}
            </button>
            {verConta && (
              <div className="cartao p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {s.conta.map((l, i) => (
                      <tr key={i} className={`border-b border-borda last:border-0 ${l.rotulo.startsWith("=") ? "font-semibold" : ""}`}>
                        <td className="px-4 py-2">
                          {l.rotulo}
                          {l.detalhe && <div className="text-xs font-normal text-suave">{l.detalhe}</div>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{reais(l.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="cartao text-sm">
          {limite == null ? (
            <span className="font-medium text-ruim">Caixa zerado: venda a moto antes de comprar.</span>
          ) : (
            <>
              Limite do caixa: <strong>não passe de {reais(limite, true)} num item só.</strong>
              <div className="text-suave">Caixa livre agora: {reais(caixa)}</div>
            </>
          )}
        </div>

        {!comprando ? (
          <button type="button" className="botao-principal w-full" onClick={() => setComprando(true)}>
            Comprei, registrar no estoque
          </button>
        ) : (
          <form action={acao} className="cartao space-y-3">
            <h2 className="font-semibold">Registrar compra</h2>
            <Campo rotulo="O que é" name="nome" defaultValue={v.nome} required />
            <div className="grid grid-cols-2 gap-3">
              <CampoReais
                rotulo="Paguei"
                name="pago"
                defaultValue={paraCampo(s?.pedido?.valor ?? s?.pagueNoMax ?? null)}
                required
              />
              <Campo rotulo="Data" name="compra_data" type="date" defaultValue={hoje} />
              <CampoReais rotulo="Vou anunciar por" name="preco_alvo" defaultValue={paraCampo(venda)} />
              <Campo rotulo="Onde comprei" name="compra_local" placeholder="Cidade/bairro" />
            </div>
            <input type="hidden" name="km" value={v.km} />
            {(lerNumero(v.km) ?? 0) > 0 && (
              <p className="text-sm text-suave">
                O deslocamento ({v.km} km = {reais(Math.round((lerNumero(v.km) ?? 0) * regras.custo_km))}) entra como gasto do item.
              </p>
            )}
            <Mensagem estado={estado} />
            <div className="flex gap-2">
              <button className="botao-principal flex-1" disabled={enviando}>
                {enviando ? "Salvando…" : "Registrar"}
              </button>
              <button type="button" className="botao-secundario" onClick={() => setComprando(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
