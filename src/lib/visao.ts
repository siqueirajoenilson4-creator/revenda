// Números da Visão geral: período, comparação, gráfico, pátio e avisos.
// Datas AAAA-MM-DD; o "hoje" vem sempre de São Paulo (formato.ts). Dinheiro em centavos.

import { custoItem, diasEntre, diasParado, lucroItem, resumo, type ItemCalc, type Regras } from "./calculo";
import { reais } from "./formato";
import { inicioMes, inicioSemana, mesesEntre, somarDias } from "./periodo";

export type ItemVisao = ItemCalc & {
  id: string;
  nome: string;
  preco_alvo: number | null;
  nota?: string | null;
  capa?: string;
};

export type PeriodoVisao = "semana" | "mes" | "ano";

export const PERIODOS_VISAO: { id: PeriodoVisao; rotulo: string }[] = [
  { id: "semana", rotulo: "Semana" },
  { id: "mes", rotulo: "Mês" },
  { id: "ano", rotulo: "Ano" },
];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const partes = (data: string) => data.split("-").map(Number);

/** "quarta, 22 de outubro" */
export function dataPorExtenso(data: string): string {
  const [y, m, d] = partes(data);
  return `${DIAS_SEMANA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${d} de ${MESES[m - 1]}`;
}

/** "20/10"; com o ano quando não é o mesmo de `hoje` ("20/10/25"). */
export function dataCurta(data: string, hoje?: string): string {
  const [y, m, d] = data.split("-");
  const base = `${d}/${m}`;
  return hoje && hoje.slice(0, 4) !== y ? `${base}/${y.slice(2)}` : base;
}

/** Valor sem centavos, como nos indicadores e no gráfico. */
export function reaisInteiros(centavos: number): string {
  return reais(Math.round(centavos / 100) * 100, true);
}

// ---------- Período e comparação ----------

export type Intervalo = { de: string; ate: string };

