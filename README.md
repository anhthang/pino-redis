# pino-redis&nbsp;&nbsp;[![npm version](https://badge.fury.io/js/pino-redis.svg)](https://badge.fury.io/js/pino-redis)

Load [pino](https://github.com/pinojs/pino) logs into [Redis](https://redis.io).

## Install

```
npm install pino-redis
```

## Usage

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

## .pino([meta], message)

### Parameters:
+ `meta` (object)
    * `key` (string): Required. Key will hold the string value.
    * `ttl` (number): Set `key` to timeout after a given number of seconds. Default `60`
    * `gzip` (boolean): Use gzip to compress before log into redis. Default `false`

## License

Licensed under [MIT](./LICENSE).
