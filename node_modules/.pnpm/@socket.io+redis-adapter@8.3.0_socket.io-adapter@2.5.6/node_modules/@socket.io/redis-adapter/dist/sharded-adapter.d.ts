import { ClusterAdapter, ClusterMessage, ClusterResponse, Offset } from "socket.io-adapter";
export interface ShardedRedisAdapterOptions {
    /**
     * The prefix for the Redis Pub/Sub channels.
     *
     * @default "socket.io"
     */
    channelPrefix?: string;
    /**
     * The subscription mode impacts the number of Redis Pub/Sub channels:
     *
     * - "static": 2 channels per namespace
     *
     * Useful when used with dynamic namespaces.
     *
     * - "dynamic": (2 + 1 per public room) channels per namespace
     *
     * The default value, useful when some rooms have a low number of clients (so only a few Socket.IO servers are notified).
     *
     * Only public rooms (i.e. not related to a particular Socket ID) are taken in account, because:
     * - a lot of connected clients would mean a lot of subscription/unsubscription
     * - the Socket ID attribute is ephemeral
     *
     * - "dynamic-private"
     *
     * Like "dynamic" but creates separate channels for private rooms as well. Useful when there is lots of 1:1 communication
     * via socket.emit() calls.
     *
     * @default "dynamic"
     */
    subscriptionMode?: "static" | "dynamic" | "dynamic-private";
}
/**
 * Create a new Adapter based on Redis sharded Pub/Sub introduced in Redis 7.0.
 *
 * @see https://redis.io/docs/manual/pubsub/#sharded-pubsub
 *
 * @param pubClient - the Redis client used to publish (from the `redis` package)
 * @param subClient - the Redis client used to subscribe (from the `redis` package)
 * @param opts - some additional options
 */
export declare function createShardedAdapter(pubClient: any, subClient: any, opts?: ShardedRedisAdapterOptions): (nsp: any) => ShardedRedisAdapter;
declare class ShardedRedisAdapter extends ClusterAdapter {
    private readonly pubClient;
    private readonly subClient;
    private readonly opts;
    private readonly channel;
    private readonly responseChannel;
    constructor(nsp: any, pubClient: any, subClient: any, opts: ShardedRedisAdapterOptions);
    close(): Promise<void> | void;
    doPublish(message: ClusterMessage): Promise<Offset>;
    private computeChannel;
    private dynamicChannel;
    doPublishResponse(requesterUid: string, response: ClusterResponse): Promise<void>;
    private encode;
    private onRawMessage;
    serverCount(): Promise<number>;
    private shouldUseASeparateNamespace;
}
export {};
