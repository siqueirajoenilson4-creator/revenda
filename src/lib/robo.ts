// Robô do Marketplace: a extensão do Chrome (pasta extensao-robo/) publica o
// anúncio no Facebook do dono, no navegador dele, já logado. O site e a extensão
// conversam por window.postMessage: o site manda o anúncio pronto e a extensão
// devolve o andamento e o link publicado. Nada de senha guardada.

import { rotuloEstado, type EstadoConservacao } from "./anuncios";

/** Quem manda a mensagem: o site ou a extensão. */
export const DO_SITE = "revenda-site";
export const DO_ROBO = "revenda-robo";

/** Marca que a extensão põe no <html> (data-robo-revenda="versão"). */
export const MARCA_ROBO = "roboRevenda";

export type PedidoRobo = {
  anuncioId: string;
  titulo: string;
  descricao: string;
  /** Só o número em reais, como o campo do Marketplace pede ("1800"). */
  preco: string;
  /** Como aparece no Marketplace ("Usado - Em bom estado"). */
  condicao: string | null;
  /** Categoria do Marketplace mais próxima da categoria do item. */
  categoria: string;
  /** Links assinados das fotos, na ordem (a primeira é a capa). */
  fotos: string[];
};

export type MensagemSite =
  | { origem: typeof DO_SITE; tipo: "publicar"; pedido: PedidoRobo }
  | { origem: typeof DO_SITE; tipo: "recebido"; id: string };

export type MensagemRobo =
  | { origem: typeof DO_ROBO; tipo: "andamento"; anuncioId: string; texto: string; erro?: boolean }
  | { origem: typeof DO_ROBO; tipo: "publicado"; id: string; anuncioId: string; link: string | null };

/** Categorias do Marketplace (itens à venda) e palavras que levam a cada uma. */
const CATEGORIAS: [string, RegExp][] = [
  ["Celulares", /celular|smartphone|iphone|galaxy|xiaomi|motorola/],
  ["Eletrônicos e computadores", /notebook|computador|\bpc\b|monitor|eletr[oô]nic|tablet|ipad|tv|televis|som|caixa de som|fone|c[aâ]mera|impressora|inform[aá]tica/],
  ["Videogames", /videogame|video game|playstation|\bps[2-5]\b|xbox|nintendo|console/],
  ["Eletrodomésticos", /geladeira|fog[aã]o|microondas|micro-ondas|lava|m[aá]quina de lavar|freezer|ar condicionado|ventilador|eletrodom/],
  ["Móveis", /m[oó]ve(l|is)|sof[aá]|mesa|cadeira|guarda-roupa|arm[aá]rio|cama|rack|estante|c[oô]moda/],
  ["Ferramentas", /ferrament|furadeira|serra|parafusadeira|esmerilhadeira|compressor|gerador/],
  ["Bicicletas", /bicicleta|bike/],
  ["Peças automotivas", /pe[cç]a|moto|carro|pneu|roda|capacete|autope|automot/],
  ["Esportes e atividades ao ar livre", /esporte|academia|pesca|camping|patins|skate/],
  ["Instrumentos musicais", /instrumento|viol[aã]o|guitarra|teclado|bateria musical|baixo/],
  ["Brinquedos e jogos", /brinquedo|jogo/],
  ["Bebês e crianças", /beb[eê]|carrinho|ber[cç]o|infantil|crian[cç]a/],
  ["Utensílios domésticos", /utens[ií]lio|cozinha|panela|lou[cç]a|decora/],
  ["Jardim", /jardim|cortador de grama|ro[cç]adeira/],
];

/** Categoria do Marketplace para o item. Sem pista, vai em "Diversos". */
export function categoriaMarketplace(...textos: (string | null | undefined)[]): string {
  const t = textos.filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
  return CATEGORIAS.find(([, re]) => re.test(t))?.[0] ?? "Diversos";
}

export function condicaoMarketplace(e: EstadoConservacao | "" | null | undefined): string | null {
  return e ? rotuloEstado(e) : null;
}
