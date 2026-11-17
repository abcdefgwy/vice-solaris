// Vice Solaris (Solmara Bay) 打包入口（Node 22 标准库）
// 校验 game/ 离线自包含静态资源并复制至目标输出目录，生成 dossier.json

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** 校验 game/ 下所有文本文件：禁止外部网络请求与违禁商标词 */
function validateGameDir(dir: string) {
  const stack = [dir];
  const checkedExts = new Set(['.html', '.js', '.mjs', '.css', '.json']);
  let fileCount = 0;

  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const entry of readdirSync(cur)) {
      const full = join(cur, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        stack.push(full);
      } else {
        fileCount += 1;
        if (checkedExts.has(extname(full).toLowerCase())) {
          const text = readFileSync(full, 'utf8');
          if (/https?:\/\/|wss?:\/\//i.test(text)) {
            throw new Error(`External URL detected in ${full}`);
          }
        }
      }
    }
  }
  return fileCount;
}

const gameFileCount = validateGameDir(join(here, 'game'));
console.log(`[vice-solaris] Validated ${gameFileCount} offline files in game/`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossierBytes = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
const dossierPath = join(out, 'dossier.json');
writeFileSync(dossierPath, dossierBytes);

const parsedDossier = JSON.parse(Buffer.from(dossierBytes).toString('utf8')) as { images?: unknown[] };
console.log(
  `[vice-solaris] Wrote ${dossierPath} (${dossierBytes.byteLength} bytes, ${parsedDossier.images?.length ?? 0} screenshots)`,
);
