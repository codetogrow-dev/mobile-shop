import { useMemo } from 'react';
import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';

import type { PartyListPage } from '@/types/app';

/**
 * Thin wrapper around TanStack `useInfiniteQuery` for the
 * `{ rows, total_count, next_offset }` shape returned by our `*_list_page`
 * RPCs. Returns the flattened items, pagination flags, and the standard
 * fetch callbacks — caller can drop these straight into FlashList.
 */
export function usePaginatedList<T>(args: {
  queryKey: QueryKey;
  fetchPage: (offset: number, limit: number) => Promise<PartyListPage<T>>;
  pageSize?: number;
  enabled?: boolean;
}) {
  const pageSize = args.pageSize ?? 10;

  const query = useInfiniteQuery({
    queryKey: args.queryKey,
    queryFn: ({ pageParam = 0 }) => args.fetchPage(pageParam as number, pageSize),
    initialPageParam: 0,
    getNextPageParam: (last) => last.next_offset,
    enabled: args.enabled,
  });

  const items = useMemo(
    () => (query.data?.pages ?? []).flatMap((p) => p.rows),
    [query.data],
  );
  const totalCount = query.data?.pages[0]?.total_count ?? 0;

  return {
    items,
    totalCount,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error,
  };
}
