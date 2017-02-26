#! /usr/bin/env node
'use strict'

const Writable = require('readable-stream').Writable
const Redis = require('ioredis')
const Parse = require('fast-json-parse')
const split = require('split2')
const pump = require('pump')
const zlib = require('zlib')
const Promise = require('bluebird')

function compress(inflated) {
    var c = zlib.gzipSync(inflated).toString('binary')
    return Promise.resolve(c)
}

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
        write: function(body, enc, cb) {
            const ttl = body.ttl || 60
            const gzip = !!body.gzip
            const value = JSON.stringify(body)

            var setCache
            if (gzip) {
                setCache = compress(value).then(gzipped => redis.set(body.key, gzipped, 'EX', ttl))
            } else {
                setCache = redis.set(body.key, value, 'EX', ttl)
            }

            setCache.then(res => {
                if (res == 'OK') {
                    splitter.emit('insert', body)
                } else {
                    splitter.emit('insertError', res)
                }
                cb()
            })
        }
    })

    pump(splitter, writable)

    return splitter
}

module.exports = pinoRedis
