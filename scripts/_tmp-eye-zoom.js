/* 临时脚本：放大裁剪大立绘的眼睛区域，便于确认瞳孔/眼白/眼睑结构 */
const Jimp = require('jimp')

async function main() {
  const img = await Jimp.read(process.argv[2] || 'public/assets/xiaoyi_front.png')
  // 两只眼合并区域（含眼睑），四周多留一些
  const x = 250, y = 295, w = 170, h = 60
  const crop = img.clone().crop(x, y, w, h).resize(w * 6, h * 6, Jimp.RESIZE_NEAREST_NEIGHBOR)
  await crop.writeAsync('scripts/_tmp-eye-zoom.png')
  console.log('ok', w * 6, h * 6)
}
main().catch((e) => { console.error(e); process.exit(1) })
