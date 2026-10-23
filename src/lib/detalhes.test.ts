import { describe, expect, it } from "vitest";
import { adivinharTipo, fichaTexto, limparDetalhes } from "./detalhes";

describe("adivinharTipo", () => {
  it("acha o tipo pelo nome ou pela categoria", () => {
    expect(adivinharTipo("Honda CB300R", "Moto")).toBe("moto");
    expect(adivinharTipo("Notebook Dell Inspiron", null)).toBe("computador");
    expect(adivinharTipo("iPhone 11 128GB", null)).toBe("celular");
    expect(adivinharTipo("Geladeira Brastemp", null)).toBe("eletrodomestico");
    expect(adivinharTipo("Coisa", null)).toBe("outro");
    expect(adivinharTipo("", null)).toBe("");
  });
});

describe("limparDetalhes", () => {
  it("guarda só campos do tipo, opções válidas e sem vazios", () => {
    expect(
      limparDetalhes("moto", { ano: " 2012 ", km: "", documento: "Em dia", ipva: "talvez", partida: "Foguete", nada: "x" }),
    ).toEqual({ ano: "2012", documento: "Em dia" });
    expect(limparDetalhes(null, { ano: "2012" })).toEqual({});
  });
});

describe("fichaTexto", () => {
  it("monta as linhas na ordem do tipo, com unidade e sim/não", () => {
    expect(fichaTexto("moto", { km: "35000", marca: "Honda", ipva: "sim" })).toEqual([
      "Marca: Honda",
      "Quilometragem: 35000 km",
      "IPVA do ano pago: sim",
    ]);
  });
});
