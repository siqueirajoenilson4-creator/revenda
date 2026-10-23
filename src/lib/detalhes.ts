// Ficha do anúncio por tipo de produto: cada tipo pede os dados que o comprador
// procura (moto: ano, km, documento; celular: armazenamento, bateria...). Fica em
// revenda.anuncios.tipo e .detalhes (jsonb). Vira texto do anúncio pelo gerador
// e pela IA (lib/ia-anuncio.ts).

export type Campo =
  | { id: string; rotulo: string; tipo: "texto"; exemplo?: string; sufixo?: string }
  | { id: string; rotulo: string; tipo: "numero"; exemplo?: string; sufixo?: string }
  | { id: string; rotulo: string; tipo: "escolha"; opcoes: string[] }
  | { id: string; rotulo: string; tipo: "simnao" };

const marca = (exemplo: string): Campo => ({ id: "marca", rotulo: "Marca", tipo: "texto", exemplo });
const modelo = (exemplo: string): Campo => ({ id: "modelo", rotulo: "Modelo", tipo: "texto", exemplo });
const cor: Campo = { id: "cor", rotulo: "Cor", tipo: "texto", exemplo: "Preta" };
const ano: Campo = { id: "ano", rotulo: "Ano", tipo: "numero", exemplo: "2012" };
const acompanha = (exemplo: string): Campo => ({ id: "acompanha", rotulo: "Acompanha", tipo: "texto", exemplo });
const defeitos: Campo = { id: "defeitos", rotulo: "Detalhes ou defeitos", tipo: "texto", exemplo: "Risco leve na lateral" };
const garantia: Campo = { id: "garantia", rotulo: "Garantia", tipo: "texto", exemplo: "90 dias da loja" };
const voltagem: Campo = { id: "voltagem", rotulo: "Voltagem", tipo: "escolha", opcoes: ["110 V", "220 V", "Bivolt"] };

const DOCUMENTO: Campo[] = [
  { id: "documento", rotulo: "Documento", tipo: "escolha", opcoes: ["Em dia", "Atrasado", "Com débitos", "Sem documento"] },
  { id: "ipva", rotulo: "IPVA do ano pago", tipo: "simnao" },
  { id: "transferencia", rotulo: "Pronta para transferir", tipo: "simnao" },
  { id: "final_placa", rotulo: "Final da placa", tipo: "numero", exemplo: "7" },
  { id: "unico_dono", rotulo: "Único dono", tipo: "simnao" },
  { id: "manual_chave", rotulo: "Manual e chave reserva", tipo: "simnao" },
];

