# json-stream-stringify-benchmark

create JSON strings larger than [512MB](https://github.com/nodejs/node/issues/35973) in javascript

## libraries

- [big-json](https://github.com/DonutEspresso/big-json)
- [json-stream-stringify](https://github.com/Faleij/json-stream-stringify)
- [json-stream-es](https://github.com/cdauth/json-stream-es)
- `har-json-stringify` is a custom serializer for [HAR](http://www.softwareishard.com/blog/har-12-spec/) data.
  surprisingly, this is slower than the general-purpose solutions

### excluded libraries

- [JSONStream](https://github.com/dominictarr/JSONStream) - throws `RangeError: Invalid string length`
- [concatjson](https://github.com/manidlou/concatjson) - throws `RangeError: Invalid string length`
- [ndjson](https://github.com/ndjson/ndjson.js) - only works for [newline-delimited JSON](https://en.wikipedia.org/wiki/Line_Delimited_JSON)
- [stream-json](https://github.com/uhop/stream-json) - `JSON.parse` only

## result

- JSON.stringify fails after 1.052 seconds
- big-json done after 1.52 seconds
- json-stream-stringify done after 1.917 seconds
- json-stream-es done after 2.076 seconds
- har-json-stringify done after 2.048 seconds

## todo

- also verify correct JSON output by piping to [jq](https://github.com/jqlang/jq)
- benchmark different types of data, for example [deeply-nested arrays](https://github.com/DonutEspresso/big-json/issues/24)
