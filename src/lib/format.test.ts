import { describe, expect, it } from "vitest";

import {
  addDaysISO,
  diffDaysISO,
  formatCnpj,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatQuantity,
  todayISO,
} from "./format";

describe("formatação pt-BR", () => {
  it("formata moeda BRL sem perda de precisão", () => {
    expect(formatCurrency("1234.5")).toBe("R$ 1.234,50");
    expect(formatCurrency("0")).toBe("R$ 0,00");
    expect(formatCurrency("-15.255")).toBe("-R$ 15,26");
    expect(formatCurrency("123456789012345.67")).toBe("R$ 123.456.789.012.345,67");
    expect(formatCurrency(null)).toBe("—");
  });

  it("não exibe zero negativo", () => {
    expect(formatCurrency("-0.001")).toBe("R$ 0,00");
  });

  it("formata números, quantidades e percentuais", () => {
    expect(formatNumber("1000000")).toBe("1.000.000,00");
    expect(formatQuantity("2.500")).toBe("2,5");
    expect(formatQuantity("3")).toBe("3");
    expect(formatPercent("12.5")).toBe("12,50%");
  });

  it("formata datas sem deslocamento de fuso", () => {
    expect(formatDate("2026-03-05")).toBe("05/03/2026");
    expect(formatDate(null)).toBe("—");
    // 02:00 UTC ainda é dia 04 em Brasília (UTC-3)
    expect(formatDateTime("2026-03-05T02:00:00Z")).toBe("04/03/2026, 23:00");
    expect(todayISO(new Date("2026-03-05T02:00:00Z"))).toBe("2026-03-04");
  });

  it("calcula datas de calendário", () => {
    expect(addDaysISO("2026-02-27", 2)).toBe("2026-03-01");
    expect(diffDaysISO("2026-01-01", "2026-03-01")).toBe(59);
  });

  it("formata CNPJ", () => {
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});
