import { writeFile } from 'node:fs/promises'
import { build } from 'esbuild'

const { outputFiles: [{ text: bundle }] } = await build({
  entryPoints: ['client.source.js'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['react', '@deepseek-ai/dsh-client-ui-primitives'],
  write: false,
})

const eol = String.fromCharCode(13, 10)
const body = bundle.split(/\r?\n/).map((line) => line.length ? `    ${line}` : '').join(eol)
const header = [
  'window.__ModuleLoader__.load({',
  "  id: 'dsh-model-manager',",
  '  factory: (require) => {',
  '    var module = { exports: {} }',
  '    var exports = module.exports',
].join(eol)
const footer = ['    return module.exports', '  },', '})'].join(eol)

await writeFile('client.js', [header, body, footer, ''].join(eol))
