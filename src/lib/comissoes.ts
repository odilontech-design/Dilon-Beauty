/**
 * Percentual que vale pra um atendimento: o do serviço quando ele tem um
 * próprio, senão o do profissional. Existe pro caso comum de pagar menos em
 * serviço onde o salão banca o produto (coloração) do que em mão de obra pura.
 */
export function percentualComissao(
  professionalPct: number,
  servicePct: number | null | undefined
): number {
  return servicePct ?? professionalPct ?? 0;
}

export function calcularComissao(
  price: number,
  professionalPct: number,
  servicePct: number | null | undefined
): number {
  const pct = percentualComissao(professionalPct, servicePct);
  if (!pct || pct <= 0) return 0;
  // Arredonda em centavos: comissão é dinheiro que vai ser pago, não pode
  // carregar fração de centavo pro relatório.
  return Math.round(price * (pct / 100) * 100) / 100;
}
