import { spawn } from "node:child_process";

const server = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "inherit"] });

let buf = "";
const pending = new Map();
let id = 0;

function send(method, params) {
  return new Promise((resolve) => {
    const myId = ++id;
    pending.set(myId, resolve);
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
  });
}

server.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      console.error("[non-JSON from server]:", line.slice(0, 120));
      continue;
    }
    if (msg.id != null && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

const tool = process.argv[2];
const args = process.argv[3] ? JSON.parse(process.argv[3]) : {};

const init = await send("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "call-tool", version: "1.0" },
});
console.error("Connected:", init.result.serverInfo.name, init.result.serverInfo.version);

const res = await send("tools/call", { name: tool, arguments: args });
const text = res.result?.content?.[0]?.text ?? JSON.stringify(res.result, null, 2);
console.log(`\n=== ${tool}(${JSON.stringify(args)}) ===`);
console.log(text);

server.kill();
process.exit(0);
