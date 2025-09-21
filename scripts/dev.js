import { parseArgs } from "node:util";


/**
 * 打包开发环境
 *
 * node scripts/dev.js --format esm
 */

const { values, positionals} = parseArgs({
  options: {
    format: {
      type: "string",
      short: "f",
      default: "esm",
    }
  }
})
console.log('dev.js.10..positionals: ', positionals);
console.log('dev.js.10..values: ', values.format);
console.log(process.argv)
