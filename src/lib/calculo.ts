// Regras de cálculo da seção 5 da especificação.
// Todo valor em dinheiro é em centavos (inteiro). Percentuais são números como 30 (= 30%).

export type Regras = {
  margem_min_pct: number;
  lucro_min: number;
  pechincha_pct: number;
  taxa_pct: number;
  custo_km: number;
  saldo_inicial: number;
  reserva_pct: number;
  max_item_pct: number;
};

export const REGRAS_PADRAO: Regras = {
  margem_min_pct: 30,
  lucro_min: 8000,
  pechincha_pct: 10,
  taxa_pct: 0,
  custo_km: 30,
  saldo_inicial: 0,
  reserva_pct: 20,
  max_item_pct: 30,
};

export type Simulacao = {
  venda: number;
  trato: number;
  km: number;
  outros: number;
  pedido?: number | null;
};

export type Veredito = "bom" | "apertado" | "prejuizo";

export type LinhaConta = { rotulo: string; valor: number; detalhe?: string };

export type ResultadoSimulacao = {
  recebe: number;
  deslocamento: number;
  custos: number;
  /** null quando "Não compensa" */
  pagueNoMax: number | null;
  pagueNoMaxBruto: number;
  pelaMargem: number;
  peloLucroMin: number;
  pedido: null | {
    valor: number;
    lucroEsperado: number;
    lucroAlvo: number;
    veredito: Veredito;
  };
  conta: LinhaConta[];
};

const pct = (p: number) => p / 100;

/** Arredonda para baixo de R$ 10 em R$ 10 (1000 centavos). */
export function arredondarDez(centavos: number): number {
  return Math.floor(centavos / 1000) * 1000;
}

export function recebeLiquido(venda: number, r: Regras): number {
  const pechincha = venda * pct(r.pechincha_pct);
  const taxa = (venda - pechincha) * pct(r.taxa_pct);
  return Math.round(venda - pechincha - taxa);
}

export function simular(s: Simulacao, r: Regras): ResultadoSimulacao {
  const recebe = recebeLiquido(s.venda, r);
  const deslocamento = Math.round(s.km * r.custo_km);
  const custos = s.trato + deslocamento + s.outros;
  const m = pct(r.margem_min_pct);

  const pelaMargem = Math.floor(recebe / (1 + m) - custos);
  const peloLucroMin = recebe - custos - r.lucro_min;
  const pagueNoMaxBruto = Math.min(pelaMargem, peloLucroMin);
  const arredondado = arredondarDez(pagueNoMaxBruto);
  const pagueNoMax = arredondado > 0 ? arredondado : null;

  let pedido: ResultadoSimulacao["pedido"] = null;
  if (s.pedido != null && s.pedido > 0) {
    const lucroEsperado = recebe - custos - s.pedido;
    const lucroAlvo = Math.max(Math.round((s.pedido + custos) * m), r.lucro_min);
    const veredito: Veredito =
      lucroEsperado >= lucroAlvo ? "bom" : lucroEsperado > 0 ? "apertado" : "prejuizo";
    pedido = { valor: s.pedido, lucroEsperado, lucroAlvo, veredito };
  }

  const conta: LinhaConta[] = [
    { rotulo: "Vende por", valor: s.venda },
    {
      rotulo: `− Pechincha (${r.pechincha_pct}%)`,
      valor: -Math.round(s.venda * pct(r.pechincha_pct)),
    },
  ];
  if (r.taxa_pct > 0) {
    conta.push({
      rotulo: `− Taxa do anúncio (${r.taxa_pct}%)`,
      valor: -Math.round((s.venda - s.venda * pct(r.pechincha_pct)) * pct(r.taxa_pct)),
    });
  }
  conta.push(
    { rotulo: "= Você recebe", valor: recebe },
    { rotulo: "Trato/peças", valor: s.trato },
    {
      rotulo: "Deslocamento",
      valor: deslocamento,
      detalhe: `${s.km} km × ${(r.custo_km / 100).toFixed(2).replace(".", ",")}`,
    },
    { rotulo: "Outros gastos", valor: s.outros },
    { rotulo: "= Custos além da compra", valor: custos },
    {
      rotulo: `Pela margem (${r.margem_min_pct}% sobre o custo)`,
      valor: pelaMargem,
      detalhe: "recebe ÷ (1 + margem) − custos",
    },
    {
      rotulo: "Pelo lucro mínimo",
      valor: peloLucroMin,
      detalhe: "recebe − custos − lucro mínimo",
    },
    { rotulo: "= O menor dos dois, de 10 em 10", valor: arredondado },
  );
  if (pedido) {
    conta.push(
      { rotulo: "Vendedor pede", valor: pedido.valor },
      { rotulo: "Lucro esperado", valor: pedido.lucroEsperado, detalhe: "recebe − custos − pedido" },
      { rotulo: "Lucro alvo", valor: pedido.lucroAlvo, detalhe: "maior entre margem e lucro mínimo" },
    );
  }

  return { recebe, deslocamento, custos, pagueNoMax, pagueNoMaxBruto, pelaMargem, peloLucroMin, pedido, conta };
}

