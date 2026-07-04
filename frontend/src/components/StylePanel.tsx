"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { collapseIconBtn, HIDE_LABEL_960 } from "@/components/ui/responsive";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cloneTheme, DEFAULT_THEME, type DeepPartial, type HeadingStyle, type HLevel, type ThemeConfig } from "@/lib/theme";
import { HL_THEMES } from "@/lib/hlThemes";
import {
  ColorField,
  RangeField,
  Section,
  SegField,
  SelectField,
  ToggleField,
} from "./controls";
import { StylePreview } from "./StylePreview";

type Update = (p: DeepPartial<ThemeConfig>) => void;
interface PanelProps {
  theme: ThemeConfig;
  update: Update;
}

/** Build a typed headings patch for one level (avoids computed-key type errors). */
const headingPatch = (lv: HLevel, p: DeepPartial<HeadingStyle>): DeepPartial<ThemeConfig> => ({
  headings: { [lv]: p } as unknown as DeepPartial<Record<HLevel, HeadingStyle>>,
});

const ALIGN_OPTS = [
  { value: "left", label: "左" },
  { value: "center", label: "中" },
  { value: "justify", label: "两端" },
];
const FONT_PRESETS = [
  { value: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif', label: "系统默认" },
  { value: '"PingFang SC", "Microsoft YaHei", sans-serif', label: "苹方 / 雅黑" },
  { value: 'Georgia, "Songti SC", "SimSun", serif', label: "衬线 (宋体)" },
  { value: '"Helvetica Neue", Arial, sans-serif', label: "无衬线 (英)" },
  { value: 'Menlo, Monaco, Consolas, monospace', label: "等宽" },
];
const HL_OPTS = (Object.keys(HL_THEMES) as Array<keyof typeof HL_THEMES>).map((k) => ({
  value: k,
  label: k,
}));
const hintClass = "mt-1.5 text-[11px] leading-relaxed text-muted-foreground";
const fieldStackClass = "mb-3";
const fieldLabelClass = "mb-1 block text-xs text-muted-foreground";
const fieldClass = "mb-2.5 grid grid-cols-[1fr_auto] items-center gap-2";
const colorRowClass = "flex items-center gap-1.5";
const colorInputClass = "h-7 w-8 cursor-pointer rounded-md border bg-background p-0";

function Typography({ theme: t, update }: PanelProps) {
  const b = t.base;
  return (
    <>
      <Section title="字体">
        <div className={fieldStackClass}>
          <Label className={fieldLabelClass} id="base-font-preset-label">字体族</Label>
          <Select value={b.fontFamily} onValueChange={(value) => update({ base: { fontFamily: value } })}>
            <SelectTrigger className="w-full" aria-labelledby="base-font-preset-label">
              <SelectValue>
                {FONT_PRESETS.find((option) => option.value === b.fontFamily)?.label ?? "自定义"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FONT_PRESETS.map((option) => (
                <SelectItem key={option.label} value={option.value}>{option.label}</SelectItem>
              ))}
              {!FONT_PRESETS.some((option) => option.value === b.fontFamily) && (
                <SelectItem value={b.fontFamily}>自定义</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Input
            className="mt-1 w-full"
            aria-label="自定义正文字体族"
            value={b.fontFamily}
            onChange={(e) => update({ base: { fontFamily: e.target.value } })}
          />
        </div>
        <RangeField label="正文字号" value={b.fontSize} min={11} max={24} step={1} suffix="px" onChange={(v) => update({ base: { fontSize: v } })} />
        <RangeField label="行高" value={b.lineHeight} min={1} max={2.4} step={0.05} onChange={(v) => update({ base: { lineHeight: v } })} />
        <RangeField label="字间距" value={b.letterSpacing} min={0} max={3} step={0.1} suffix="px" onChange={(v) => update({ base: { letterSpacing: v } })} />
        <SelectField label="加粗字重" value={String(b.boldWeight)} onChange={(v) => update({ base: { boldWeight: Number(v) } })}
          options={[{ value: "400", label: "常规 400" }, { value: "600", label: "半粗 600" }, { value: "700", label: "粗体 700" }, { value: "900", label: "特粗 900" }]} />
        <SegField label="对齐" value={b.textAlign} onChange={(v) => update({ base: { textAlign: v as ThemeConfig["base"]["textAlign"] } })} options={ALIGN_OPTS} />
      </Section>

      <Section title="颜色">
        <ColorField label="正文颜色" value={b.fontColor} onChange={(v) => update({ base: { fontColor: v } })} />
        <ColorField label="背景颜色" value={b.bgColor} onChange={(v) => update({ base: { bgColor: v } })} />
        <ColorField label="链接颜色" value={t.link.color} onChange={(v) => update({ link: { color: v } })} />
        <SegField label="链接下划线" value={t.link.decoration} onChange={(v) => update({ link: { decoration: v as "none" | "underline" } })}
          options={[{ value: "none", label: "无" }, { value: "underline", label: "有" }]} />
      </Section>

      <Section title="段落">
        <RangeField label="段落间距" value={b.paragraphSpacing} min={0} max={48} step={1} suffix="px" onChange={(v) => update({ base: { paragraphSpacing: v } })} />
      </Section>
    </>
  );
}

function Spacing({ theme: t, update }: PanelProps) {
  const s = t.spacing;
  return (
    <>
      <Section title="列表">
        <RangeField label="列表上边距" value={s.listMarginTop} min={0} max={48} step={1} suffix="px" onChange={(v) => update({ spacing: { listMarginTop: v } })} />
        <RangeField label="列表下边距" value={s.listMarginBottom} min={0} max={48} step={1} suffix="px" onChange={(v) => update({ spacing: { listMarginBottom: v } })} />
        <RangeField label="列表缩进" value={s.listPaddingLeft} min={0} max={56} step={1} suffix="px" onChange={(v) => update({ spacing: { listPaddingLeft: v } })} />
      </Section>

      <Section title="引用块">
        <RangeField label="内边距" value={s.blockquotePadding} min={0} max={32} step={1} suffix="px" onChange={(v) => update({ spacing: { blockquotePadding: v } })} />
        <RangeField label="左边框宽度" value={s.blockquoteBorderWidth} min={0} max={12} step={1} suffix="px" onChange={(v) => update({ spacing: { blockquoteBorderWidth: v } })} />
        <ColorField label="背景" value={s.blockquoteBg} onChange={(v) => update({ spacing: { blockquoteBg: v } })} />
        <ColorField label="文字颜色" value={s.blockquoteColor} onChange={(v) => update({ spacing: { blockquoteColor: v } })} />
        <ColorField label="左边框颜色" value={s.blockquoteBorderColor} onChange={(v) => update({ spacing: { blockquoteBorderColor: v } })} />
      </Section>

      <Section title="表格 / 分隔线">
        <ColorField label="表格边框" value={s.tableBorderColor} onChange={(v) => update({ spacing: { tableBorderColor: v } })} />
        <div className={hintClass}>分隔线(---)使用同一表格边框色。</div>
      </Section>
    </>
  );
}

function Headings({ theme: t, update }: PanelProps) {
  const levels: HLevel[] = ["h1", "h2", "h3", "h4", "h5", "h6"];
  return (
    <>
      <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
        逐级标题独立设置字号 / 颜色 / 粗细 / 边距。
      </div>
      {levels.map((lv) => {
        const h = t.headings[lv];
        return (
          <div className="mb-3 rounded-md border p-3" key={lv}>
            <div className="mb-2 flex items-center justify-between text-[13px] font-semibold">
              <span>{lv.toUpperCase()}</span>
              {(lv === "h1" || lv === "h2") && (
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    id={`${lv}-underline`}
                    checked={!!h.underline}
                    onCheckedChange={(checked) =>
                      update(
                        headingPatch(lv, {
                          underline: checked
                            ? { color: h.underline?.color ?? t.base.fontColor, width: h.underline?.width ?? 1 }
                            : null,
                        })
                      )
                    }
                  />
                  <Label htmlFor={`${lv}-underline`}>下划线</Label>
                </div>
              )}
            </div>
            <RangeField label="字号" value={h.fontSize} min={11} max={32} step={1} suffix="px" onChange={(v) => update(headingPatch(lv, { fontSize: v }))} />
            <div className={fieldClass}>
              <Label className="text-xs text-muted-foreground" htmlFor={`${lv}-color`}>颜色</Label>
              <span className={colorRowClass}>
                <input className={colorInputClass} type="color" aria-label={`${lv.toUpperCase()} 颜色选择器`} value={normalizeHex(h.color)} onChange={(e) => update(headingPatch(lv, { color: e.target.value }))} />
                <Input id={`${lv}-color`} className="w-20" value={h.color} onChange={(e) => update(headingPatch(lv, { color: e.target.value }))} />
              </span>
            </div>
            <SelectField label="字重" value={String(h.fontWeight)} onChange={(v) => update(headingPatch(lv, { fontWeight: Number(v) }))}
              options={[{ value: "400", label: "400" }, { value: "600", label: "600" }, { value: "700", label: "700" }, { value: "900", label: "900" }]} />
            <RangeField label="上边距" value={h.marginTop} min={0} max={48} step={1} suffix="px" onChange={(v) => update(headingPatch(lv, { marginTop: v }))} />
            <RangeField label="下边距" value={h.marginBottom} min={0} max={48} step={1} suffix="px" onChange={(v) => update(headingPatch(lv, { marginBottom: v }))} />
          </div>
        );
      })}
    </>
  );
}

function CodePanel({ theme: t, update }: PanelProps) {
  const c = t.code;
  return (
    <>
      <Section title="行内代码">
        <ColorField label="背景" value={c.inlineBg} onChange={(v) => update({ code: { inlineBg: v } })} />
        <ColorField label="文字颜色" value={c.inlineColor} onChange={(v) => update({ code: { inlineColor: v } })} />
        <RangeField label="圆角" value={c.inlineRadius} min={0} max={12} step={1} suffix="px" onChange={(v) => update({ code: { inlineRadius: v } })} />
        <RangeField label="横向内边距" value={c.inlinePaddingX} min={0} max={12} step={1} suffix="px" onChange={(v) => update({ code: { inlinePaddingX: v } })} />
        <RangeField label="纵向内边距" value={c.inlinePaddingY} min={0} max={8} step={1} suffix="px" onChange={(v) => update({ code: { inlinePaddingY: v } })} />
      </Section>

      <Section title="代码块">
        <ColorField label="背景" value={c.blockBg} onChange={(v) => update({ code: { blockBg: v } })} />
        <ColorField label="文字颜色" value={c.blockColor} onChange={(v) => update({ code: { blockColor: v } })} />
        <RangeField label="圆角" value={c.blockRadius} min={0} max={16} step={1} suffix="px" onChange={(v) => update({ code: { blockRadius: v } })} />
        <RangeField label="内边距" value={c.blockPadding} min={0} max={32} step={1} suffix="px" onChange={(v) => update({ code: { blockPadding: v } })} />
        <RangeField label="字号" value={c.blockFontSize} min={10} max={18} step={1} suffix="px" onChange={(v) => update({ code: { blockFontSize: v } })} />
        <div className={fieldStackClass}>
          <Label className={fieldLabelClass} htmlFor="code-font-family">字体族</Label>
          <Input id="code-font-family" className="w-full" value={c.blockFontFamily} onChange={(e) => update({ code: { blockFontFamily: e.target.value } })} />
        </div>
      </Section>

      <Section title="语法高亮">
        <ToggleField label="启用代码高亮" checked={c.highlight} onChange={(v) => update({ code: { highlight: v } })} />
        {c.highlight && (
          <SelectField label="高亮主题" value={c.hlTheme} onChange={(v) => update({ code: { hlTheme: v as ThemeConfig["code"]["hlTheme"] } })} options={HL_OPTS} />
        )}
      </Section>
    </>
  );
}

function ImagePanel({ theme: t, update }: PanelProps) {
  const im = t.image;
  return (
    <>
      <Section title="图片">
        <RangeField label="最大宽度" value={im.maxWidth} min={20} max={100} step={1} suffix="%" onChange={(v) => update({ image: { maxWidth: v } })} />
        <SegField label="对齐" value={im.align} onChange={(v) => update({ image: { align: v as "left" | "center" } })} options={[{ value: "left", label: "左" }, { value: "center", label: "居中" }]} />
        <RangeField label="圆角" value={im.borderRadius} min={0} max={32} step={1} suffix="px" onChange={(v) => update({ image: { borderRadius: v } })} />
        <RangeField label="上边距" value={im.marginTop} min={0} max={48} step={1} suffix="px" onChange={(v) => update({ image: { marginTop: v } })} />
        <RangeField label="下边距" value={im.marginBottom} min={0} max={48} step={1} suffix="px" onChange={(v) => update({ image: { marginBottom: v } })} />
        <div className={hintClass}>
          ⚠️ 公众号会重新托管图片:粘贴时<b>本地/网络图片都可</b>,但建议使用可公网访问的图片地址,以免失效。
        </div>
      </Section>
    </>
  );
}

function CustomCss({ theme: t, update }: PanelProps) {
  return (
    <>
      <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
        在下方编写自定义 CSS,会追加在生成的样式之后,优先级最高。可用 <code>.mdcss</code> 选择器,例如:
      </div>
      <pre className="mt-1 mb-2.5 whitespace-pre-wrap text-[11px] text-muted-foreground">.mdcss p {"{ text-indent: 2em; }"}</pre>
      <Textarea
        className="min-h-40 resize-y font-mono text-xs leading-relaxed"
        aria-label="自定义 CSS"
        value={t.customCss ?? ""}
        onChange={(e) => update({ customCss: e.target.value })}
        spellCheck={false}
        placeholder=".mdcss p { text-indent: 2em; }"
      />
    </>
  );
}

const TABS = [
  { key: "typo", label: "文字", render: Typography },
  { key: "space", label: "间距", render: Spacing },
  { key: "head", label: "标题", render: Headings },
  { key: "code", label: "代码", render: CodePanel },
  { key: "img", label: "图片", render: ImagePanel },
  { key: "css", label: "自定义", render: CustomCss },
] as const;

/**
 * Per-category reset: each tab owns a slice of the theme. Resetting rebuilds the
 * patch from a fresh clone of DEFAULT_THEME so the live theme never shares
 * object references with the default (deepMerge would otherwise alias nested
 * objects like a heading's `underline`).
 */
const RESET_PATCH: Record<(typeof TABS)[number]["key"], (d: ThemeConfig) => DeepPartial<ThemeConfig>> = {
  typo: (d) => ({ base: d.base, link: d.link }),
  space: (d) => ({ spacing: d.spacing }),
  head: (d) => ({ headings: d.headings }),
  code: (d) => ({ code: d.code }),
  img: (d) => ({ image: d.image }),
  css: () => ({ customCss: undefined }),
};

export function StylePanel({ theme, update }: PanelProps) {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("typo");
  const activeTab = TABS.find((t) => t.key === active)!;
  const Current = activeTab.render;
  const resetActive = () => {
    update(RESET_PATCH[active](cloneTheme(DEFAULT_THEME)));
    toast(`已将「${activeTab.label}」重置为默认`);
  };
  return (
    <Tabs className="min-h-0 flex-1 gap-0" value={active} onValueChange={(value) => setActive(value as typeof active)}>
      <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
        <TabsList className="h-auto min-w-0 flex-1 justify-start overflow-x-auto overflow-y-hidden bg-transparent" aria-label="样式类别">
          {TABS.map((tab) => (
            <TabsTrigger className="flex-none min-w-max" key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetActive}
          title={`重置「${activeTab.label}」为模板默认值`}
          className={cn(collapseIconBtn.sm, "shrink-0 gap-1 text-muted-foreground")}
        >
          <RotateCcw />
          <span className={HIDE_LABEL_960}>重置</span>
        </Button>
      </div>
      <StylePreview theme={theme} />
      <TabsContent className="m-0 flex-1 overflow-y-auto p-3.5 [scrollbar-gutter:stable] max-[720px]:overflow-visible" value={active}>
        <Current theme={theme} update={update} />
      </TabsContent>
    </Tabs>
  );
}

function normalizeHex(v: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return "#" + v.slice(1).split("").map((c) => c + c).join("");
  return "#000000";
}
