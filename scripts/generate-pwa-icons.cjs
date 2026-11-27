const fs = require("node:fs")
const path = require("node:path")
const zlib = require("node:zlib")

function crc32(buffer) {
  let crc = 0xffffffff
  for (const b of buffer) {
    crc ^= b
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const label = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([label, data])))
  return Buffer.concat([length, label, data, crc])
}
function createIcon(size) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  const set = (x, y, r, g, b) => {
    const at = y * stride + 1 + x * 4
    raw[at] = r; raw[at + 1] = g; raw[at + 2] = b; raw[at + 3] = 255
  }
  const inside = (x, y, left, top, right, bottom) => x >= left && x < right && y >= top && y < bottom
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      set(x, y, 16, 24, 39)
      const margin = Math.floor(size * .075)
      const radius = size * .19
      const lx = Math.max(margin + radius - x, 0, x - (size - margin - radius))
      const ly = Math.max(margin + radius - y, 0, y - (size - margin - radius))
      if (x >= margin && x < size - margin && y >= margin && y < size - margin && lx * lx + ly * ly < radius * radius) {
        set(x, y, 234, 88, 12)
        const a = size * .32, b = size * .69, top = size * .27, bot = size * .73, thick = size * .075
        if (inside(x,y,a,top,a + thick,bot) ||
            inside(x,y,a,top,b,top+thick) ||
            inside(x,y,a,size*.465,b-size*.06,size*.465+thick) ||
            inside(x,y,a,bot-thick,b,bot)) set(x,y,255,255,255)
      }
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(raw,{level:9})),chunk("IEND",Buffer.alloc(0))])
  const dir = path.join(__dirname, "..", "public", "icons")
  fs.mkdirSync(dir, {recursive:true})
  fs.writeFileSync(path.join(dir, `garcom-${size}.png`), png)
}
createIcon(192)
createIcon(512)
