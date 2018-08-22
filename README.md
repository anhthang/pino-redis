# pino-redis

Load [pino](https://github.com/pinojs/pino) logs into [Redis](https://redis.io).

[![npm](https://flat.badgen.net/npm/v/pino-redis)](https://npmjs.com/package/pino-redis) ![download](https://flat.badgen.net/npm/dt/pino-redis) ![dependents](https://flat.badgen.net/npm/dependents/pino-redis)

## Install

```
npm install pino-redis
```

## Usage

Write logs into redis

```
node my-app.js | pino-redis [options]
```

```javascript
var pinoRedis = require('pino-redis')({
    connectionUrl: `your redis connection url`
})

var pino   = require('pino')
var logger = pino(pinoRedis)

var message = 'load pino logs into redis',
    meta = {ttl: 60, key: 'redis:pino', child: 'logger'}

logger.info(meta, message)

```

## Options

```
Usage: pino-redis [options]

  Load pino logs into Redis

  Options:

    -h, --help                      output usage information
    -V, --version                   output the version number
    -U, --connectionUrl <url>       redis connection url
```
## .pino([meta], message)

### Parameters:
+ `meta` (object)
    * `key` (string): Required. Key will hold the string value.
    * `ttl` (number): Set `key` to timeout after a given number of seconds. Default `60`
    * `gzip` (boolean): Use gzip to compress before log into redis. Default `false`

## License

Licensed under [MIT](./LICENSE).
