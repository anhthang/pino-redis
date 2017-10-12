const Writable = require('readable-stream').Writable
const Redis = require('ioredis')
const Parse = require('fast-json-parse')
const split = require('split2')
const pump = require('pump')
const zlib = require('zlib')
const minimist = require('minimist')
const fs = require('fs')
const path = require('path')

function pinoRedis(opts) {
    console.log('opts', opts)
    const splitter = split(function(line) {
        const parsed = new Parse(line)
        if (parsed.err) {
            this.emit('unknown', line, parsed.err)
            return
        }

        return parsed.value
    })

    const redis = new Redis(opts.connectionUrl)

    const writable = new Writable({
        objectMode: true,
        writev(chunks, cb) {
            const pipeline = redis.pipeline()
            chunks.forEach(item => {
                const body = item.chunk
                if (!body.key) throw new Error('key is required')

                const ttl = body.ttl || 60
                const gzip = !!body.gzip
                const value = JSON.stringify(body)

                const redisKey = `${body.level}:${body.key}`
                if (gzip) {
                    zlib.gzip(value, (c_err, buffer) => {
                        if (!c_err) {
                            pipeline.setex(redisKey, ttl, buffer.toString('binary'))
                        } else {
                            splitter.emit('insertError', c_err)
                        }
                    })
                } else {
                    pipeline.setex(redisKey, ttl, value)
                }

                pipeline.exec((err, result) => {
                    if (!err) {
                        result.forEach(res => {
                            if (!res[0]) {
                                splitter.emit('insert', body)
                            } else {
                                splitter.emit('insertError', res)
                            }
                        })
                    } else {
                        splitter.emit('insertError', err)
                    }
                    cb()
                })
            })
        },
        write(body, enc, cb) {
            if (!body.key) throw new Error('key is required')

            const ttl = body.ttl || 60
            const gzip = !!body.gzip
            const value = JSON.stringify(body)

            const redisKey = `${body.level}:${body.key}`
            if (gzip) {
                zlib.gzip(value, (c_err, buffer) => {
                    if (!c_err) {
                        redis.setex(redisKey, ttl, buffer.toString('binary'), (err, result) => {
                                if (!err) {
                                    splitter.emit('insert', body)
                                } else {
                                    splitter.emit('insertError', err)
                                }
                                cb()
                            }
                        )
                    } else {
                        splitter.emit('insertError', c_err)
                    }
                })
            } else {
                redis.setex(redisKey, ttl, value, (err, result) => {
                    if (!err) {
                        splitter.emit('insert', body)
                    } else {
                        splitter.emit('insertError', err)
                    }
                    cb()
                })
            }
        }
    })

    pump(splitter, writable)

    return splitter
}

module.exports = pinoRedis

function start(opts) {
    if (opts.help) {
        console.log(fs.readFileSync(path.join(__dirname, './options.txt'), 'utf8'))
        return
    }
    if (opts.version) {
        console.log('pino-redis', require('./package.json').version)
        return
    }

    pump(process.stdin, pinoRedis(opts))
}

if (require.main === module) {
    start(
        minimist(process.argv.slice(2), {
            alias: {
                version: 'v',
                help: 'h',
                connectionUrl: 'U'
            },
            default: {
                connectionUrl: 'redis://:@localhost:6379'
            }
        })
    )
}