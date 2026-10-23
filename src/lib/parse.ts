/**
 * Conversão de texto digitado pelo usuário (padrão brasileiro) para string
 * decimal canônica ("1234.56"), sem passar por `number`.
 *
 * Regras:
 *  - "1.234,56", "1234,56", "R$ 1.234,56" -> "1234.56"
 *  - "1234.5" (ponto único seguido de 1, 2 ou 4+ dígitos) -> "1234.5"
 *  - "1.234.567" (vários pontos, sem vírgula) -> "1234567"
 *  - "1.500" é ambíguo (1,5 ou 1500?) e é rejeitado.
 */
export class DecimalParseError extends Error {}

export function parseDecimalBR(raw: string): string {
  let s = raw.trim().replace(/^R\$\s*/i, "").replace(/%$/, "").replace(/\s/g, "");
  if (s === "") throw new DecimalParseError("Informe um valor.");
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) throw new DecimalParseError("Use apenas números, ponto e vírgula.");

  let normalized: string;
  if (s.includes(",")) {
    if (s.indexOf(",") !== s.lastIndexOf(",")) throw new DecimalParseError("Valor com mais de uma vírgula.");
    const [intPart, fracPart] = s.split(",");
    if (intPart.includes(".") && !/^\d{1,3}(\.\d{3})+$/.test(intPart)) {
      throw new DecimalParseError("Separador de milhar inválido.");
    }
    normalized = `${intPart.replace(/\./g, "") || "0"}.${fracPart}`;
  } else {
    const dots = (s.match(/\./g) ?? []).length;
    if (dots === 0) normalized = s;
    else if (dots > 1) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(s)) throw new DecimalParseError("Separador de milhar inválido.");
      normalized = s.replace(/\./g, "");
    } else {
      const [i, f] = s.split(".");
      if (f.length === 3) {
        throw new DecimalParseError("Valor ambíguo: use vírgula para decimais (ex.: 1,5) ou omita o ponto de milhar (ex.: 1500).");
      }
      normalized = `${i || "0"}.${f}`;
    }
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new DecimalParseError("Número inválido.");
  normalized = normalized.replace(/^0+(?=\d)/, "");
  if (normalized.endsWith(".")) normalized = normalized.slice(0, -1);
  return negative && !/^0(\.0+)?$/.test(normalized) ? `-${normalized}` : normalized;
}

/** Converte "1.234,56" para string sem erro (retorna null quando inválido). */
export function tryParseDecimalBR(raw: string): string | null {
  try {
    return parseDecimalBR(raw);
  } catch {
    return null;
  }
}

/** Remove máscara de documentos (CPF/CNPJ/CEP/telefone). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Valida CNPJ pelos dígitos verificadores. */
export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const total = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Valida CPF pelos dígitos verificadores. */
export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    let total = 0;
    for (let i = 0; i < len; i++) total += Number(d[i]) * (len + 1 - i);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}
