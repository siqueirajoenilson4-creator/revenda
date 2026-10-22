"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { CHAVE_CONVERSA as CHAVE, LIMITES, ROTULO_FERRAMENTA, type EventoChat, type Mensagem } from "@/lib/assistente";
import { Icone } from "@/components/IconesItem";

const HISTORICO = 20; // mensagens mandadas à IA a cada pergunta
const INTERROMPIDA = "A resposta foi interrompida. Tente de novo.";

const SUGESTOES = [
  "Quanto lucrei este mês?",
  "Quais itens estão parados há mais tempo?",
  "Vale comprar uma bicicleta por R$ 250 para vender a R$ 500?",
  "Escreva o anúncio do item mais recente do estoque",
];

// Ícones no traço do Lucide, como no menu.
const SETA = <path d="M5 12h14M12 5l7 7-7 7" />;
const ENVIAR = <path d="m5 12 7-7 7 7M12 19V5" />;
const FEITO = <path d="M20 6 9 17l-5-5" />;
const ALERTA = (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </>
);
const COPIAR = (
  <>
    <rect x="8" y="8" width="14" height="14" rx="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </>
);
const NOVA = (
  <>
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3l-9 9a2 2 0 0 1-.85.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.85Z" />
  </>
);

function lerSalvas(): Mensagem[] {
  try {
    const salvas = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(salvas) ? salvas.filter((m) => m?.papel && typeof m.texto === "string") : [];
  } catch {
    return [];
  }
}

function salvar(lista: Mensagem[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista.slice(-50)));
  } catch {
    // navegador sem armazenamento: a conversa só não fica guardada
  }
}

/** Últimas mensagens, cortadas para caber nos limites do servidor. */
function paraEnviar(lista: Mensagem[]): Mensagem[] {
  const corte = lista.slice(-HISTORICO).map((m) => ({
    ...m,
    texto: m.texto.slice(0, m.papel === "usuario" ? LIMITES.textoUsuario : LIMITES.textoAssistente),
  }));
  while (corte.length > 1 && corte.reduce((s, m) => s + m.texto.length, 0) > LIMITES.total) corte.shift();
  return corte;
}

/** Texto da IA: quebras de linha e **negrito**, sem HTML. */
function Texto({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*\n]+\*\*)/g);
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
      )}
    </div>
  );
}

