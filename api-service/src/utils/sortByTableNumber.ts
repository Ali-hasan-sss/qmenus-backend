/** Natural / numeric sort for table labels so "2" comes before "10". */
export function compareTableNumbers(a: string, b: string): number {
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortByTableNumber<T extends { tableNumber: string }>(
  items: T[]
): T[] {
  if (items.length <= 1) return items;
  return [...items].sort((x, y) =>
    compareTableNumbers(x.tableNumber, y.tableNumber)
  );
}
