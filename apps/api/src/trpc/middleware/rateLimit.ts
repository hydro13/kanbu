import { TRPCError } from '@trpc/server'
import { middleware } from '../router'
import { rateLimitService } from '../../services/rateLimitService'

// Rate limit for Assistant requests: 100 req/min
const ASSISTANT_RATE_LIMIT = 100

export const rateLimitMiddleware = middleware(async ({ ctx, next }) => {
    if (ctx.assistantContext) {
        const key = `binding:${ctx.assistantContext.bindingId}`
        if (!rateLimitService.check(key, ASSISTANT_RATE_LIMIT)) {
            throw new TRPCError({
                code: 'TOO_MANY_REQUESTS',
                message: 'Rate limit exceeded for Assistant binding',
            })
        }
    }
    return next()
})
