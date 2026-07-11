import { writeFileSync } from "node:fs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((target) => target.type === "page") || targets[0];
if (!page?.webSocketDebuggerUrl) {
  throw new Error("No debuggable Chrome page was found.");
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
});

function send(method, params = {}) {
  id += 1;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result?.value;
}

await send("Runtime.enable");
await send("Page.enable");
await send("Storage.clearDataForOrigin", {
  origin: "http://127.0.0.1:5173",
  storageTypes: "all"
});
await send("Page.navigate", { url: "http://127.0.0.1:5173/?cdp=3d-diver-verify" });
await sleep(1800);

const before = await evaluate(`(() => {
  const app = document.getElementById("app");
  const canvas = document.getElementById("ocean");
  const rect = canvas.getBoundingClientRect();
  return {
    boot: app.dataset.boot,
    frame: app.dataset.frame,
    error: app.dataset.error,
    canvas: { width: canvas.width, height: canvas.height, cssWidth: Math.round(rect.width), cssHeight: Math.round(rect.height) },
    className: app.className
  };
})()`);

await evaluate(`document.getElementById("beginExpedition").click()`);
await sleep(1700);
await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" })); window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));`);
await sleep(900);
await evaluate(`window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" })); window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));`);
await sleep(800);

const after = await evaluate(`(() => {
  const app = document.getElementById("app");
  return {
    boot: app.dataset.boot,
    frame: app.dataset.frame,
    error: app.dataset.error,
    className: app.className,
    depth: document.getElementById("coordDepth").textContent,
    biome: document.getElementById("biomeName").textContent,
    x: document.getElementById("coordX").textContent,
    y: document.getElementById("coordY").textContent
  };
})()`);

const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
writeFileSync("./unknown-ocean-cdp.png", Buffer.from(screenshot.data, "base64"));
ws.close();

console.log(JSON.stringify({ before, after, screenshot: "./unknown-ocean-cdp.png" }, null, 2));
