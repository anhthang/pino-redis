# pino-redis

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

## License

Licensed under [MIT](./LICENSE).
