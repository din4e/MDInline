/**
 * 视口 ≤960px:把「图标+文字」按钮收成纯图标。
 *
 * 用法:给 Button 加 `className={collapseIconBtn.<size>}`,并把文字标签包进
 * `<span className={HIDE_LABEL_960}>`。按当前 Button 的 size 选对应正方形,
 * 避免 xs/sm 按钮收起后变大。纯 CSS、SSR 安全,无 JS。
 */
export const collapseIconBtn: Record<"default" | "sm" | "xs", string> = {
  default: "max-[960px]:size-7 max-[960px]:px-0",
  sm: "max-[960px]:size-6 max-[960px]:px-0",
  xs: "max-[960px]:size-5 max-[960px]:px-0",
};

/** 按钮文字标签:≤960px 隐藏。 */
export const HIDE_LABEL_960 = "max-[960px]:hidden";