/** null quando o caixa está zerado ou negativo. */
export function limitePorItem(caixa: number, r: Regras): number | null {
  if (caixa <= 0) return null;
  return Math.floor(
    Math.min(caixa * (1 - pct(r.reserva_pct)), caixa * pct(r.max_item_pct)),
  );
}

// ---------- Estoque e caixa ----------

export type Tipo = "revenda" | "capital";
export type Situacao = "comprado" | "anunciado" | "vendido";

export type ItemCalc = {
  tipo: Tipo;
  situacao: Situacao;
  compra_valor: number;
  compra_data: string | null; // AAAA-MM-DD
  venda_valor: number | null;
  venda_data: string | null;
  gastos: { valor: number }[];
};

export function custoItem(i: ItemCalc): number {
  const compra = i.tipo === "capital" ? 0 : i.compra_valor;
  return compra + i.gastos.reduce((s, g) => s + g.valor, 0);
}

/** Lucro realizado: só quando vendido e só para revenda. */
export function lucroItem(i: ItemCalc): number | null {
  if (i.situacao !== "vendido" || i.venda_valor == null || i.tipo === "capital") return null;
  return i.venda_valor - custoItem(i);
}

/** Dias entre duas datas AAAA-MM-DD (b − a). */
export function diasEntre(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/** Dias parado: da compra até hoje, ou até a venda se vendido. */
export function diasParado(i: ItemCalc, hoje: string): number | null {
  if (!i.compra_data) return null;
  const fim = i.situacao === "vendido" && i.venda_data ? i.venda_data : hoje;
  return Math.max(0, diasEntre(i.compra_data, fim));
}

export function caixaLivre(itens: ItemCalc[], r: Regras): number {
  let caixa = r.saldo_inicial;
  for (const i of itens) {
    if (i.situacao === "vendido" && i.venda_valor != null) caixa += i.venda_valor;
    if (i.tipo === "revenda") caixa -= i.compra_valor;
    caixa -= i.gastos.reduce((s, g) => s + g.valor, 0);
  }
  return caixa;
}

export type Resumo = {
  caixaLivre: number;
  empatado: number;
  empatadoQtd: number;
  lucroRealizado: number;
  vendasRevenda: number;
  margemMedia: number | null; // fração 0..1
  giroMedio: number | null; // dias
  vendidos: number;
};

/**
 * Caixa e empatado são sempre a foto de agora. Lucro, margem, giro e vendidos
 * contam só as vendas com venda_data dentro do período (se informado).
 */
export function resumo(
  itens: ItemCalc[],
  r: Regras,
  periodo?: { de?: string | null; ate?: string | null },
): Resumo {
  const naoVendidos = itens.filter((i) => i.situacao !== "vendido");
  const noPeriodo = (d: string | null) =>
    !!d && (!periodo?.de || d >= periodo.de) && (!periodo?.ate || d <= periodo.ate);
  const vendidosRevenda = itens.filter(
    (i) => i.tipo === "revenda" && i.situacao === "vendido" && noPeriodo(i.venda_data),
  );

  const lucroRealizado = vendidosRevenda.reduce((s, i) => s + (lucroItem(i) ?? 0), 0);
  const vendasRevenda = vendidosRevenda.reduce((s, i) => s + (i.venda_valor ?? 0), 0);
  const dias = vendidosRevenda
    .filter((i) => i.compra_data && i.venda_data)
    .map((i) => diasEntre(i.compra_data!, i.venda_data!));

  return {
    caixaLivre: caixaLivre(itens, r),
    empatado: naoVendidos.reduce((s, i) => s + custoItem(i), 0),
    empatadoQtd: naoVendidos.length,
    lucroRealizado,
    vendasRevenda,
    margemMedia: vendasRevenda > 0 ? lucroRealizado / vendasRevenda : null,
    giroMedio: dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : null,
    vendidos: vendidosRevenda.length,
  };
}

/** Lucro realizado por mês (AAAA-MM), só revenda vendida. */
export function lucroPorMes(itens: ItemCalc[]): Map<string, number> {
  const meses = new Map<string, number>();
  for (const i of itens) {
    const l = lucroItem(i);
    if (l == null || !i.venda_data) continue;
    const mes = i.venda_data.slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0) + l);
  }
  return meses;
}
