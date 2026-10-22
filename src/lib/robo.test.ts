import { describe, expect, it } from "vitest";
import { categoriaMarketplace, condicaoMarketplace } from "./robo";

describe("categoriaMarketplace", () => {
  it("acha a categoria pela categoria do item ou pelo nome", () => {
    expect(categoriaMarketplace("Informática", "Notebook Dell")).toBe("Eletrônicos e computadores");
    expect(categoriaMarketplace(null, "iPhone 11 64GB")).toBe("Celulares");
    expect(categoriaMarketplace("", "Guarda-roupa 6 portas")).toBe("Móveis");
    expect(categoriaMarketplace("Ferramentas", "Furadeira Bosch")).toBe("Ferramentas");
    expect(categoriaMarketplace(null, "Geladeira Brastemp")).toBe("Eletrodomésticos");
  });
  it("sem pista vai em Diversos", () => {
    expect(categoriaMarketplace(null, "Coisa qualquer")).toBe("Diversos");
  });
});

describe("condicaoMarketplace", () => {
  it("usa o texto do Marketplace", () => {
    expect(condicaoMarketplace("bom")).toBe("Usado - Em bom estado");
    expect(condicaoMarketplace("")).toBeNull();
  });
});
