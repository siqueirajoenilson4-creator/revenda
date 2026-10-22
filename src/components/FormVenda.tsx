"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { vendi, type Resultado } from "@/app/acoes";
import { lerReais, paraBusca, paraCampo, pctTexto, reais } from "@/lib/formato";
import { inicioMes } from "@/lib/periodo";
import {
  CANAIS,
  ENTREGAS_VENDA,
  PAGAMENTOS,
  ehCanal,
  previaVenda,
  rotuloCanal,
  type Canal,
  type EntregaVenda,
  type Pagamento,
  type PreviaVenda,
} from "@/lib/vendas";
import { Campo, CampoReais, Mensagem } from "./Campos";
import { Girando, Icone, LUPA } from "./IconesItem";
import { Miniatura } from "./Selos";

/** Item do pátio que pode ser vendido (o que o formulário precisa e nada mais). */
export type ItemParaVenda = {
  id: string;
  nome: string;
  categoria: string | null;
  tipo: "revenda" | "capital";
  custo: number;
  preco_alvo: number | null;
  capa?: string;
};

/** Interessado ativo, para o atalho "foi um dos interessados?". */
export type InteressadoVenda = {
  id: string;
  nome: string;
  item_id: string | null;
  canal: Canal;
  telefone: string | null;
};

