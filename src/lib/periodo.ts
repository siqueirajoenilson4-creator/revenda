// Períodos do painel. Datas AAAA-MM-DD; o "hoje" vem sempre de São Paulo.

export type PeriodoId = "mes" | "3m" | "ano" | "tudo";

export const PERIODOS: { id: PeriodoId; rotulo: string }[] = [
  { id: "mes", rotulo: "Este mês" },
  { id: "3m", rotulo: "3 meses" },
  { id: "ano", rotulo: "Este ano" },
  { id: "tudo", rotulo: "Tudo" },
];

/** Primeiro dia de n meses atrás (0 = mês atual). */
export function inicioMes(hoje: string, n = 0): string {
  const [y, m] = hoje.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 10);
}

export function periodo(id: PeriodoId, hoje: string): { de: string | null; ate: string | null } {
  switch (id) {
    case "mes": return { de: inicioMes(hoje), ate: null };
    case "3m": return { de: inicioMes(hoje, 2), ate: null };
    case "ano": return { de: `${hoje.slice(0, 4)}-01-01`, ate: null };
    default: return { de: null, ate: null };
  }
}

/** Soma (ou subtrai) dias a uma data AAAA-MM-DD. */
export function somarDias(data: string, n: number): string {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Segunda-feira de n semanas atrás (0 = semana atual). */
export function inicioSemana(hoje: string, n = 0): string {
  const [y, m, d] = hoje.split("-").map(Number);
  const desdeSegunda = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return somarDias(hoje, -desdeSegunda - 7 * n);
}

/** Lista de meses AAAA-MM de `inicio` a `fim`, inclusive. */
export function mesesEntre(inicio: string, fim: string): string[] {
  const lista: string[] = [];
  let [y, m] = inicio.split("-").map(Number);
  const [yf, mf] = fim.split("-").map(Number);
  while (y < yf || (y === yf && m <= mf)) {
    lista.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) { m = 1; y++; }
  }
  return lista;
}
