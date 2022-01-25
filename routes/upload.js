const router = require('koa-router')()
const path = require('path')
const fse = require('fs-extra')

const UPLOAD_DIR = path.resolve(__dirname, '..', 'target')

router.prefix('/file')

router.post('/upload', async function (ctx, next) {
  const body = ctx.request.body
  const files = ctx.request.files
  const chunk = files.chunk
  const hash = body.hash
  const filename = body.filename
  const chunkDir = path.resolve(UPLOAD_DIR, filename)

  // 切片目录不存在，创建切片目录
  if (!fse.existsSync(chunkDir)) {
    await fse.mkdirs(chunkDir)
  }
  await fse.move(`${chunk.path}`, `${chunkDir}/${hash}`)
  ctx.body = { code: 0, msg: 'success' }
})

module.exports = router
