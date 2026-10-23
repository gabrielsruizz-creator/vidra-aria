import { describe, expect, it } from "vitest";

import { convertQuantity, fromBase, type UnitInfo } from "./units";

const mm: UnitInfo = { code: "mm", symbol: "mm", dimension: "comprimento", factorToBase: "0.001" };
const m: UnitInfo = { code: "m", symbol: "m", dimension: "comprimento", factorToBase: "1" };
const m2: UnitInfo = { code: "m2", symbol: "m²", dimension: "area", factorToBase: "1" };
const un: UnitInfo = { code: "un", symbol: "un", dimension: "unidade", factorToBase: "1" };
const cx: UnitInfo = { code: "cx", symbol: "cx", dimension: "unidade", factorToBase: "1" };

describe("unidades", () => {
  it("converte dentro da mesma dimensão sem erro de arredondamento", () => {
    expect(convertQuantity("1234", mm, m).toString()).toBe("1.234");
    expect(convertQuantity("0.1", m, mm).toString()).toBe("100");
    expect(fromBase("2.5", mm).toString()).toBe("2500");
  });

  it("não converte entre dimensões ou embalagens diferentes", () => {
    expect(() => convertQuantity(1, m, m2)).toThrow(/conversão direta/);
    expect(() => convertQuantity(1, un, cx)).toThrow(/conversão direta/);
    expect(convertQuantity(3, un, un).toString()).toBe("3");
  });
});
