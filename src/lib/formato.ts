// Dinheiro (centavos ↔ texto em R$) e datas no fuso de São Paulo.

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlSemCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function reais(centavos: number | null | undefined, semCentavos = false): string {
  if (centavos == null) return "—";
  const v = centavos / 100;
  return semCentavos && centavos % 100 === 0 ? brlSemCentavos.format(v) : brl.format(v);
}

/** Valor para preencher um campo de texto: 1234,5 → "1234,50"; 1200 → "1200". */
export function paraCampo(centavos: number | null | undefined): string {
  if (centavos == null) return "";
  return centavos % 100 === 0
    ? String(centavos / 100)
    : (centavos / 100).toFixed(2).replace(".", ",");
}

/**
 * Lê o que a pessoa digitou e devolve centavos, ou null se vazio/inválido.
 * Aceita "1.234,56", "1234,56", "1234.56", "1.500" (mil e quinhentos), "R$ 80".
 */
export function lerReais(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  let t = texto.replace(/R\$|\s/g, "").trim();
  if (!t) return null;
  const negativo = t.startsWith("-");
  if (negativo) t = t.slice(1);
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const c = Math.round(parseFloat(t) * 100);
  return negativo ? -c : c;
}

/** Número decimal simples (km, %). Aceita vírgula. */
export function lerNumero(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  const t = texto.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function pctTexto(fracao: number | null, casas = 1): string {
  if (fracao == null) return "—";
  return (fracao * 100).toFixed(casas).replace(".", ",") + "%";
}

export const FUSO = "America/Sao_Paulo";

/** Data de hoje (AAAA-MM-DD) em São Paulo. */
export function hoje(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

/** AAAA-MM-DD → DD/MM/AAAA */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** AAAA-MM → "out/26" */
export function mesCurto(anoMes: string): string {
  const [y, m] = anoMes.split("-");
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`;
}
