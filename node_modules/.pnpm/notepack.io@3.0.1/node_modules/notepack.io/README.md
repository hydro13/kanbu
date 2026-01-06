# notepack

[![Build Status](https://github.com/darrachequesne/notepack/workflows/CI/badge.svg?branch=main)](https://github.com/darrachequesne/notepack/actions)

A fast [Node.js](http://nodejs.org) implementation of the latest [MessagePack](http://msgpack.org) [spec](https://github.com/msgpack/msgpack/blob/master/spec.md).

## Notes

* `undefined` is encoded as `nil`
* `Date` objects are encoded following the [Timestamp extension](https://github.com/msgpack/msgpack/blob/master/spec.md#timestamp-extension-type), e.g. `new Date('2000-06-13T00:00:00.000Z')` => `<Buffer d6 ff 39 45 79 80>`
* `ArrayBuffer` are encoded as `bin`, e.g. `Uint8Array.of(1, 2, 3, 4)` => `<Buffer c4 04 01 02 03 04>`

## Install

```
npm install notepack.io
```

## Usage

```js
const notepack = require('notepack.io');

const encoded = notepack.encode({ foo: 'bar'}); // <Buffer 81 a3 66 6f 6f a3 62 61 72>
const decoded = notepack.decode(encoded); // { foo: 'bar' }
```

## Browser

A browser version of notepack is also available (2.0 kB minified/gzipped)

```html
<script src="https://unpkg.com/notepack.io@2.3.0/dist/notepack.min.js"></script>
<script>
  console.log(notepack.decode(notepack.encode([1, '2', new Date()])));
  // [1, "2", Thu Dec 08 2016 00:00:01 GMT+0100 (CET)]
</script>
```

## Common questions

### How to encode custom types?

This library does not currently support [extension types](https://github.com/msgpack/msgpack/blob/master/spec.md#extension-types). That being said, you can create a `toJSON()` method on your object, which will be used when encoding:

```js
class MyClass {
  toJSON() {
    return 42;
  }
}
```

### How to handle BigInt values?

You can use the `toJSON()` method:

```js
// always as string
BigInt.prototype.toJSON = function () {
  return String(this);
};

// or either as string or number, depending on the value
BigInt.prototype.toJSON = function () {
  var isSafeNumber = Number.MIN_SAFE_INTEGER <= this && this <= Number.MAX_SAFE_INTEGER;
  return isSafeNumber ? Number(this) : String(this);
};
```

### Handle to handle ES6 Set and Map values?

Again, `toJSON()` to the rescue:

```js
// convert the set to an array
// example: Set(3) { 1, 2, 3 } into [ 1, 2, 3 ]
Set.prototype.toJSON = function () {
  return [...this];
}

// convert the map to an array of array
// example: Map(2) { 1 => '2', '3' => 4 } into [ [ 1, '2' ], [ '3', 4 ] ]
Map.prototype.toJSON = function () {
  return [...this];
}
```

## Performance

Performance is currently comparable to msgpack-node (which presumably needs optimizing and suffers from JS-native overhead) and is significantly faster than other implementations. Several micro-optimizations are used to improve the performance of short string and Buffer operations.

The `./benchmarks/run` output on my machine is:

```
$ node -v
v12.15.0
$ ./benchmarks/run
Encoding (this will take a while):
+----------------------------+-------------------+-----------------+----------------+---------------+
|                            │ tiny              │ small           │ medium         │ large         |
+----------------------------+-------------------+-----------------+----------------+---------------+
| notepack                   │ 2,187,481 ops/sec │ 510,581 ops/sec │ 39,187 ops/sec │ 231 ops/sec   |
+----------------------------+-------------------+-----------------+----------------+---------------+
| msgpack-js                 │ 111,209 ops/sec   │ 95,346 ops/sec  │ 9,896 ops/sec  │ 121 ops/sec   |
+----------------------------+-------------------+-----------------+----------------+---------------+
| msgpack-lite               │ 524,993 ops/sec   │ 195,466 ops/sec │ 18,269 ops/sec │ 242 ops/sec   |
+----------------------------+-------------------+-----------------+----------------+---------------+
| @msgpack/msgpack           │ 723,885 ops/sec   │ 292,447 ops/sec │ 30,438 ops/sec │ 80.26 ops/sec |
+----------------------------+-------------------+-----------------+----------------+---------------+
| JSON.stringify (to Buffer) │ 1,359,120 ops/sec │ 335,024 ops/sec │ 15,721 ops/sec │ 25.97 ops/sec |
+----------------------------+-------------------+-----------------+----------------+---------------+
Decoding (this will take a while):
+--------------------------+-------------------+-----------------+----------------+---------------+
|                          │ tiny              │ small           │ medium         │ large         |
+--------------------------+-------------------+-----------------+----------------+---------------+
| notepack                 │ 3,165,012 ops/sec │ 642,348 ops/sec │ 32,173 ops/sec │ 249 ops/sec   |
+--------------------------+-------------------+-----------------+----------------+---------------+
| msgpack-js               │ 1,255,151 ops/sec │ 280,944 ops/sec │ 24,396 ops/sec │ 243 ops/sec   |
+--------------------------+-------------------+-----------------+----------------+---------------+
| msgpack-lite             │ 667,059 ops/sec   │ 144,927 ops/sec │ 11,922 ops/sec │ 175 ops/sec   |
+--------------------------+-------------------+-----------------+----------------+---------------+
| @msgpack/msgpack         │ 1,760,026 ops/sec │ 353,698 ops/sec │ 18,816 ops/sec │ 45.68 ops/sec |
+--------------------------+-------------------+-----------------+----------------+---------------+
| JSON.parse (from Buffer) │ 1,750,845 ops/sec │ 407,212 ops/sec │ 24,999 ops/sec │ 35.77 ops/sec |
+--------------------------+-------------------+-----------------+----------------+---------------+
* Note that JSON is provided as an indicative comparison only
```
## License

MIT
