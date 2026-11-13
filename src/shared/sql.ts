// Monta o "SET ..." de um UPDATE só com os campos que vieram na requisição.
// Os nomes das colunas vêm do código e os valores vão como parâmetros ($1, $2...), o que evita SQL injection.
export function buildUpdateSet<T extends object>(
  data: T,
  columns: { [K in keyof T]-?: string },
): { assignments: string[]; values: unknown[] } {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const key of Object.keys(columns) as (keyof T)[]) {
    const value = data[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${columns[key]} = $${values.length}`);
  }

  return { assignments, values };
}
