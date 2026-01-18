/**
 * useCommunityDetails Hook
 *
 * Fetch details for a single community with members
 */

import { trpc } from '@/lib/trpc';

export function useCommunityDetails(communityUuid: string | null | undefined) {
  return trpc.wikiCommunity.get.useQuery(
    {
      communityUuid: communityUuid!,
    },
    {
      enabled: !!communityUuid,
    }
  );
}
