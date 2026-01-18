/**
 * useUpdateCommunities Hook
 *
 * Mutation to update communities after graph changes (incremental)
 */

import { trpc } from '@/lib/trpc';

export function useUpdateCommunities() {
  const utils = trpc.useUtils();

  return trpc.wikiCommunity.update.useMutation({
    onSuccess: () => {
      // Invalidate communities cache
      utils.wikiCommunity.list.invalidate();
    },
  });
}
