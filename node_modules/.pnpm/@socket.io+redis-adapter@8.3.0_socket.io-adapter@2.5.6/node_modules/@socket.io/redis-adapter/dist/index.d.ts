import { Adapter, BroadcastOptions, Room } from "socket.io-adapter";
interface Parser {
    decode: (msg: any) => any;
    encode: (msg: any) => any;
}
export interface RedisAdapterOptions {
    /**
     * the name of the key to pub/sub events on as prefix
     * @default socket.io
     */
    key: string;
    /**
     * after this timeout the adapter will stop waiting from responses to request
     * @default 5000
     */
    requestsTimeout: number;
    /**
     * Whether to publish a response to the channel specific to the requesting node.
     *
     * - if true, the response will be published to `${key}-request#${nsp}#${uid}#`
     * - if false, the response will be published to `${key}-request#${nsp}#`
     *
     * This option currently defaults to false for backward compatibility, but will be set to true in the next major
     * release.
     *
     * @default false
     */
    publishOnSpecificResponseChannel: boolean;
    /**
     * The parser to use for encoding and decoding messages sent to Redis.
     * This option defaults to using `notepack.io`, a MessagePack implementation.
     */
    parser: Parser;
}
/**
 * Returns a function that will create a RedisAdapter instance.
 *
 * @param pubClient - a Redis client that will be used to publish messages
 * @param subClient - a Redis client that will be used to receive messages (put in subscribed state)
 * @param opts - additional options
 *
 * @public
 */
export declare function createAdapter(pubClient: any, subClient: any, opts?: Partial<RedisAdapterOptions>): (nsp: any) => RedisAdapter;
export declare class RedisAdapter extends Adapter {
    readonly pubClient: any;
    readonly subClient: any;
    readonly uid: any;
    readonly requestsTimeout: number;
    readonly publishOnSpecificResponseChannel: boolean;
    readonly parser: Parser;
    private readonly channel;
    private readonly requestChannel;
    private readonly responseChannel;
    private readonly specificResponseChannel;
    private requests;
    private ackRequests;
    private redisListeners;
    private readonly friendlyErrorHandler;
    /**
     * Adapter constructor.
     *
     * @param nsp - the namespace
     * @param pubClient - a Redis client that will be used to publish messages
     * @param subClient - a Redis client that will be used to receive messages (put in subscribed state)
     * @param opts - additional options
     *
     * @public
     */
    constructor(nsp: any, pubClient: any, subClient: any, opts?: Partial<RedisAdapterOptions>);
    /**
     * Called with a subscription message
     *
     * @private
     */
    private onmessage;
    private hasRoom;
    /**
     * Called on request from another node
     *
     * @private
     */
    private onrequest;
    /**
     * Send the response to the requesting node
     * @param request
     * @param response
     * @private
     */
    private publishResponse;
    /**
     * Called on response from another node
     *
     * @private
     */
    private onresponse;
    /**
     * Broadcasts a packet.
     *
     * @param {Object} packet - packet to emit
     * @param {Object} opts - options
     *
     * @public
     */
    broadcast(packet: any, opts: BroadcastOptions): void;
    broadcastWithAck(packet: any, opts: BroadcastOptions, clientCountCallback: (clientCount: number) => void, ack: (...args: any[]) => void): void;
    /**
     * Gets the list of all rooms (across every node)
     *
     * @public
     */
    allRooms(): Promise<Set<Room>>;
    fetchSockets(opts: BroadcastOptions): Promise<any[]>;
    addSockets(opts: BroadcastOptions, rooms: Room[]): void;
    delSockets(opts: BroadcastOptions, rooms: Room[]): void;
    disconnectSockets(opts: BroadcastOptions, close: boolean): void;
    serverSideEmit(packet: any[]): void;
    private serverSideEmitWithAck;
    serverCount(): Promise<number>;
    close(): Promise<void> | void;
}
export { createShardedAdapter } from "./sharded-adapter";