/** O mesmo dia em outro mês, sem passar do fim dele (31/03 → 28/02). */
function mesmoDia(y: number, m: number, d: number): string {
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

/**
 * O período até hoje e o mesmo trecho do período anterior: dia 22 contra
 * dia 22, para o começo do mês não parecer sempre pior que o mês fechado.
 */
export function intervalos(id: PeriodoVisao, hoje: string): { atual: Intervalo; anterior: Intervalo } {
  const [y, m, d] = partes(hoje);
  if (id === "semana") {
    return {
      atual: { de: inicioSemana(hoje), ate: hoje },
      anterior: { de: inicioSemana(hoje, 1), ate: somarDias(hoje, -7) },
    };
  }
  if (id === "ano") {
    return {
      atual: { de: `${y}-01-01`, ate: hoje },
      anterior: { de: `${y - 1}-01-01`, ate: mesmoDia(y - 1, m, d) },
    };
  }
  const de = inicioMes(hoje, 1);
  const [ya, ma] = partes(de);
  return { atual: { de: inicioMes(hoje), ate: hoje }, anterior: { de, ate: mesmoDia(ya, ma, d) } };
}

/** Como chamar o período anterior numa frase: "que setembro", "que a semana passada", "que 2025". */
export function nomeAnterior(id: PeriodoVisao, hoje: string): string {
  if (id === "semana") return "a semana passada";
  if (id === "ano") return String(Number(hoje.slice(0, 4)) - 1);
  return MESES[partes(inicioMes(hoje, 1))[1] - 1];
}

export function ticketMedio(faturamento: number, vendas: number): number | null {
  return vendas > 0 ? Math.round(faturamento / vendas) : null;
}

/** Lucro ÷ custo dos vendidos (o custo é o faturamento menos o lucro). Fração; null sem custo. */
export function margemSobreCusto(lucro: number, faturamento: number): number | null {
  const custo = faturamento - lucro;
  return custo > 0 ? lucro / custo : null;
}

export type Numeros = {
  faturamento: number;
  lucro: number;
  vendas: number;
  ticketMedio: number | null;
  margemCusto: number | null;
};

/** Resultado das vendas de revenda no intervalo (a moto entra no caixa, não aqui). */
export function numeros(itens: ItemCalc[], r: Regras, intervalo: Intervalo): Numeros {
  const res = resumo(itens, r, intervalo);
  return {
    faturamento: res.vendasRevenda,
    lucro: res.lucroRealizado,
    vendas: res.vendidos,
    ticketMedio: ticketMedio(res.vendasRevenda, res.vendidos),
    margemCusto: margemSobreCusto(res.lucroRealizado, res.vendasRevenda),
  };
}

export type Comparacao = { texto: string; tom?: "bom" | "ruim" };

/** "+18% que setembro"; quando o anterior é zero ou negativo, a diferença em R$. */
export function comparar(atual: number, anterior: number, quando: string): Comparacao {
  const igual = quando.startsWith("a ") ? `igual à ${quando.slice(2)}` : `igual a ${quando}`;
  const diferenca = atual - anterior;
  if (diferenca === 0) return { texto: igual };
  const tom = diferenca > 0 ? "bom" : "ruim";
  if (anterior > 0) {
    const pct = Math.round((diferenca / anterior) * 100);
    if (pct === 0) return { texto: igual };
    return { texto: `${pct > 0 ? "+" : "−"}${Math.abs(pct)}% que ${quando}`, tom };
  }
  return { texto: `${reaisInteiros(Math.abs(diferenca))} a ${diferenca > 0 ? "mais" : "menos"} que ${quando}`, tom };
}

// ---------- Gráfico ----------

export type Barra = { id: string; rotulo: string; titulo: string; faturamento: number; lucro: number };

function somarVendas(itens: ItemCalc[], de: string, ate: string) {
  let faturamento = 0;
  let lucro = 0;
  for (const i of itens) {
    const l = lucroItem(i);
    if (l == null || !i.venda_data || i.venda_data < de || i.venda_data > ate) continue;
    faturamento += i.venda_valor ?? 0;
    lucro += l;
  }
  return { faturamento, lucro };
}

/** Últimas n semanas (segunda a domingo), da mais antiga para a atual. */
export function barrasSemanais(itens: ItemCalc[], hoje: string, n = 8): Barra[] {
  return Array.from({ length: n }, (_, k) => {
    const de = inicioSemana(hoje, n - 1 - k);
    return {
      id: de,
      rotulo: dataCurta(de),
      titulo: `Semana de ${dataCurta(de, hoje)}`,
      ...somarVendas(itens, de, somarDias(de, 6)),
    };
  });
}

/** Últimos n meses, do mais antigo para o atual. */
export function barrasMensais(itens: ItemCalc[], hoje: string, n = 12): Barra[] {
  return mesesEntre(inicioMes(hoje, n - 1), hoje).map((mes) => {
    const [y, m] = partes(mes);
    return {
      id: mes,
      rotulo: MESES_CURTOS[m - 1],
      titulo: `${MESES[m - 1]} de ${y}`,
      ...somarVendas(itens, `${mes}-01`, `${mes}-31`),
    };
  });
}

/** Arredonda para cima até um número redondo (1, 2, 3, 4, 5, 6 ou 8 × potência de 10), no mínimo R$ 10. */
export function arredondarEixo(centavos: number): number {
  const v = Math.max(centavos, 1000);
  let potencia = 1;
  while (potencia * 10 <= v) potencia *= 10;
  return [1, 2, 3, 4, 5, 6, 8, 10].find((p) => p * potencia >= v)! * potencia;
}

export type Eixo = { topo: number; base: number; marcas: number[] };

/**
 * Três marcas no lado maior (topo, metade e zero). O outro lado (lucro
 * negativo, em geral) vai só até o valor, para não gastar altura à toa.
 */
export function eixo(valores: number[]): Eixo {
  const max = Math.max(0, ...valores);
  const min = Math.min(0, ...valores);
  if (max >= -min) {
    const topo = arredondarEixo(max);
    return { topo, base: min, marcas: [topo, topo / 2, 0] };
  }
  const base = -arredondarEixo(-min);
  return { topo: max, base, marcas: [0, base / 2, base] };
}

/** "R$ 0", "R$ 500", "R$ 1,5 mil", "−R$ 200". */
export function reaisEixo(centavos: number): string {
  const sinal = centavos < 0 ? "−" : "";
  const v = Math.abs(centavos) / 100;
  const n = (x: number) => x.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (v >= 1_000_000) return `${sinal}R$ ${n(v / 1_000_000)} mi`;
  if (v >= 1000) return `${sinal}R$ ${n(v / 1000)} mil`;
  return `${sinal}R$ ${n(v)}`;
}

// ---------- Vendas e pátio ----------

export type LinhaVenda = {
  id: string;
  nome: string;
  data: string;
  custo: number;
  venda: number;
  /** null para capital (entra no caixa) */
  lucro: number | null;
  margem: number | null;
  dias: number | null;
  capital: boolean;
};

export function ultimasVendas(itens: ItemVisao[], n = 6): LinhaVenda[] {
  return itens
    .filter((i) => i.situacao === "vendido" && i.venda_data && i.venda_valor != null)
    .sort((a, b) => b.venda_data!.localeCompare(a.venda_data!))
    .slice(0, n)
    .map((i) => {
      const custo = custoItem(i);
      const lucro = lucroItem(i);
      return {
        id: i.id,
        nome: i.nome,
        data: i.venda_data!,
        custo,
        venda: i.venda_valor!,
        lucro,
        margem: lucro != null && custo > 0 ? lucro / custo : null,
        dias: i.compra_data ? diasEntre(i.compra_data, i.venda_data!) : null,
        capital: i.tipo === "capital",
      };
    });
}

export type CartaoPatio = {
  id: string;
  nome: string;
  situacao: ItemCalc["situacao"];
  capital: boolean;
  capa?: string;
  dias: number | null;
  custo: number;
  preco: number | null;
  /** null para capital ou sem preço de anúncio */
  lucroPrevisto: number | null;
};

/** O que não vendeu, do mais parado para o mais novo. */
export function patio(itens: ItemVisao[], hoje: string): CartaoPatio[] {
  return itens
    .filter((i) => i.situacao !== "vendido")
    .map((i) => {
      const custo = custoItem(i);
      return {
        id: i.id,
        nome: i.nome,
        situacao: i.situacao,
        capital: i.tipo === "capital",
        capa: i.capa,
        dias: diasParado(i, hoje),
        custo,
        preco: i.preco_alvo,
        lucroPrevisto: i.tipo === "revenda" && i.preco_alvo != null ? i.preco_alvo - custo : null,
      };
    })
    .sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));
}

