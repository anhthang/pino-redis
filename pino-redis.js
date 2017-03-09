#! /usr/bin/env node
'use strict'

const Writable = require('readable-stream').Writable
const Redis = require('ioredis')
const Parse = require('fast-json-parse')
const split = require('split2')
const pump = require('pump')
const zlib = require('zlib')

function pinoRedis(opts) {
    const splitter = split(function(line) {
        var parsed = new Parse(line)
        if (parsed.err) {
            this.emit('unknown', line, parsed.err)
            return
        }

        return parsed.value
    })

    const redis = new Redis(opts.connectionUrl)

    const writable = new Writable({
        objectMode: true,
        writev: function(chunks, cb) {
            var pipeline = redis.pipeline()
            chunks.forEach(item => {
                var body = item.chunk
                if (!body.key) throw new Error('key is required')

                const ttl = body.ttl || 60
                const gzip = !!body.gzip
                const value = JSON.stringify(body)

                var redisKey = `${body.level}:${body.key}`
                if (gzip) {
                    zlib.gzip(value, (c_err, buffer) => {
                        if (!c_err) {
                            pipeline.set(redisKey, buffer.toString('binary'), 'EX', ttl)
                        } else {
                            splitter.emit('insertError', c_err)
                        }
                    })
                } else {
                    pipeline.set(redisKey, value, 'EX', ttl)
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
        write: function(body, enc, cb) {
            if (!body.key) throw new Error('key is required')

            const ttl = body.ttl || 60
            const gzip = !!body.gzip
            const value = JSON.stringify(body)

            var redisKey = `${body.level}:${body.key}`
            if (gzip) {
                zlib.gzip(value, (c_err, buffer) => {
                    if (!c_err) {
                        redis.set(redisKey, buffer.toString('binary'), 'EX', ttl, function(err, result) {
                            if (!err) {
                                splitter.emit('insert', body)
                            } else {
                                splitter.emit('insertError', err)
                            }
                            cb()
                        })
                    } else {
                        splitter.emit('insertError', c_err)
                    }
                })
            } else {
                redis.set(redisKey, value, 'EX', ttl, function(err, result) {
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
