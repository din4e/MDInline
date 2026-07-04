/**
 * 生产构建包装器 —— 规避本机偶发的原生崩溃(重试直到产出有效 out/)。
 *
 * 现象:本机跑 Next 16 构建时,原生进程偶发崩溃,且崩在不同环节:
 *   - 构建工作进程(webpack worker)ACCESS_VIOLATION 0xC0000005 —— 编译期
 *   - Turbopack 0xC0000005 —— 早期方案,已弃用
 *   - 「Collecting build traces」0x80000003 (STATUS_BREAKPOINT) —— 收尾期
 * 这些都是非确定性的原生故障(代码本身能编译通过:TS 检查、Compiled successfully
 * 都曾成功过),不是代码错误。直接重试即可恢复。
 *
 * 策略:最多重试 MAX_ATTEMPTS 次,每次清掉 out/(避免残留掩盖失败)后跑
 * `next build --webpack`;只要某次产出 out/index.html(说明编译 + 静态导出真的
 * 完成了 —— 即便收尾追踪步骤随后崩了),立即返回 0。全部尝试都拿不到 out/
 * 时(真编译错误),把最后一次的退出码透传出去,不掩盖真错误。
 *
 * 供 `wails dev`(启动时构建一次)和 `wails build`(生产)共用。
 */
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_ATTEMPTS = 5;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "out");
const indexHtml = resolve(outDir, "index.html");

let lastCode = 0;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  // 清 out/:上次的残留不能当作本次成功的证据。
  rmSync(outDir, { recursive: true, force: true });

  process.stdout.write(`\n[build wrapper] attempt ${attempt}/${MAX_ATTEMPTS}\n`);
  try {
    execSync("next build --webpack", { stdio: "inherit", cwd: root });
  } catch (err) {
    lastCode = typeof err.status === "number" ? err.status : 1;
    process.stdout.write(
      `[build wrapper] next build exited with ${lastCode} (0x${(lastCode >>> 0).toString(16)})\n`,
    );
  }

  if (existsSync(indexHtml)) {
    process.stdout.write(
      `[build wrapper] out/index.html present — build OK (took ${attempt} attempt(s))\n`,
    );
    process.exit(0);
  }
}

process.stdout.write(
  `[build wrapper] gave up after ${MAX_ATTEMPTS} attempts — no out/index.html produced\n`,
);
process.exit(lastCode || 1);