// ---------- Precisa de você ----------

/** Plano do negócio: mais de 30 dias parado, baixar 10%; a partir de 45, vender a preço de custo. */
export const DIAS_BAIXAR = 30;
export const DIAS_CUSTO = 45;

export type Aviso = {
  id: string;
  itemId: string;
  gravidade: "ruim" | "atencao" | "info";
  titulo: string;
  texto: string;
  dias: number;
};

const PESO = { ruim: 0, atencao: 1, info: 2 };

export function avisos(itens: ItemVisao[], hoje: string): Aviso[] {
  const lista: Aviso[] = [];
  for (const i of itens) {
    if (i.situacao === "vendido") continue;
    const dias = diasParado(i, hoje) ?? 0;
    const noPatio = `${dias} dias no pátio`;

    // A moto é capital: não tem preço de compra para baixar nem "preço de custo".
    if (i.tipo === "revenda" && dias >= DIAS_CUSTO) {
      lista.push({
        id: `${i.id}-custo`,
        itemId: i.id,
        gravidade: "ruim",
        titulo: `Vender a preço de custo: ${i.nome}`,
        texto: `${noPatio} · custo ${reais(custoItem(i), true)}`,
        dias,
      });
    } else if (i.tipo === "revenda" && dias > DIAS_BAIXAR) {
      const preco = i.preco_alvo;
      lista.push(
        preco != null
          ? {
              id: `${i.id}-baixar`,
              itemId: i.id,
              gravidade: "atencao",
              titulo: `Baixar 10%: ${i.nome}`,
              texto: `${noPatio} · de ${reais(preco, true)} para ${reais(Math.round((preco * 0.9) / 100) * 100, true)}`,
              dias,
            }
          : {
              id: `${i.id}-anunciar`,
              itemId: i.id,
              gravidade: "atencao",
              titulo: `Anunciar: ${i.nome}`,
              texto: `${noPatio} e ainda sem preço de anúncio`,
              dias,
            },
      );
    }

    const nota = i.nota?.trim();
    if (nota && i.gastos.length === 0) {
      lista.push({ id: `${i.id}-gastos`, itemId: i.id, gravidade: "info", titulo: `Lançar gastos: ${i.nome}`, texto: nota, dias });
    }
  }
  return lista.sort((a, b) => PESO[a.gravidade] - PESO[b.gravidade] || b.dias - a.dias);
}
