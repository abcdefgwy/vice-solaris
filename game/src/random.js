// 确定性随机数生成器（mulberry32），确保相同 seed 生成完全一致的街区、交通与截图场景

export function createRandom(seed) {
  let a = seed | 0;
  function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  random.range = (min, max) => min + random() * (max - min);
  random.int = (min, max) => Math.floor(min + random() * (max - min + 1));
  random.pick = (arr) => arr[Math.floor(random() * arr.length)];
  return random;
}
