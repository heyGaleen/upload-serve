const router = require('koa-router')()
const path = require('path')
const fse = require('fs-extra')

const UPLOAD_DIR = path.resolve(__dirname, '..', 'target')

router.prefix('/file')

const pipeStream = (path, writeStream) =>
  new Promise(resolve => {
   const readStream = fse.createReadStream(path);
   readStream.on("end", () => {
     fse.unlinkSync(path);
      resolve();
    });
    readStream.pipe(writeStream);
  });

// 获取文件后缀
const getFileSuffix = filename => {
  const idx = filename.lastIndexOf('.')
  return filename.slice(idx, filename.length)
}

const mergeFileChunk = async (filePath, fileHash, size) => {
  const chunkDir = path.resolve(UPLOAD_DIR, fileHash)
  const chunkPaths = await fse.readdir(chunkDir)
  chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1])
  await Promise.allSettled(chunkPaths.map((chunkPath, index) =>
    pipeStream(
      path.resolve(chunkDir, chunkPath),
      fse.createWriteStream(filePath, {
        start: index * size,
        end: (index + 1) * size
      })
    )
  ))
  fse.rmdirSync(chunkDir, { recursive: true })
}

router.post('/upload', async (ctx, next) => {
  const body = ctx.request.body
  const files = ctx.request.files
  const chunk = files.chunk
  const hash = body.hash
  const fileHash = body.fileHash
  const chunkDir = path.resolve(UPLOAD_DIR, fileHash)
  // 切片目录不存在，创建切片目录
  if (!fse.existsSync(chunkDir)) {
    await fse.mkdirs(chunkDir)
  }
  await fse.move(`${chunk.path}`, `${chunkDir}/${hash}`)
  ctx.body = { code: 0, msg: 'received file chunk' }
})

router.post('/merge', async (ctx, next) => {
  const { size, fileHash, filename } = ctx.request.body
  const suffix = getFileSuffix(filename)
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${suffix}`)
  await mergeFileChunk(filePath, fileHash, size)
  ctx.body = {
    code: 0,
    msg: 'file merged success'
  }
})

module.exports = router
