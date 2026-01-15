/**
 * useCommunities Hook
 *
 * Fetch communities for a workspace or project
 */

import { trpc } from '@/lib/trpc'

interface UseCommunitiesOptions {
  workspaceId: number
  projectId?: number
  includeMembers?: boolean
  minMembers?: number
  limit?: number
}

export function useCommunities(options: UseCommunitiesOptions) {
  const { workspaceId, projectId, includeMembers = false, minMembers = 2, limit = 100 } = options

  return trpc.wikiCommunity.list.useQuery({
    workspaceId,
    projectId,
    includeMembers,
    minMembers,
    limit,
  })
}
