export interface PageResult<T> {
  items: T[];
  totalPages: number;
}

export async function collectAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<PageResult<T>>,
  pageSize = 500,
): Promise<T[]> {
  const first = await fetchPage(1, pageSize);
  if (first.totalPages <= 1) return first.items;

  const remaining = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) => fetchPage(i + 2, pageSize))
  );

  return first.items.concat(...remaining.map(r => r.items));
}
