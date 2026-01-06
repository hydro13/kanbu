"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShardedAdapter = void 0;
const socket_io_adapter_1 = require("socket.io-adapter");
const notepack_io_1 = require("notepack.io");
const util_1 = require("./util");
const debug_1 = require("debug");
const debug = (0, debug_1.default)("socket.io-redis");
function looksLikeASocketId(room) {
    return typeof room === "string" && room.length === 20;
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
function createShardedAdapter(pubClient, subClient, opts) {
    return function (nsp) {
        return new ShardedRedisAdapter(nsp, pubClient, subClient, opts);
    };
}
exports.createShardedAdapter = createShardedAdapter;
class ShardedRedisAdapter extends socket_io_adapter_1.ClusterAdapter {
    constructor(nsp, pubClient, subClient, opts) {
        super(nsp);
        this.pubClient = pubClient;
        this.subClient = subClient;
        this.opts = Object.assign({
            channelPrefix: "socket.io",
            subscriptionMode: "dynamic",
        }, opts);
        this.channel = `${this.opts.channelPrefix}#${nsp.name}#`;
        this.responseChannel = `${this.opts.channelPrefix}#${nsp.name}#${this.uid}#`;
        const handler = (message, channel) => this.onRawMessage(message, channel);
        (0, util_1.SSUBSCRIBE)(this.subClient, this.channel, handler);
        (0, util_1.SSUBSCRIBE)(this.subClient, this.responseChannel, handler);
        if (this.opts.subscriptionMode === "dynamic" ||
            this.opts.subscriptionMode === "dynamic-private") {
            this.on("create-room", (room) => {
                if (this.shouldUseASeparateNamespace(room)) {
                    (0, util_1.SSUBSCRIBE)(this.subClient, this.dynamicChannel(room), handler);
                }
            });
            this.on("delete-room", (room) => {
                if (this.shouldUseASeparateNamespace(room)) {
                    (0, util_1.SUNSUBSCRIBE)(this.subClient, this.dynamicChannel(room));
                }
            });
        }
    }
    close() {
        const channels = [this.channel, this.responseChannel];
        if (this.opts.subscriptionMode === "dynamic" ||
            this.opts.subscriptionMode === "dynamic-private") {
            this.rooms.forEach((_sids, room) => {
                if (this.shouldUseASeparateNamespace(room)) {
                    channels.push(this.dynamicChannel(room));
                }
            });
        }
        return Promise.all(channels.map((channel) => (0, util_1.SUNSUBSCRIBE)(this.subClient, channel))).then();
    }
    doPublish(message) {
        const channel = this.computeChannel(message);
        debug("publishing message of type %s to %s", message.type, channel);
        return (0, util_1.SPUBLISH)(this.pubClient, channel, this.encode(message)).then(() => "");
    }
    computeChannel(message) {
        // broadcast with ack can not use a dynamic channel, because the serverCount() method return the number of all
        // servers, not only the ones where the given room exists
        const useDynamicChannel = message.type === socket_io_adapter_1.MessageType.BROADCAST &&
            message.data.requestId === undefined &&
            message.data.opts.rooms.length === 1 &&
            ((this.opts.subscriptionMode === "dynamic" &&
                !looksLikeASocketId(message.data.opts.rooms[0])) ||
                this.opts.subscriptionMode === "dynamic-private");
        if (useDynamicChannel) {
            return this.dynamicChannel(message.data.opts.rooms[0]);
        }
        else {
            return this.channel;
        }
    }
    dynamicChannel(room) {
        return this.channel + room + "#";
    }
    doPublishResponse(requesterUid, response) {
        debug("publishing response of type %s to %s", response.type, requesterUid);
        return (0, util_1.SPUBLISH)(this.pubClient, `${this.channel}${requesterUid}#`, this.encode(response)).then();
    }
    encode(message) {
        const mayContainBinary = [
            socket_io_adapter_1.MessageType.BROADCAST,
            socket_io_adapter_1.MessageType.BROADCAST_ACK,
            socket_io_adapter_1.MessageType.FETCH_SOCKETS_RESPONSE,
            socket_io_adapter_1.MessageType.SERVER_SIDE_EMIT,
            socket_io_adapter_1.MessageType.SERVER_SIDE_EMIT_RESPONSE,
        ].includes(message.type);
        // @ts-ignore
        if (mayContainBinary && (0, util_1.hasBinary)(message.data)) {
            return (0, notepack_io_1.encode)(message);
        }
        else {
            return JSON.stringify(message);
        }
    }
    onRawMessage(rawMessage, channel) {
        let message;
        try {
            if (rawMessage[0] === 0x7b) {
                message = JSON.parse(rawMessage.toString());
            }
            else {
                message = (0, notepack_io_1.decode)(rawMessage);
            }
        }
        catch (e) {
            return debug("invalid format: %s", e.message);
        }
        if (channel.toString() === this.responseChannel) {
            this.onResponse(message);
        }
        else {
            this.onMessage(message);
        }
    }
    serverCount() {
        return (0, util_1.PUBSUB)(this.pubClient, "SHARDNUMSUB", this.channel);
    }
    shouldUseASeparateNamespace(room) {
        const isPublicRoom = !this.sids.has(room);
        return ((this.opts.subscriptionMode === "dynamic" && isPublicRoom) ||
            this.opts.subscriptionMode === "dynamic-private");
    }
}
