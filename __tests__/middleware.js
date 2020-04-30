const request = require('supertest')
const crypto = require('crypto')
const assert = require('assert')
const Koa = require('koa')

const compress = require('..')

let server

afterEach(() => server && server.close())

describe('Accept-Encodings', () => {
  const fixtures = [
    {
      acceptEncoding: 'gzip',
      preferredEncoding: 'gzip'
    },
    {
      acceptEncoding: 'gzip, identity',
      preferredEncoding: 'gzip'
    },
    {
      acceptEncoding: 'br, gzip',
      preferredEncoding: 'br'
    },
    {
      acceptEncoding: 'identity',
      preferredEncoding: undefined
    }
  ]

  fixtures.forEach(({ acceptEncoding, preferredEncoding }) => {
    test(`When ${acceptEncoding} should return ${preferredEncoding}`, async () => {
      const app = new Koa()
      app.use(compress())
      app.use(async (ctx) => {
        ctx.body = await crypto.randomBytes(2048).toString('base64')
      })

      server = app.listen()

      const res = await request(server)
        .get('/')
        .set('Accept-Encoding', acceptEncoding)
        .expect(200)

      assert.strictEqual(res.headers['content-encoding'], preferredEncoding)
    })
  })
})

describe('Subsequent requests', () => {
  test('accept-encoding: "gzip, deflate, br", then "gzip"', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(async (ctx) => {
      ctx.body = await crypto.randomBytes(2048).toString('base64')
    })
    server = app.listen()

    const res1 = await request(server)
      .get('/')
      .set('Accept-Encoding', 'gzip, deflate, br')
      .expect(200)
    expect(res1.headers['content-encoding']).toBe('br')

    const res2 = await request(server)
      .get('/')
      .set('Accept-Encoding', 'gzip')
      .expect(200)

    expect(res2.headers['content-encoding']).toBe('gzip')
  })
})