/** Escolha rápida em botões (rádio de verdade por baixo: o formulário envia igual a um select). */
export function Opcoes<T extends string>({
  rotulo,
  name,
  opcoes,
  valor,
  aoMudar,
  colunas = "grid-cols-3",
}: {
  rotulo: string;
  name: string;
  opcoes: readonly { id: T; rotulo: string }[];
  valor: T | null;
  aoMudar: (v: T) => void;
  colunas?: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="rotulo">{rotulo}</legend>
      <div className={`grid gap-1.5 ${colunas}`}>
        {opcoes.map((o) => (
          <label
            key={o.id}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-borda-forte bg-superficie px-1.5 text-center text-[13px] leading-tight font-semibold hyphens-auto sm:text-sm text-texto transition-[background-color,border-color,color,scale] duration-150 select-none hover:border-suave/60 active:scale-[0.97] has-checked:border-texto has-checked:bg-texto has-checked:text-superficie has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-grafico md:min-h-10"
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={valor === o.id}
              onChange={() => aoMudar(o.id)}
              className="sr-only"
            />
            {o.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Secao({
  titulo,
  nota,
  embutido,
  children,
}: {
  titulo: string;
  nota?: string;
  embutido?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`space-y-3.5 ${embutido ? "py-4 first:pt-0" : "p-4 md:p-5"}`}>
      <h2 className="titulo-secao">
        {titulo}
        {nota && <span className="ml-1.5 text-[13px] font-medium text-suave">{nota}</span>}
      </h2>
      {children}
    </section>
  );
}

// ---------- Item ----------

const legenda = (i: ItemParaVenda) =>
  [i.categoria, i.tipo === "capital" ? "Capital próprio" : `custo ${reais(i.custo, true)}`].filter(Boolean).join(" · ");

function EscolherItem({ itens, aoEscolher }: { itens: ItemParaVenda[]; aoEscolher: (id: string) => void }) {
  const [busca, setBusca] = useState("");
  const termo = useDeferredValue(paraBusca(busca));
  const lista = termo ? itens.filter((i) => paraBusca(`${i.nome} ${i.categoria ?? ""}`).includes(termo)) : itens;
  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Buscar item no pátio</span>
        <Icone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave">{LUPA}</Icone>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar no pátio…"
          autoComplete="off"
          className="campo pl-9"
        />
      </label>
      {lista.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-borda-forte px-3 py-4 text-sm text-suave">
          Nada no pátio com “{busca.trim()}”. Confira a grafia.
        </p>
      ) : (
        <ul
          aria-label="Itens do pátio"
          className="rolagem-fina mt-2 max-h-[min(22rem,55dvh)] divide-y divide-borda overflow-y-auto rounded-lg border border-borda"
        >
          {lista.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => aoEscolher(i.id)}
                className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-superficie-2 active:bg-superficie-2"
              >
                <Miniatura src={i.capa} nome={i.nome} tamanho="size-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{i.nome}</span>
                  <span className="block truncate text-[13px] text-suave">{legenda(i)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="sobrescrito block">Anúncio</span>
                  <span className={`block font-semibold ${i.preco_alvo == null ? "text-suave" : ""}`}>
                    {i.preco_alvo == null ? "—" : reais(i.preco_alvo, true)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemEscolhido({ item, aoTrocar }: { item: ItemParaVenda; aoTrocar?: () => void }) {
  return (
    <div className="aparece flex items-center gap-3 rounded-lg border border-borda bg-superficie-2 p-2.5">
      <Miniatura src={item.capa} nome={item.nome} tamanho="size-12" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{item.nome}</div>
        <div className="truncate text-[13px] text-suave">
          {legenda(item)} · anúncio {reais(item.preco_alvo, true)}
        </div>
      </div>
      {aoTrocar && (
        <button type="button" className="botao-pequeno min-h-11 md:min-h-9" onClick={aoTrocar}>
          Trocar
        </button>
      )}
    </div>
  );
}

// ---------- Prévia ao vivo ----------

function textoDesconto(p: PreviaVenda): string {
  if (p.desconto == null) return "sem preço anunciado";
  if (p.desconto === 0) return "pelo preço anunciado";
  if (p.desconto < 0) return `${reais(-p.desconto, true)} acima do anúncio`;
  return `${reais(p.desconto, true)} (${pctTexto(p.descontoPct, 0)})`;
}

const tomLucro = (lucro: number | null) => (lucro == null ? "text-suave" : lucro > 0 ? "text-bom" : "text-ruim");

/** Linha curta embaixo do valor, para ver o lucro sem rolar a tela (celular e folha). */
function PreviaCurta({ p, valor }: { p: PreviaVenda; valor: number | null }) {
  let conteudo: ReactNode;
  if (p.capital)
    conteudo = (
      <>
        Entra no caixa: <strong className="font-semibold text-texto">{reais(valor, true)}</strong> · capital próprio, não
        conta no lucro
      </>
    );
  else if (p.lucro == null) conteudo = "Digite o valor para ver o lucro.";
  else
    conteudo = (
      <>
        Lucro <strong className={`font-bold ${tomLucro(p.lucro)}`}>{reais(p.lucro, true)}</strong>
        {p.margem != null && ` · ${pctTexto(p.margem, 0)} sobre o custo`}
        {p.desconto != null && p.desconto > 0 && ` · desconto ${textoDesconto(p)}`}
        {p.desconto != null && p.desconto < 0 && ` · ${textoDesconto(p)}`}
      </>
    );
  return <p className="rounded-lg bg-superficie-2 px-3 py-2 text-[13px] leading-snug text-suave">{conteudo}</p>;
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <dt className="text-suave">{rotulo}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

function Previa({ item, p, valor, entrega }: { item: ItemParaVenda; p: PreviaVenda; valor: number | null; entrega: number }) {
  return (
    <div>
      <p className="sobrescrito">{p.capital ? "Entra no caixa" : "Lucro desta venda"}</p>
      <p className={`numero mt-1 truncate text-[40px] leading-none ${p.capital ? "" : tomLucro(p.lucro)}`}>
        {reais(p.capital ? valor : p.lucro, true)}
      </p>
      <p className="mt-1.5 text-[13px] text-suave">
        {p.capital
          ? "Capital próprio: entra no caixa, não conta no lucro."
          : p.margem != null
            ? `${pctTexto(p.margem, 0)} sobre o custo`
            : p.lucro == null
              ? "Digite o valor recebido."
              : "item sem custo"}
      </p>
      <dl className="mt-4 divide-y divide-borda border-t border-borda text-sm">
        <Linha rotulo="Valor recebido">{reais(valor, true)}</Linha>
        <Linha rotulo={p.capital ? "Gastos do item" : "Custo do item"}>{reais(item.custo, true)}</Linha>
        {entrega > 0 && <Linha rotulo="Entrega">{reais(entrega, true)}</Linha>}
        {!p.capital && <Linha rotulo="Desconto">{textoDesconto(p)}</Linha>}
      </dl>
    </div>
  );
}

// ---------- Formulário ----------

/**
 * "Registrar venda". Com `itemId` o item vem escolhido e a escolha some (detalhe do item);
 * com `inicial` ele vem escolhido mas dá para trocar. `embutido` tira o cartão (dentro de uma Folha).
 */
export function FormVenda({
  itens,
  itemId,
  inicial,
  contatos = [],
  hoje,
  aoTerminar,
  embutido = false,
}: {
  itens: ItemParaVenda[];
  itemId?: string;
  inicial?: string;
  contatos?: InteressadoVenda[];
  hoje: string;
  aoTerminar?: () => void;
  embutido?: boolean;
}) {
  const router = useRouter();
  const [estado, acao, enviando] = useActionState(vendi, undefined);
  const primeiro = itens.find((i) => i.id === (itemId ?? inicial));
  const [escolhido, setEscolhido] = useState<string | null>(primeiro?.id ?? null);
  const [valor, setValor] = useState(paraCampo(primeiro?.preco_alvo ?? null));
  const [canal, setCanal] = useState<Canal>("marketplace");
  const [pagamento, setPagamento] = useState<Pagamento>("pix");
  const [entrega, setEntrega] = useState<EntregaVenda>("retirada");
  const [custoEntrega, setCustoEntrega] = useState("");
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [contatoId, setContatoId] = useState<string | null>(null);
  const idValor = useId();
  const dataEnviada = useRef(hoje);
  const tratado = useRef<Resultado>(undefined);

  const item = itens.find((i) => i.id === escolhido) ?? null;
  const v = lerReais(valor);
  const entregaCentavos = entrega === "entreguei" ? Math.max(0, lerReais(custoEntrega) ?? 0) : 0;
  const previa = item ? previaVenda(item, v, entregaCentavos) : null;
  const interessados = item ? contatos.filter((c) => c.item_id === item.id) : [];

  // Deu certo: fecha (folha) ou vai para a lista. Venda de mês passado abre a lista em "Tudo".
  useEffect(() => {
    if (!estado?.ok || tratado.current === estado) return;
    tratado.current = estado;
    if (aoTerminar) aoTerminar();
    else router.push(dataEnviada.current < inicioMes(hoje) ? "/vendas?periodo=tudo" : "/vendas");
  }, [estado, aoTerminar, router, hoje]);

  function escolher(id: string | null) {
    setEscolhido(id);
    setContatoId(null);
    if (!id) return;
    setValor(paraCampo(itens.find((i) => i.id === id)?.preco_alvo ?? null));
    requestAnimationFrame(() => document.getElementById(idValor)?.focus());
  }

  function usarInteressado(c: InteressadoVenda) {
    if (contatoId === c.id) return setContatoId(null);
    setContatoId(c.id);
    setNome(c.nome);
    setContato(c.telefone ?? "");
    if (ehCanal(c.canal)) setCanal(c.canal);
  }

  // Envio manual: o reset automático do <form action> apagaria o que foi digitado quando dá erro.
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    dataEnviada.current = String(dados.get("data") ?? hoje);
    startTransition(() => acao(dados));
  }

  // Depois de registrar, o item sai do pátio (a página recarrega os dados) antes de a tela trocar.
  if (estado?.ok && !item) return <Mensagem estado={estado} />;

  if (itens.length === 0 || (itemId && !item))
    return (
      <div className={embutido ? "space-y-3" : "cartao entra flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"}>
        <div>
          <p className="font-semibold">{itemId ? "Este item não está mais no pátio" : "Nada no pátio para vender"}</p>
          <p className="mt-0.5 text-sm text-suave">
            {itemId ? "Ele já foi vendido ou foi apagado." : "Cadastre a compra primeiro; depois volte aqui para registrar a venda."}
          </p>
        </div>
        {!itemId && (
          <Link href="/estoque/novo" className="botao-principal">
            + Novo item
          </Link>
        )}
      </div>
    );

  const largo = embutido ? "" : "@3xl/venda:grid-cols-[minmax(0,1fr)_300px] @3xl/venda:items-start @3xl/venda:gap-5";
  const seis = "grid-cols-3 @2xl/campos:grid-cols-6";

  return (
    <form onSubmit={enviar} className="@container/venda">
      <input type="hidden" name="id" value={escolhido ?? ""} />
      {contatoId && <input type="hidden" name="contato_id" value={contatoId} />}
      <div className={`grid gap-4 ${largo}`}>
        <div className={`@container/campos ${embutido ? "divide-y divide-borda" : "cartao escalonado divide-y divide-borda p-0"}`}>
          {!itemId && (
            <Secao titulo="Item vendido" embutido={embutido}>
              {item ? (
                <ItemEscolhido item={item} aoTrocar={() => escolher(null)} />
              ) : (
                <EscolherItem itens={itens} aoEscolher={escolher} />
              )}
            </Secao>
          )}

          <Secao titulo="Venda" embutido={embutido}>
            <div className="grid grid-cols-2 gap-3">
              <CampoReais
                id={idValor}
                rotulo="Valor recebido"
                name="valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
                autoFocus={Boolean(itemId)}
              />
              <Campo rotulo="Data" name="data" type="date" defaultValue={hoje} required />
            </div>
            {previa && (
              <div className={embutido ? "" : "@3xl/venda:hidden"}>
                <PreviaCurta p={previa} valor={v} />
              </div>
            )}
            <Opcoes rotulo="Canal" name="canal" opcoes={CANAIS} valor={canal} aoMudar={setCanal} colunas={seis} />
            <Opcoes rotulo="Pagamento" name="pagamento" opcoes={PAGAMENTOS} valor={pagamento} aoMudar={setPagamento} colunas={seis} />
            <Opcoes
              rotulo="Entrega"
              name="entrega"
              opcoes={ENTREGAS_VENDA}
              valor={entrega}
              aoMudar={setEntrega}
              colunas="grid-cols-2"
            />
            {entrega === "entreguei" && (
              <CampoReais
                className="aparece"
                rotulo="Custo da entrega"
                name="custo_entrega"
                value={custoEntrega}
                onChange={(e) => setCustoEntrega(e.target.value)}
                dica="Combustível, frete ou carreto. Vira gasto do item e sai do lucro."
              />
            )}
          </Secao>

          <Secao titulo="Comprador" nota="opcional" embutido={embutido}>
            {interessados.length > 0 && (
              <div>
                <p className="rotulo">Foi um dos interessados?</p>
                <div className="flex flex-wrap gap-1.5">
                  {interessados.map((c) => {
                    const sel = contatoId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={sel}
                        onClick={() => usarInteressado(c)}
                        className={`botao-pequeno min-h-11 md:min-h-9 ${sel ? "border-texto bg-texto text-superficie" : ""}`}
                      >
                        {c.nome}
                        <span className={`text-[11px] font-medium ${sel ? "opacity-80" : "text-suave"}`}>{rotuloCanal(c.canal)}</span>
                      </button>
                    );
                  })}
                </div>
                {contatoId && (
                  <p className="aparece mt-1.5 text-[13px] text-suave">Ele fica como “Comprou” nos interessados.</p>
                )}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Nome" name="comprador_nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" />
              <Campo
                rotulo="Telefone ou perfil"
                name="comprador_contato"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Campo rotulo="Cidade" name="cidade" placeholder="Ex.: Londrina, Cambé" autoComplete="off" />
            <label className="block">
              <span className="rotulo">Observação</span>
              <textarea name="obs" rows={2} className="campo" placeholder="Ex.: levou sem o carregador" />
            </label>
          </Secao>
        </div>

        <aside className={embutido ? "border-t border-borda pt-4" : "@3xl/venda:sticky @3xl/venda:top-7"}>
          <div className={embutido ? "space-y-3" : "cartao entra space-y-4 md:p-5"}>
            {!embutido &&
              (item && previa ? (
                <Previa item={item} p={previa} valor={v} entrega={entregaCentavos} />
              ) : (
                <div>
                  <p className="sobrescrito">Lucro desta venda</p>
                  <p className="mt-1 text-sm text-suave">Escolha o item para ver o lucro, a margem e o desconto.</p>
                </div>
              ))}
            <Mensagem estado={estado} />
            <button type="submit" className="botao-principal w-full" disabled={enviando}>
              {enviando ? (
                <>
                  <Girando />
                  Registrando…
                </>
              ) : (
                "Registrar venda"
              )}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
