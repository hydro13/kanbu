/**
 * useDetectCommunities Hook
 *
 * Mutation to detect communities using Label Propagation algorithm
 */

import { trpc } from '@/lib/trpc'

export function useDetectCommunities() {
  const utils = trpc.useUtils()

  return trpc.wikiCommunity.detect.useMutation({
    onSuccess: () => {
      // Invalidate communities cache
      utils.wikiCommunity.list.invalidate()
    },
  })
}