export const TIPOS = [
  {
    id: "moto",
    rotulo: "Moto",
    campos: [
      marca("Honda"),
      modelo("CB 300R"),
      ano,
      { id: "km", rotulo: "Quilometragem", tipo: "numero", exemplo: "35000", sufixo: "km" },
      { id: "cilindrada", rotulo: "Cilindrada", tipo: "numero", exemplo: "300", sufixo: "cc" },
      { id: "combustivel", rotulo: "Combustível", tipo: "escolha", opcoes: ["Gasolina", "Flex", "Elétrica"] },
      { id: "partida", rotulo: "Partida", tipo: "escolha", opcoes: ["Elétrica", "Pedal", "Elétrica e pedal"] },
      { id: "freio", rotulo: "Freios", tipo: "escolha", opcoes: ["Disco", "Tambor", "Disco e tambor", "ABS"] },
      cor,
      ...DOCUMENTO,
      { id: "revisoes", rotulo: "Manutenção recente", tipo: "texto", exemplo: "Óleo, relação e pneus novos" },
      defeitos,
    ],
  },
  {
    id: "carro",
    rotulo: "Carro",
    campos: [
      marca("Volkswagen"),
      modelo("Gol 1.0"),
      ano,
      { id: "km", rotulo: "Quilometragem", tipo: "numero", exemplo: "120000", sufixo: "km" },
      { id: "motor", rotulo: "Motor", tipo: "texto", exemplo: "1.0" },
      { id: "cambio", rotulo: "Câmbio", tipo: "escolha", opcoes: ["Manual", "Automático", "Automatizado", "CVT"] },
      { id: "combustivel", rotulo: "Combustível", tipo: "escolha", opcoes: ["Flex", "Gasolina", "Etanol", "Diesel", "GNV", "Híbrido", "Elétrico"] },
      { id: "portas", rotulo: "Portas", tipo: "escolha", opcoes: ["2", "4"] },
      { id: "opcionais", rotulo: "Opcionais", tipo: "texto", exemplo: "Ar, direção, vidro e trava elétricos" },
      cor,
      ...DOCUMENTO,
      { id: "revisoes", rotulo: "Manutenção recente", tipo: "texto", exemplo: "Correia dentada trocada" },
      defeitos,
    ],
  },
  {
    id: "celular",
    rotulo: "Celular",
    campos: [
      marca("Apple"),
      modelo("iPhone 11"),
      { id: "armazenamento", rotulo: "Armazenamento", tipo: "texto", exemplo: "128 GB" },
      { id: "ram", rotulo: "Memória RAM", tipo: "texto", exemplo: "4 GB" },
      { id: "bateria", rotulo: "Saúde da bateria", tipo: "numero", exemplo: "86", sufixo: "%" },
      cor,
      { id: "desbloqueado", rotulo: "Desbloqueado para qualquer operadora", tipo: "simnao" },
      { id: "tela", rotulo: "Tela", tipo: "escolha", opcoes: ["Perfeita", "Riscos leves", "Trincada"] },
      { id: "biometria", rotulo: "Face ID / digital funcionando", tipo: "simnao" },
      acompanha("Carregador e capinha"),
      { id: "nota_fiscal", rotulo: "Nota fiscal", tipo: "simnao" },
      garantia,
      defeitos,
    ],
  },
  {
    id: "computador",
    rotulo: "Notebook / computador",
    campos: [
      marca("Dell"),
      modelo("Inspiron 15 3511"),
      { id: "processador", rotulo: "Processador", tipo: "texto", exemplo: "Intel Core i5 11ª geração" },
      { id: "ram", rotulo: "Memória RAM", tipo: "texto", exemplo: "8 GB" },
      { id: "armazenamento", rotulo: "Armazenamento", tipo: "texto", exemplo: "SSD 256 GB" },
      { id: "tela", rotulo: "Tela", tipo: "texto", exemplo: "15,6\" Full HD" },
      { id: "placa_video", rotulo: "Placa de vídeo", tipo: "texto", exemplo: "Integrada" },
      { id: "bateria", rotulo: "Bateria", tipo: "texto", exemplo: "Nova, dura 4 horas" },
      { id: "sistema", rotulo: "Sistema", tipo: "texto", exemplo: "Windows 11 ativado" },
      acompanha("Carregador original"),
      { id: "upgrades", rotulo: "Peças trocadas", tipo: "texto", exemplo: "SSD e bateria novos" },
      garantia,
      defeitos,
    ],
  },
  {
    id: "eletronico",
    rotulo: "TV, som, videogame e outros eletrônicos",
    campos: [
      marca("Samsung"),
      modelo("Smart TV 50\" Crystal UHD"),
      { id: "especificacao", rotulo: "Especificação principal", tipo: "texto", exemplo: "50 polegadas, 4K" },
      voltagem,
      { id: "funcionando", rotulo: "Tudo funcionando", tipo: "simnao" },
      acompanha("Controle e base"),
      { id: "nota_fiscal", rotulo: "Nota fiscal", tipo: "simnao" },
      garantia,
      defeitos,
    ],
  },
  {
    id: "eletrodomestico",
    rotulo: "Eletrodoméstico",
    campos: [
      marca("Brastemp"),
      modelo("Frost Free 375 L"),
      { id: "capacidade", rotulo: "Capacidade / tamanho", tipo: "texto", exemplo: "375 litros" },
      voltagem,
      { id: "medidas", rotulo: "Medidas", tipo: "texto", exemplo: "1,70 × 0,60 m" },
      cor,
      { id: "funcionando", rotulo: "Tudo funcionando", tipo: "simnao" },
      defeitos,
    ],
  },
  {
    id: "movel",
    rotulo: "Móvel",
    campos: [
      { id: "material", rotulo: "Material", tipo: "texto", exemplo: "MDF" },
      { id: "medidas", rotulo: "Medidas", tipo: "texto", exemplo: "2,00 × 1,80 × 0,50 m" },
      cor,
      { id: "montado", rotulo: "Vai montado", tipo: "simnao" },
      { id: "pecas", rotulo: "Portas / gavetas / lugares", tipo: "texto", exemplo: "6 portas e 2 gavetas" },
      defeitos,
    ],
  },
  {
    id: "ferramenta",
    rotulo: "Ferramenta",
    campos: [
      marca("Bosch"),
      modelo("GSB 13 RE"),
      { id: "potencia", rotulo: "Potência", tipo: "texto", exemplo: "650 W" },
      voltagem,
      acompanha("Maleta e brocas"),
      { id: "funcionando", rotulo: "Tudo funcionando", tipo: "simnao" },
      defeitos,
    ],
  },
  {
    id: "bicicleta",
    rotulo: "Bicicleta",
    campos: [
      marca("Caloi"),
      modelo("Explorer"),
      { id: "aro", rotulo: "Aro", tipo: "escolha", opcoes: ["12", "16", "20", "24", "26", "27,5", "29", "700"] },
      { id: "quadro", rotulo: "Tamanho do quadro", tipo: "texto", exemplo: "17 (M)" },
      { id: "marchas", rotulo: "Marchas", tipo: "texto", exemplo: "21 (Shimano)" },
      { id: "freio", rotulo: "Freios", tipo: "escolha", opcoes: ["V-brake", "Disco mecânico", "Disco hidráulico"] },
      { id: "suspensao", rotulo: "Suspensão", tipo: "escolha", opcoes: ["Sem", "Dianteira", "Full"] },
      cor,
      defeitos,
    ],
  },
  {
    id: "outro",
    rotulo: "Outro",
    campos: [marca(""), modelo(""), { id: "medidas", rotulo: "Medidas / tamanho", tipo: "texto" }, cor, acompanha(""), defeitos],
  },
] as const satisfies readonly { id: string; rotulo: string; campos: Campo[] }[];

