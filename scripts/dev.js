import { parseArgs } from 'node:util'

/**
 * 打包开发环境
 *
 * node scripts/dev.js --format esm
 */

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
console.log('dev.js.28..target: ', target)
