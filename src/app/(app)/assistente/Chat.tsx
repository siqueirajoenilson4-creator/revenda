"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CHAVE_CONVERSA as CHAVE, LIMITES, ROTULO_FERRAMENTA, type EventoChat, type Mensagem } from "@/lib/assistente";

const HISTORICO = 20; // mensagens mandadas à IA a cada pergunta
const INTERROMPIDA = "A resposta foi interrompida. Tente de novo.";

const SUGESTOES = [
  "Quanto lucrei este mês?",
  "Quais itens estão parados há mais tempo?",
  "Vale comprar uma bicicleta por R$ 250 para vender a R$ 500?",
  "Escreva o anúncio do item mais recente do estoque",
];

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

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="botao-pequeno"
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
      {ok ? "Copiado" : "Copiar"}
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
  const atual = useRef<Mensagem[]>([]);
  const parar = useRef<AbortController | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
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
      <div className="cartao max-w-2xl space-y-2 text-sm">
        <p className="font-semibold">O assistente ainda não foi ligado.</p>
        <p className="text-suave">
          Crie uma chave em platform.openai.com → API keys e coloque como <code>OPENAI_API_KEY</code> nas variáveis de
          ambiente da Vercel (e no <code>.env.local</code> para usar no computador). Depois publique de novo.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      {mensagens.length === 0 && !respondendo && (
        <div className="cartao space-y-3">
          <p className="text-sm text-suave">
            Ele lê o seu estoque, o caixa e as regras, e usa as mesmas contas da tela Calcular. Não grava nada: para registrar,
            você continua usando os botões.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button key={s} type="button" className="botao-pequeno text-left" onClick={() => enviar(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {mensagens.map((m, i) =>
        m.papel === "usuario" ? (
          <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-marca px-4 py-2.5 text-sm text-marca-texto">
            <Texto texto={m.texto} />
          </div>
        ) : (
          <div key={i} className="cartao max-w-[95%] text-sm">
            {m.texto ? (
              <Texto texto={m.texto} />
            ) : (
              <span className="animate-pulse text-suave">{ferramenta ? `${ROTULO_FERRAMENTA[ferramenta] ?? "Consultando"}…` : "Pensando…"}</span>
            )}
            {m.texto && !(respondendo && i === mensagens.length - 1) && (
              <div className="mt-3 flex justify-end">
                <Copiar texto={m.texto} />
              </div>
            )}
          </div>
        ),
      )}

      {erro && (
        <p role="alert" className="rounded-xl bg-ruim-fundo px-3 py-2 text-sm text-ruim">
          {erro}
        </p>
      )}
      {/* A margem desconta o campo fixo e as abas do celular, para o fim da resposta não ficar escondido. */}
      <div ref={fim} className="scroll-mb-[calc(8.5rem+env(safe-area-inset-bottom))] md:scroll-mb-20" />

      <form
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-1 flex items-end gap-2 bg-fundo/95 px-1 py-2 backdrop-blur md:bottom-0"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(rascunho);
        }}
      >
        <textarea
          ref={campo}
          className="campo max-h-40 min-h-11 resize-none overflow-y-auto"
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
              void enviar(rascunho);
            }
          }}
        />
        {respondendo ? (
          <button type="button" className="botao-secundario" onClick={() => parar.current?.abort()}>
            Parar
          </button>
        ) : (
          <button className="botao-principal" disabled={!rascunho.trim()}>
            Enviar
          </button>
        )}
      </form>
      {mensagens.length > 0 && !respondendo && (
        <button
          type="button"
          className="self-center text-xs font-medium text-suave underline"
          onClick={() => {
            mudar(() => []);
            setErro(null);
            salvar([]);
          }}
        >
          Começar nova conversa
        </button>
      )}
    </div>
  );
}
