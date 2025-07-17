#!/bin/sh

set -eu

for x in JSON.stringify big-json json-stream-stringify json-stream-es har-json-stringify; do
  for y in {1..3}; do
    node json-stream-stringify-benchmark.js $x
  done
done
