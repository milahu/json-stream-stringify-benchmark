import fs from "fs"
import path from "path"
import crypto from "crypto"

// NPM modules
import JSONStream from "JSONStream"
import bigJson from "big-json"
import { JsonStreamStringify } from 'json-stream-stringify';
import { stringifyJsonStream } from "json-stream-es";
import stream from "stream";
// import concatjson from "concatjson"
// import ndjson from "ndjson"

// https://github.com/microsoft/playwright/issues/36707
// `recordHar: { path: "requests.har", content: "attach" }`
// creates a smaller `requests.har` file (still can exceed 512MB in rare cases)
// with the attached files stored in the same directory

// const inputHarPath = "requests.split.har"
// const harObject = JSON.parse(fs.readFileSync(inputHarPath, "utf8"))
const harObject = {
  log: {
    entries: []
  }
}
// populate the harObject.log.entries array with random data
// 60 * 10MB = 600MB > 512MB
for (let i = 0; i < 60; i++) {
  const entry = {
    "startedDateTime": "2025-07-17T14:38:52.853Z",
    "time": 743.019,
    "request": {
      "method": "GET",
      "url": "https://example.com/page1?somekey=someval",
      "httpVersion": "HTTP/2.0",
      "cookies": [],
      "headers": [
      ],
      "queryString": [
        {
          "name": "somekey",
          "value": "someval"
        }
      ],
      "headersSize": 999,
      "bodySize": 0
    },
    "response": {
      "status": 200,
      "statusText": "",
      "httpVersion": "HTTP/2.0",
      "cookies": [
      ],
      "content": {
        "size": 999999,
        "mimeType": "text/html;charset=UTF-8",
        "compression": 0,
        // "_file": "0000000000000000000000000000000000000000.html"
        "text": crypto.randomBytes(10 * 1024 * 1024 / (4 / 3) | 0).toString('base64'), // 10MB
        "encoding": "base64"
      },
      "headersSize": 0,
      "bodySize": 999999,
      "redirectURL": "",
      "_transferSize": 999999
    },
    "cache": {},
    "timings": {
      "dns": 59.043,
      "connect": 272.799,
      "ssl": 256.649,
      "send": 0,
      "wait": 151.576,
      "receive": 2.952
    },
    "pageref": "page@00000000000000000000000000000000",
    "serverIPAddress": "1.2.3.4",
    "_serverPort": 443,
    "_securityDetails": {
      "protocol": "TLS 1.3",
      "subjectName": "example.com",
      "issuer": "Example RSA 2048 M01",
      "validFrom": 0,
      "validTo": 9999999999
    }
  }
  harObject.log.entries.push(entry)
}

// const outputHarPath = "test.har"

/*
const attachedFilesDir = path.dirname(inputHarPath)

// embed file contents
var t1 = Date.now()
// for (let entryIdx = 0; entryIdx < harObject.log.entries.length; entryIdx++) {
for (const entry of harObject.log.entries) {
  // const entry = harObject.log.entries[entryIdx]
  const attachedFile = entry.response?.content?._file
  if (!attachedFile) continue
  delete entry.response.content._file
  entry.response.content.text = fs.readFileSync(`${attachedFilesDir}/${attachedFile}`).toString("base64")
  entry.response.content.encoding = "base64"
}
var t2 = Date.now()
console.log(`embed file contents done after ${(t2 - t1) / 1000} seconds`)
*/