/** "Digitando": três pontos em sequência e o que a IA está consultando. */
function Pensando({ rotulo, className = "" }: { rotulo: string; className?: string }) {
  return (
    <div role="status" className={`aparece flex min-h-11 items-center gap-3 text-[13px] text-suave ${className}`}>
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 160, 320].map((atraso) => (
          <span
            key={atraso}
            className="size-1.5 rounded-full bg-suave motion-safe:animate-[pulinho_1.2s_ease-in-out_infinite_both]"
            style={{ animationDelay: `${atraso}ms` }}
          />
        ))}
      </span>
      {rotulo}
    </div>
  );
}

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold transition-[background-color,color,scale] duration-150 hover:bg-superficie-2 active:scale-[0.96] md:min-h-9 ${
        ok ? "text-bom" : "text-suave hover:text-texto"
      }`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto.replace(/\*\*/g, ""));
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          // sem permissão de área de transferência
        }
      }}
    >
      <Icone className="size-3.5">{ok ? FEITO : COPIAR}</Icone>
      <span aria-live="polite">{ok ? "Copiado" : "Copiar"}</span>
    </button>
  );
}

export function Chat({ configurado, pedidoInicial }: { configurado: boolean; pedidoInicial?: string }) {
  const router = useRouter();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [respondendo, setRespondendo] = useState(false);
  const [ferramenta, setFerramenta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false); // "Nova conversa" pede um segundo toque
  const atual = useRef<Mensagem[]>([]);
  const parar = useRef<AbortController | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const botaoNova = useRef<HTMLButtonElement>(null);
  const iniciou = useRef(false);
  const pertoDoFim = useRef(true);

  const mudar = (fn: (l: Mensagem[]) => Mensagem[]) => {
    atual.current = fn(atual.current);
    setMensagens(atual.current);
  };

  async function enviar(texto: string) {
    texto = texto.trim();
    if (!texto || respondendo) return;
    setErro(null);
    setRascunho("");
    pertoDoFim.current = true; // quem acabou de perguntar quer ver a resposta
    mudar((l) => [...l, { papel: "usuario", texto }]);
    const historico = paraEnviar(atual.current);
    mudar((l) => [...l, { papel: "assistente", texto: "" }]);
    setRespondendo(true);
    setFerramenta(null);
    const controle = new AbortController();
    parar.current = controle;

    const acrescentar = (pedaco: string) =>
      mudar((l) => [...l.slice(0, -1), { papel: "assistente", texto: l.at(-1)!.texto + pedaco }]);
    let falhou: string | null = null;
    let terminou = false; // chegou "fim" ou "erro": sem isso, a conexão caiu no meio

    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico }),
        redirect: "manual",
        signal: controle.signal,
      });
      if (res.type === "opaqueredirect" || res.status === 0) {
        falhou = "Sua sessão expirou. Entre de novo.";
      } else if (!res.ok || !res.body) {
        falhou = ((await res.json().catch(() => null)) as { erro?: string } | null)?.erro ?? "O assistente não respondeu.";
      } else {
        const leitor = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let resto = "";
        for (;;) {
          const { value, done } = await leitor.read();
          if (done) break;
          const linhas = (resto + value).split("\n");
          resto = linhas.pop() ?? "";
          for (const linha of linhas) {
            if (!linha.trim()) continue;
            let ev: EventoChat;
            try {
              ev = JSON.parse(linha) as EventoChat;
            } catch {
              continue; // linha que não é nossa (ex.: aviso da plataforma ao cortar a função)
            }
            if (ev.tipo === "texto") {
              setFerramenta(null);
              acrescentar(ev.texto);
            } else if (ev.tipo === "ferramenta") setFerramenta(ev.nome);
            else if (ev.tipo === "erro") {
              falhou = ev.texto;
              terminou = true;
            } else if (ev.tipo === "fim") terminou = true;
          }
        }
        if (!terminou && !controle.signal.aborted) falhou = INTERROMPIDA;
      }
    } catch {
      if (!controle.signal.aborted) {
        falhou = atual.current.at(-1)?.texto
          ? INTERROMPIDA
          : "Sem conexão com o assistente. Confira a internet e tente de novo.";
      }
    }

    setRespondendo(false);
    setFerramenta(null);
    parar.current = null;
    if (!falhou && !controle.signal.aborted && !atual.current.at(-1)?.texto) {
      falhou = "O assistente não respondeu. Tente de novo.";
    }
    if (falhou) {
      setErro(falhou);
      // Sem resposta nenhuma: tira a pergunta da conversa e devolve ao campo para tentar de novo.
      if (!atual.current.at(-1)?.texto) {
        mudar((l) => l.slice(0, -2));
        setRascunho(texto);
      }
    }
    if (atual.current.at(-1)?.papel === "assistente" && !atual.current.at(-1)?.texto) mudar((l) => l.slice(0, -1));
    salvar(atual.current);
  }

  useEffect(() => {
    // Ler o que está salvo pode repetir (Strict Mode monta duas vezes); o pedido inicial, não.
    atual.current = lerSalvas();
    setMensagens(atual.current);
    let agendado: ReturnType<typeof setTimeout> | undefined;
    if (pedidoInicial && configurado && !iniciou.current) {
      agendado = setTimeout(() => {
        iniciou.current = true;
        router.replace("/assistente", { scroll: false }); // recarregar a página não repete o pedido
        void enviar(pedidoInicial);
      }, 0);
    }
    // Saiu da tela no meio da resposta: para a resposta, e o fim de enviar() salva o que chegou.
    return () => {
      clearTimeout(agendado);
      parar.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const medir = () => {
      pertoDoFim.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
    };
    window.addEventListener("scroll", medir, { passive: true });
    return () => window.removeEventListener("scroll", medir);
  }, []);

  // Acompanha a resposta só enquanto a pessoa está perto do fim (não puxa quem subiu para ler).
  useEffect(() => {
    if ((respondendo || mensagens.length) && pertoDoFim.current) fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens, respondendo]);

  // O campo cresce com o texto (até 160 px), também onde não há field-sizing.
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [rascunho]);

  if (!configurado) {
    return (
      <section className="entra cartao max-w-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="titulo-secao">O assistente ainda não foi ligado</h2>
          <span className="rounded-md bg-atencao-fundo px-1.5 py-0.5 text-[11px] font-bold tracking-[0.04em] text-atencao uppercase">
            Sem chave
          </span>
        </div>
        <p className="mt-1 text-[15px] text-suave">Ele precisa de uma chave da OpenAI. O resto do sistema funciona normalmente.</p>
        <ol className="mt-4 divide-y divide-borda border-t border-borda text-[15px]">
          {[
            <>
              Crie uma chave em{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="link">
                platform.openai.com/api-keys
              </a>
              .
            </>,
            <>
              Coloque a chave como <Codigo>OPENAI_API_KEY</Codigo> nas variáveis de ambiente da Vercel (e no{" "}
              <Codigo>.env.local</Codigo>, para usar no computador).
            </>,
            <>Publique de novo. O assistente aparece nesta tela.</>,
          ].map((passo, i) => (
            <li key={i} className="flex gap-3 py-3">
              <span className="numero w-4 shrink-0 text-lg leading-6 text-suave">{i + 1}</span>
              <span className="min-w-0">{passo}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const ultima = mensagens.length - 1;
  const rotuloPensando = ferramenta ? `${ROTULO_FERRAMENTA[ferramenta] ?? "Consultando"}…` : "Pensando…";
  const pedindo = confirmar && !respondendo;

  // Perguntar fecha o "Apagar esta conversa?", senão ele volta no fim da resposta e tira o foco do campo.
  const perguntar = (texto: string) => {
    setConfirmar(false);
    void enviar(texto);
  };
  const cancelar = () => {
    flushSync(() => setConfirmar(false));
    botaoNova.current?.focus();
  };
  // O botão tocado some da tela; o foco volta ao campo. No celular, não: abriria o teclado por cima da conversa.
  const focarCampo = () => {
    if (!window.matchMedia("(pointer: coarse)").matches) campo.current?.focus();
  };
  const apagar = () => {
    mudar(() => []);
    setErro(null);
    salvar([]);
    setConfirmar(false);
    focarCampo();
  };

  return (
    <div className="flex max-w-3xl flex-col gap-3">
      {mensagens.length === 0 && !respondendo && (
        <div className="escalonado space-y-4">
          <section className="cartao p-4 md:p-5">
            <h2 className="titulo-secao">O que ele faz</h2>
            <p className="mt-1 max-w-prose text-[15px] text-suave">
              Lê o estoque, o caixa e as regras e faz as mesmas contas da tela Calcular. Não grava nada: para registrar, use os
              botões de cada tela.
            </p>
          </section>
          <section aria-labelledby="sugestoes">
            <h2 id="sugestoes" className="sobrescrito mb-2 px-0.5">
              Perguntas prontas
            </h2>
            <div className="escalonado grid gap-2 md:grid-cols-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="group cartao cartao-link flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left text-[15px] font-semibold"
                  onClick={() => enviar(s)}
                >
                  <span className="min-w-0">{s}</span>
                  <Icone className="size-4 text-suave transition-[translate,color] duration-200 ease-saida group-hover:translate-x-0.5 group-hover:text-texto">
                    {SETA}
                  </Icone>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {mensagens.length > 0 && (
        <div
          role={pedindo ? "group" : undefined}
          aria-labelledby={pedindo ? "apagar-conversa" : undefined}
          onKeyDown={(e) => {
            if (pedindo && e.key === "Escape") cancelar();
          }}
          className="flex min-h-11 items-center justify-between gap-3 border-b border-borda pb-2"
        >
          {pedindo ? (
            <>
              <p id="apagar-conversa" className="aparece text-[15px] font-semibold">
                Apagar esta conversa?
              </p>
              <div className="aparece flex shrink-0 gap-2">
                <button type="button" autoFocus className="botao-pequeno min-h-11 md:min-h-9" onClick={cancelar}>
                  Cancelar
                </button>
                <button type="button" className="botao-pequeno min-h-11 border-ruim/40 text-ruim md:min-h-9" onClick={apagar}>
                  Apagar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="sobrescrito min-w-0 truncate">Conversa · só neste aparelho</p>
              <button
                ref={botaoNova}
                type="button"
                className="botao-pequeno min-h-11 shrink-0 disabled:pointer-events-none disabled:opacity-50 md:min-h-9"
                disabled={respondendo}
                onClick={() => setConfirmar(true)}
              >
                <Icone className="size-3.5">{NOVA}</Icone>
                Nova conversa
              </button>
            </>
          )}
        </div>
      )}

      {mensagens.map((m, i) =>
        m.papel === "usuario" ? (
          <div
            key={i}
            className="entra ml-auto max-w-[88%] rounded-xl rounded-br-sm border border-lateral-borda bg-lateral px-4 py-2.5 text-[15px] text-white md:max-w-[75%]"
          >
            <Texto texto={m.texto} />
          </div>
        ) : m.texto ? (
          <article key={i} className="entra cartao text-[15px] md:max-w-[88%]">
            <div className="sobrescrito mb-1.5">Assistente</div>
            <Texto texto={m.texto} />
            {respondendo && i === ultima ? (
              ferramenta && <Pensando rotulo={rotuloPensando} className="-mb-2" />
            ) : (
              <div className="-mr-2 -mb-2 mt-1 flex justify-end">
                <Copiar texto={m.texto} />
              </div>
            )}
          </article>
        ) : respondendo && i === ultima ? (
          <Pensando key={i} rotulo={rotuloPensando} className="px-1" />
        ) : null,
      )}

      {erro && (
        <p
          role="alert"
          className="entra flex items-start gap-2 rounded-lg border border-ruim/25 bg-ruim-fundo px-3 py-2.5 text-sm font-medium text-ruim"
        >
          <Icone className="mt-px size-4">{ALERTA}</Icone>
          {erro}
        </p>
      )}
      {/* A margem desconta o campo fixo e as abas do celular, para o fim da resposta não ficar escondido. */}
      <div ref={fim} className="scroll-mb-[calc(8.5rem+env(safe-area-inset-bottom))] md:scroll-mb-28" />

      {/* Fundo cheio (e 4 px abaixo, até as abas) para o texto não aparecer por trás do campo. */}
      <form
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-1 bg-fundo px-1 py-2 shadow-[0_4px_0_var(--fundo)] md:bottom-0 md:pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          perguntar(rascunho);
        }}
      >
        <div className="flex items-end gap-2">
          {/* A borda fica na moldura: o campo sem borda mede exatamente o próprio scrollHeight (sem rolar 2 px). */}
          <div className="campo p-0 shadow-(--sombra) focus-within:border-grafico focus-within:ring-3 focus-within:ring-grafico/15">
            <textarea
              ref={campo}
              className="block max-h-40 min-h-[42px] w-full resize-none overflow-y-auto rounded-[7px] px-3 py-[9px] leading-6 placeholder:text-suave/60"
              rows={1}
              value={rascunho}
              maxLength={LIMITES.textoUsuario}
              placeholder="Pergunte ou peça um anúncio…"
              aria-label="Mensagem para o assistente"
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                // No celular o Enter quebra a linha; envia pelo botão.
                const toque = window.matchMedia("(pointer: coarse)").matches;
                if (e.key === "Enter" && !e.shiftKey && !toque && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  perguntar(rascunho);
                }
              }}
            />
          </div>
          {respondendo ? (
            <button
              type="button"
              className="botao-secundario min-h-11 shrink-0 px-3.5"
              onClick={() => {
                parar.current?.abort();
                focarCampo();
              }}
            >
              <span className="size-2.5 rounded-[2px] bg-current" aria-hidden />
              Parar
            </button>
          ) : (
            <button aria-label="Enviar" title="Enviar" className="botao-principal size-11 shrink-0 px-0" disabled={!rascunho.trim()}>
              <Icone className="size-5">{ENVIAR}</Icone>
            </button>
          )}
        </div>
        <p className="mt-1.5 hidden px-0.5 text-[12px] text-suave md:pointer-fine:block">Enter envia · Shift + Enter quebra a linha</p>
      </form>
    </div>
  );
}

function Codigo({ children }: { children: ReactNode }) {
  return <code className="rounded bg-superficie-2 px-1 py-0.5 font-mono text-[13px] ring-1 ring-borda ring-inset">{children}</code>;
}
