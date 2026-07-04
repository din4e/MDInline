/**
 * 模板点赞 —— 仅 Web 端(桌面端构建里完全不渲染点赞 UI)。
 *
 * 存储是可替换的:实现 `LikeStore` 接口,再改 `setLikeStore()` 指向真实后端
 * (BaaS / 自建 API / counterapi 等)即可。默认 `LocalLikeStore` 全部落在
 * localStorage,零配置即可用。
 *
 * 真接后端时:把 `getLikeStore()` 换成你的实现(方法可改为 async),调用处
 * (LikeButton)相应 await。计数语义保持「已点赞则幂等(不重复 +1)」。
 */
export interface LikeStore {
  /** 当前模板的点赞数(含确定性基础计数,避免新浏览器看到全 0)。 */
  getCount(key: string): number;
  /** 记一次赞。已点赞则幂等返回当前计数。返回点赞后的最新计数。 */
  like(key: string): number;
  /** 本浏览器是否已点过赞。 */
  isLiked(key: string): boolean;
}

const COUNTS_KEY = "mdcss.likes.counts.v1";
const LIKED_KEY = "mdcss.likes.liked.v1";

/**
 * 稳定的确定性基础计数:同一 key 在任何浏览器都得到同样的「底数」,让市场
 * 一眼看上去有人气。真实后端会覆盖它。范围约 12–186。
 */
function baseCount(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 12 + (Math.abs(h) % 175);
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 配额满 / 隐私模式 —— 忽略,功能降级为内存态 */
  }
}

class LocalLikeStore implements LikeStore {
  private counts(): Record<string, number> {
    return readJSON<Record<string, number>>(COUNTS_KEY, {});
  }
  private liked(): string[] {
    return readJSON<string[]>(LIKED_KEY, []);
  }

  getCount(key: string): number {
    const counts = this.counts();
    if (key in counts) return counts[key];
    const seeded = baseCount(key);
    writeJSON(COUNTS_KEY, { ...counts, [key]: seeded });
    return seeded;
  }

  isLiked(key: string): boolean {
    return this.liked().includes(key);
  }

  like(key: string): number {
    if (this.isLiked(key)) return this.getCount(key);
    const counts = this.counts();
    const current = key in counts ? counts[key] : baseCount(key);
    const updated = current + 1;
    writeJSON(LIKED_KEY, [...this.liked(), key]);
    writeJSON(COUNTS_KEY, { ...counts, [key]: updated });
    return updated;
  }
}

let store: LikeStore | null = null;

export function getLikeStore(): LikeStore {
  if (!store) store = new LocalLikeStore();
  return store;
}

/** 切换实现(接真实后端 / 测试 mock)。 */
export function setLikeStore(s: LikeStore): void {
  store = s;
}

/** 格式化计数:< 1000 原样;≥1000 用 1.2k 写法。 */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}
