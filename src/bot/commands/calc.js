const logger = require('../../logger')

const ALLOWED_FUNCTIONS = new Set([
  'sqrt', 'cbrt', 'abs', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'log', 'log10', 'log2', 'exp', 'ceil', 'floor',
  'round', 'pow', 'pi', 'e',
])

module.exports = {
  name: 'calc',
  desc: 'Evaluate a mathematical expression without JavaScript eval',
  async run({ args, reply }) {
    const expression = args.join(' ').trim()
    const symbols = expression.match(/[a-z]+/gi) || []
    if (
      !expression
      || expression.length > 120
      || !/^[\dA-Za-z\s.+*/^%(),!-]+$/.test(expression)
      || symbols.some((symbol) => !ALLOWED_FUNCTIONS.has(symbol.toLowerCase()))
    ) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .calc <𝟤^𝟣𝟢 + sqrt(𝟣𝟦𝟦) * 𝟥>')
    }

    try {
      const endpoint = new URL('https://api.mathjs.org/v4/')
      endpoint.searchParams.set('expr', expression)
      const response = await fetch(endpoint, {
        headers: { accept: 'text/plain' },
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) throw new Error(`Math.js returned HTTP ${response.status}.`)

      const result = (await response.text()).trim()
      if (!result || result.length > 200 || /^(?:Error|SyntaxError)/i.test(result)) {
        throw new Error(`Math.js could not evaluate the expression: ${result.slice(0, 120)}`)
      }
      return await reply([
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐌ᴀᴛʜ 𝐄ɴɢɪɴᴇ',
        '│',
        `│ ✦ 𝐄xᴘʀᴇssɪᴏɴ: ${expression}`,
        `│ ✦ 𝐑ᴇsᴜʟᴛ: ${result}`,
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
      ].join('\n'))
    } catch (error) {
      logger.warn({ expression, err: error.message }, 'math expression evaluation failed')
      return await reply('> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ᴇᴠᴀʟᴜᴀᴛᴇ ᴛʜɪs ᴇxᴘʀᴇssɪᴏɴ.')
    }
  },
}
