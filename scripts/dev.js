import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * 打包开发环境
 *
 * node scripts/dev.js vue --format esm
 */

/**
 * 当前文件的绝对路径+文件名
 *
 * import.meta.url 表示：
 * 到此模块的完整 URL，包括查询参数和片段标识符（在 ? 和 # 之后）。
 * 在浏览器中，它是可获取此脚本的 URL（对外部脚本）或者是包含此脚本的文档的 URL（对内联脚本）。
 * 在 Node.js 中，它是文件路径（包括 file:// 协议部分）。
 * 所以下面的import.meta.url值为：  file:///Users/tylerzzheng/Code/VueProjects/vue-myvue/scripts/dev.js
 */
const __filename = fileURLToPath(import.meta.url)

/**
 * 当前文件的绝对路径
 *
 * dirname() 方法返回文件的 path 的目录名， 即去除文件名的部分
 */
const __dirname = dirname(__filename)

// 1. 解析命令行参数
const { values, positionals } = parseArgs({
  allowPositionals: true, // 接受位置参数
  options: {
    format: {
      type: 'string',
      short: 'f',
      default: 'esm',
    },
  },
})
console.log('要打包的模块', positionals)
console.log('打包的格式', values.format)

/**
 * 2. 确定要打的包，即target。
 * 如果传多个，只要第一个生效。没传则默认vue。
 * 不同点：源码里传多个是会依次打包的，target是数组，会遍历数组
 */
const target = positionals.length ? positionals[0] : 'vue'
console.log('确定最终要打的包: ', target)

const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)
console.log('dev.js--entry: ', entry)
