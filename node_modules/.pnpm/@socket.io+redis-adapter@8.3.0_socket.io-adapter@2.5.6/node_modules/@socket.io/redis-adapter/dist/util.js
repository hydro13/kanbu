"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBSUB = exports.SPUBLISH = exports.SUNSUBSCRIBE = exports.SSUBSCRIBE = exports.sumValues = exports.parseNumSubResponse = exports.hasBinary = void 0;
function hasBinary(obj, toJSON) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    if (obj instanceof ArrayBuffer || ArrayBuffer.isView(obj)) {
        return true;
    }
    if (Array.isArray(obj)) {
        for (let i = 0, l = obj.length; i < l; i++) {
            if (hasBinary(obj[i])) {
                return true;
            }
        }
        return false;
    }
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
            return true;
        }
    }
    if (obj.toJSON && typeof obj.toJSON === "function" && !toJSON) {
        return hasBinary(obj.toJSON(), true);
    }
    return false;
}
exports.hasBinary = hasBinary;
function parseNumSubResponse(res) {
    return parseInt(res[1], 10);
}
exports.parseNumSubResponse = parseNumSubResponse;
function sumValues(values) {
    return values.reduce((acc, val) => {
        return acc + val;
    }, 0);
}
exports.sumValues = sumValues;
const RETURN_BUFFERS = true;
/**
 * Whether the client comes from the `redis` package
 *
 * @param redisClient
 *
 * @see https://github.com/redis/node-redis
 */
function isRedisV4Client(redisClient) {
    return typeof redisClient.sSubscribe === "function";
}
const kHandlers = Symbol("handlers");
function SSUBSCRIBE(redisClient, channel, handler) {
    if (isRedisV4Client(redisClient)) {
        redisClient.sSubscribe(channel, handler, RETURN_BUFFERS);
    }
    else {
        if (!redisClient[kHandlers]) {
            redisClient[kHandlers] = new Map();
            redisClient.on("smessageBuffer", (rawChannel, message) => {
                var _a;
                (_a = redisClient[kHandlers].get(rawChannel.toString())) === null || _a === void 0 ? void 0 : _a(message, rawChannel);
            });
        }
        redisClient[kHandlers].set(channel, handler);
        redisClient.ssubscribe(channel);
    }
}
exports.SSUBSCRIBE = SSUBSCRIBE;
function SUNSUBSCRIBE(redisClient, channel) {
    if (isRedisV4Client(redisClient)) {
        redisClient.sUnsubscribe(channel);
    }
    else {
        redisClient.sunsubscribe(channel);
        if (Array.isArray(channel)) {
            channel.forEach((c) => redisClient[kHandlers].delete(c));
        }
        else {
            redisClient[kHandlers].delete(channel);
        }
    }
}
exports.SUNSUBSCRIBE = SUNSUBSCRIBE;
/**
 * @see https://redis.io/commands/spublish/
 */
function SPUBLISH(redisClient, channel, payload) {
    if (isRedisV4Client(redisClient)) {
        return redisClient.sPublish(channel, payload);
    }
    else {
        return redisClient.spublish(channel, payload);
    }
}
exports.SPUBLISH = SPUBLISH;
function PUBSUB(redisClient, arg, channel) {
    if (redisClient.constructor.name === "Cluster" || redisClient.isCluster) {
        // ioredis cluster
        return Promise.all(redisClient.nodes().map((node) => {
            return node
                .send_command("PUBSUB", [arg, channel])
                .then(parseNumSubResponse);
        })).then(sumValues);
    }
    else if (isRedisV4Client(redisClient)) {
        const isCluster = Array.isArray(redisClient.masters);
        if (isCluster) {
            // redis@4 cluster
            const nodes = redisClient.masters;
            return Promise.all(nodes.map((node) => {
                return node.client
                    .sendCommand(["PUBSUB", arg, channel])
                    .then(parseNumSubResponse);
            })).then(sumValues);
        }
        else {
            // redis@4 standalone
            return redisClient
                .sendCommand(["PUBSUB", arg, channel])
                .then(parseNumSubResponse);
        }
    }
    else {
        // ioredis / redis@3 standalone
        return new Promise((resolve, reject) => {
            redisClient.send_command("PUBSUB", [arg, channel], (err, numSub) => {
                if (err)
                    return reject(err);
                resolve(parseNumSubResponse(numSub));
            });
        });
    }
}
exports.PUBSUB = PUBSUB;
