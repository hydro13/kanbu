/// <reference types="node" />
export declare function hasBinary(obj: any, toJSON?: boolean): boolean;
export declare function parseNumSubResponse(res: any): number;
export declare function sumValues(values: any): any;
export declare function SSUBSCRIBE(redisClient: any, channel: string, handler: (rawMessage: Buffer, channel: Buffer) => void): void;
export declare function SUNSUBSCRIBE(redisClient: any, channel: string | string[]): void;
/**
 * @see https://redis.io/commands/spublish/
 */
export declare function SPUBLISH(redisClient: any, channel: string, payload: string | Uint8Array): any;
export declare function PUBSUB(redisClient: any, arg: string, channel: string): any;