export type TipoProduto = (typeof TIPOS)[number]["id"];
export type Detalhes = Record<string, string>;

export const ehTipo = (v: unknown): v is TipoProduto => TIPOS.some((t) => t.id === v);
export const camposDoTipo = (t: TipoProduto | "" | null | undefined): readonly Campo[] =>
  TIPOS.find((x) => x.id === t)?.campos ?? [];

/** Tipo provável pelo nome e pela categoria do item (o dono pode trocar). */
export function adivinharTipo(...textos: (string | null | undefined)[]): TipoProduto | "" {
  const t = textos.filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
  if (!t.trim()) return "";
  if (/\bmoto\b|motocicleta|\bcb ?\d|\bcg ?\d|titan|fan\b|biz\b|xre|factor|fazer|yamaha|honda (cb|cg|xre|biz|pop|bros)|scooter|\bbros\b/.test(t)) return "moto";
  if (/\bcarro\b|autom[oó]vel|\bgol\b|\buno\b|palio|celta|corsa|onix|\bhb20\b|fiesta|\bka\b|sedan|hatch|pick-?up|caminhonete/.test(t)) return "carro";
  if (/celular|smartphone|iphone|galaxy|redmi|xiaomi|moto g|motorola/.test(t)) return "celular";
  if (/notebook|computador|\bpc\b|desktop|macbook|ultrabook|chromebook/.test(t)) return "computador";
  if (/geladeira|fog[aã]o|micro-?ondas|lava|freezer|ar condicionado|ventilador|eletrodom/.test(t)) return "eletrodomestico";
  if (/\btv\b|televis|som|caixa de som|videogame|playstation|xbox|nintendo|monitor|tablet|c[aâ]mera|fone|eletr[oô]nic/.test(t)) return "eletronico";
  if (/m[oó]ve(l|is)|sof[aá]|mesa|cadeira|guarda-roupa|arm[aá]rio|cama|rack|estante|c[oô]moda/.test(t)) return "movel";
  if (/ferrament|furadeira|serra|parafusadeira|esmerilhadeira|compressor|gerador|lixadeira/.test(t)) return "ferramenta";
  if (/bicicleta|\bbike\b/.test(t)) return "bicicleta";
  return "outro";
}

/** Só os campos do tipo, sem vazios, com texto curto (o que vai para o banco). */
export function limparDetalhes(tipo: TipoProduto | "" | null, bruto: unknown): Detalhes {
  const d: Detalhes = {};
  if (!tipo || typeof bruto !== "object" || bruto == null) return d;
  for (const c of camposDoTipo(tipo)) {
    const v = (bruto as Record<string, unknown>)[c.id];
    if (typeof v !== "string") continue;
    const s = v.replace(/\s+/g, " ").trim().slice(0, 200);
    if (!s) continue;
    if (c.tipo === "simnao" && s !== "sim" && s !== "nao") continue;
    if (c.tipo === "escolha" && !c.opcoes.includes(s)) continue;
    d[c.id] = s;
  }
  return d;
}

/** Ficha em linhas "Rótulo: valor", na ordem do tipo (para a descrição e para a IA). */
export function fichaTexto(tipo: TipoProduto | "" | null, d: Detalhes): string[] {
  return camposDoTipo(tipo).flatMap((c) => {
    const v = d[c.id];
    if (!v) return [];
    if (c.tipo === "simnao") return [`${c.rotulo}: ${v === "sim" ? "sim" : "não"}`];
    const suf = "sufixo" in c && c.sufixo ? (c.sufixo === "%" ? "%" : ` ${c.sufixo}`) : "";
    return [`${c.rotulo}: ${v}${suf}`];
  });
}