/*
// try to stringify
try {
  var t1 = Date.now()
  fs.writeFileSync('test.json', JSON.stringify(harObject))
  var t2 = Date.now()
  console.log(`JSON.stringify done after ${(t2 - t1) / 1000} seconds`)
}
catch (error) {
  var t2 = Date.now()
  console.log(`JSON.stringify fails after ${(t2 - t1) / 1000} seconds`)

  switch (error.constructor) {
    case RangeError:
*/

      // RangeError: Invalid string length
      // harObject is too big for JSON.stringify

      let streamJSONMethodList = [
        "JSON.stringify",
        "big-json",
        "json-stream-stringify",
        "json-stream-es",
        "har-json-stringify",
      ]

      // running all tests in one process disfavors the first method
      // following methods profit from a warm cache
      // run all methods with a cold cache:
      /*
      for x in JSON.stringify big-json json-stream-stringify json-stream-es har-json-stringify; do
        for y in {1..3}; do
          node json-stream-stringify-benchmark.js $x;
        done
      done
      */

      if (process.argv[2]) {
        streamJSONMethodList = [process.argv[2]]
      }

      for (const streamJSONMethod of streamJSONMethodList) {

        // console.log(`streamJSONMethod ${streamJSONMethod}`)

        // const outputHarPath = `test.${streamJSONMethod}.har`
        const outputHarPath = '/dev/null' // dont waste SSD writes

        var t1 = Date.now()
        let jsonStream = null
        let useJsonStream = true
        switch (streamJSONMethod) {
          case "JSON.stringify":
            useJsonStream = false
            var t1 = Date.now()
            try {
              fs.writeFileSync('test.json', JSON.stringify(harObject))
              var t2 = Date.now()
              console.log(`- JSON.stringify done after ${(t2 - t1) / 1000} seconds`)
            }
            catch (error) {
              var t2 = Date.now()
              console.log(`- JSON.stringify fails after ${(t2 - t1) / 1000} seconds`)
            }
            break
          case "JSONStream":
            // FIXME RangeError: Invalid string length
            // https://github.com/dominictarr/JSONStream
            // https://github.com/dominictarr/JSONStream/blob/master/test/stringify.js
            // https://www.reddit.com/r/node/comments/4vmloi/streaming_a_large_json_object_to_a_file_to_avoid/
            jsonStream = JSONStream.stringify()
            // const jsonStream = JSONStream.stringifyObject()
            for (var key in harObject) {
              jsonStream.write([key, harObject[key]])
            }
            jsonStream.end()
            /*
            jsonStream.pipe(fs.createWriteStream(outputHarPath))
            var t2 = Date.now()
            var outputSizeMB = fs.statSync(outputHarPath).size / 1024 / 1024
            console.log(`- ${streamJSONMethod} done after ${(t2 - t1) / 1000} seconds for ${outputSizeMB} MB`)
            */
            // no. this fails because harObject has only one key: harObject.log
            // and JSONStream does no recursive chunking
            /*
            var json = JSON.stringify(data, null, indent)
                            ^
            RangeError: Invalid string length
            */
            break
          case "big-json":
            // streamJSONMethod big-json done after 7.944 seconds for 679.522294998169 MB
            // https://github.com/DonutEspresso/big-json
            // slow? https://github.com/DonutEspresso/big-json/issues/24
            // slow? https://stackoverflow.com/questions/73947747/writing-big-json-stream-to-a-file-why-is-it-so-slow
            // https://github.com/DonutEspresso/big-json
            // https://stackoverflow.com/questions/73947747/writing-big-json-stream-to-a-file-why-is-it-so-slow
            jsonStream = bigJson.createStringifyStream({ body: harObject });
            break
          case "json-stream-stringify":
            // streamJSONMethod json-stream-stringify done after 3.967 seconds for 679.522294998169 MB
            // https://github.com/Faleij/json-stream-stringify
            // trailing ";" is required to fix: ReferenceError: Cannot access 'jsonStream' before initialization
            jsonStream = new JsonStreamStringify(harObject);
            break
          case "json-stream-es":
            useJsonStream = false
            var outputStream = fs.createWriteStream(outputHarPath)
            jsonStream = stringifyJsonStream(harObject);
            (jsonStream
              // TypeError: jsonStream.pipe is not a function
              // https://github.com/cdauth/json-stream-es/issues/5
              // .pipe(fs.createWriteStream(outputHarPath))
              .pipeTo(stream.Writable.toWeb(outputStream))
              // too early
              /*
              .then(() => {
                var t2 = Date.now()
                var outputSizeMB = fs.statSync(outputHarPath).size / 1024 / 1024
                console.log(`- ${streamJSONMethod} done after ${(t2 - t1) / 1000} seconds for ${outputSizeMB} MB`)
              })
              */
              .catch((error) => {
                throw error
              })
            )
            outputStream.on("close", function() {
              var t2 = Date.now()
              // FIXME get number of bytes written to /dev/null
              var outputSizeMB = fs.statSync(outputHarPath).size / 1024 / 1024
              console.log(`- ${streamJSONMethod} done after ${(t2 - t1) / 1000} seconds for ${outputSizeMB} MB`)
              // TODO resolve promise
            })
            break
          case "concatjson":
            // FIXME RangeError: Invalid string length
            // https://github.com/manidlou/concatjson
            jsonStream = concatjson.stringify()
            jsonStream.write(harObject)
            jsonStream.end()
            break
          case "ndjson":
            // WONTFIX only works for newline-delimited JSON
            // FIXME RangeError: Invalid string length
            // https://github.com/ndjson/ndjson.js
            jsonStream = ndjson.stringify()
            jsonStream.write(harObject)
            jsonStream.end()
            break
          case "har-json-stringify":
            // custom serializer for HAR format
            // streamJSONMethod har-json-stringify done after 2.176 seconds for 687.0114965438843 MB
            useJsonStream = false
            var outputStream = fs.createWriteStream(outputHarPath)
            outputStream.on("open", function() {
              // the only big part of the object is the array harObject.log.entries
              // so we remove it from harObject
              var harLogEntries = harObject.log.entries
              delete harObject.log.entries
              // stringify the rest with indent=2
              var harString = JSON.stringify(harObject, null, 2)
              // remove the trailing closing brace of harObject.log
              harString = harString.slice(0, -5)
              harString += ', "entries": [\n' // open harObject.log.entries
              outputStream.write(harString); harString = ""
              // add entries
              let isFirstEntry = true
              for (const entry of harLogEntries) {
                try {
                  harString = (isFirstEntry ? "" : ",\n") + JSON.stringify(entry, null, 2)
                  outputStream.write(harString); harString = ""
                }
                catch (error) {
                  switch (error.constructor) {
                    case RangeError:
                      // RangeError: Invalid string length
                      // entry is too big for JSON.stringify
                      outputStream.write(isFirstEntry ? "" : ",\n")
                      jsonStream = new JsonStreamStringify(entry);
                      // FIXME use Promise + await + async function
                      (jsonStream
                        .pipe(outputStream)
                        .on('finish', () => {
                          console.log('done JsonStreamStringify(entry)')
                        })
                        .on('error', (error) => {
                          console.log('Error at path', jsonStream.stack.join('.'))
                          throw error
                        })
                      )
                      break
                    default:
                      throw error
                  }
                }
                isFirstEntry = false
              }
              // harString += 'xxxxx\n'
              harString += ']\n' // close harObject.log.entries
              harString += '}\n' // close harObject.log
              harString += '}\n' // close harObject
              outputStream.write(harString); harString = ""
              outputStream.end()
              outputStream.close()
            })
            outputStream.on("close", function() {
              var t2 = Date.now()
              // FIXME get number of bytes written to /dev/null
              var outputSizeMB = fs.statSync(outputHarPath).size / 1024 / 1024
              console.log(`- ${streamJSONMethod} done after ${(t2 - t1) / 1000} seconds for ${outputSizeMB} MB`)
              // TODO resolve promise
            })
            break

          // case "node-ld-jsonstream":
          // https://github.com/timkuijsten/node-ld-jsonstream
          // no. only works with arrays -> line-delimited JSON

          // https://github.com/uhop/stream-json
          // no. JSON.parse only

          default:
            throw new Error(`unknown streamJSONMethod ${streamJSONMethod}`)
        }
        if (useJsonStream) {
          var outputStream = fs.createWriteStream(outputHarPath);
          (jsonStream
            .pipe(outputStream)
            // no, this is called too early
            /*
            .on('finish', () => {
              var t2 = Date.now()
              var outputSizeMB = fs.statSync(outputHarPath).size / 1024 / 1024
              console.log(`- ${streamJSONMethod} done after ${(t2 - t1) / 1000} seconds for ${outputSizeMB} MB`)
            })
            */
            .on('error', (error) => {
              if (streamJSONMethod == "json-stream-stringify") {
                console.log('Error at path', jsonStream.stack.join('.'))
              }
              throw error
            })
          );
          outputStream.on("close", function() {
            var t2 = Date.now()
            // FIXME get number of bytes written to /dev/null
            var outputSizeMB = fs.statSync(outputHarPath).size / 1024 / 1024
            console.log(`- ${streamJSONMethod} done after ${(t2 - t1) / 1000} seconds for ${outputSizeMB} MB`)
          })
        }
      }

/*
      break // case RangeError
    default:
      throw error
  }
}
*/
