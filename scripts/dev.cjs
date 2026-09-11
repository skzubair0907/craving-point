const { spawn } = require('node:child_process')
const path = require('node:path')
const net = require('node:net')
const root = path.resolve(__dirname, '..')
try { process.loadEnvFile?.(path.join(root, '.env')) } catch {}
const children = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
  process.exitCode = code
}
function occupied(port, host) {
  return new Promise(resolve => {
    const socket = net.connect({port, host})
    const done = value => { socket.destroy(); resolve(value) }
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
    socket.setTimeout(1500, () => done(false))
  })
}
async function start() {
  const apiPort = Number(process.env.API_PORT || 8787)
  const [apiBusy, web4, web6] = await Promise.all([
    occupied(apiPort, '127.0.0.1'), occupied(5173, '127.0.0.1'), occupied(5173, '::1'),
  ])
  if (apiBusy || web4 || web6) {
    console.log('A server is already using ' + [apiBusy ? 'API port ' + apiPort : '', web4 || web6 ? 'website port 5173' : ''].filter(Boolean).join(' and ') + '.')
    if (web4 || web6) console.log('Open http://localhost:5173/ and refresh the browser.')
    console.log('No duplicate servers were started. To restart, press Ctrl+C in the existing dev terminal, then run npm run dev once.')
    process.exitCode = 1
    return
  }
  for (const args of [['api/server.cjs'], ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)]]) {
    if (stopping) break
    const child = spawn(process.execPath, args, {cwd: root, stdio:'inherit', windowsHide:true})
    children.push(child)
    child.on('error', error => {console.error(error.message); stop(1)})
    child.on('exit', code => stop(code || 0))
  }
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
void start().catch(error => {console.error(error.message); stop(1)})
