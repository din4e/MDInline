"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface NumberProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

/**
 * Smooth, clamped numeric text binding shared by the slider + number fields.
 *
 * Keeps a local string draft so partial input ("1.", "", "-", "-.") isn't
 * force-parsed to 0 on every keystroke — you can type a value naturally and it
 * only commits/clamps on blur. Valid in-range values propagate live (so the
 * slider tracks as you type); out-of-range keystrokes are held until blur,
 * where they're clamped to [min, max] (fixes e.g. "999" persisting past max).
 */
function useClampedNumber(
  value: number,
  onChange: (next: number) => void,
  min?: number,
  max?: number,
) {
  const [draft, setDraft] = useState(() => formatNumber(value));
  const [focused, setFocused] = useState(false);

  // Sync from the external value while not actively typing (slider drag, reset,
  // preset switch). While focused we never clobber the user's draft.
  useEffect(() => {
    if (!focused) setDraft(formatNumber(value));
  }, [value, focused]);

  const clamp = (n: number) => {
    let r = n;
    if (typeof min === "number") r = Math.max(min, r);
    if (typeof max === "number") r = Math.min(max, r);
    return r;
  };

  const onInput = (raw: string) => {
    setDraft(raw);
    const t = raw.trim();
    // Partial / sign-only / empty — keep the draft, don't propagate (avoids the
    // 0-jump that broke typing "." or clearing the field).
    if (t === "" || t === "-" || t === "." || t === "-.") return;
    const parsed = Number.parseFloat(t);
    if (!Number.isFinite(parsed)) return;
    // Only propagate in-range values live; out-of-range waits for blur to clamp.
    if ((typeof min !== "number" || parsed >= min) && (typeof max !== "number" || parsed <= max)) {
      onChange(parsed);
    }
  };

  const onBlur = () => {
    setFocused(false);
    const parsed = Number.parseFloat(draft.trim());
    const next = Number.isFinite(parsed) ? clamp(parsed) : value;
    setDraft(formatNumber(next));
    onChange(next);
  };

  return {
    value: draft,
    onInput,
    onFocus: () => setFocused(true),
    onBlur,
  };
}

function formatNumber(n: number): string {
  return String(n);
}

// Hide the clunky native number spinners — nudging happens via the slider or
// arrow keys, and the field reads as plain text.
const numberInputClass =
  "w-16 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function RangeField({ label, value, onChange, min, max, step = 1, suffix }: NumberProps) {
  const id = useId();
  const num = useClampedNumber(value, onChange, min, max);
  return (
    <div className="mb-3">
      <Label className="mb-1 block text-xs text-muted-foreground" htmlFor={`${id}-number`}>
        {label}{suffix ? ` (${suffix})` : ""}
      </Label>
      <div className="flex items-center gap-2">
        <Slider
          aria-label={label}
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([next]) => onChange(next)}
        />
        <Input
          id={`${id}-number`}
          className={numberInputClass}
          type="number"
          inputMode="decimal"
          value={num.value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => num.onInput(event.target.value)}
          onFocus={num.onFocus}
          onBlur={num.onBlur}
        />
      </div>
    </div>
  );
}

export function NumberField({ label, value, onChange, min, max, step = 1, suffix }: NumberProps) {
  const id = useId();
  const num = useClampedNumber(value, onChange, min, max);
  return (
    <div className="mb-2.5 grid grid-cols-[1fr_auto] items-center gap-2">
      <Label className="text-xs text-muted-foreground" htmlFor={id}>{label}</Label>
      <span className="flex items-center gap-1">
        <Input
          id={id}
          className={numberInputClass}
          type="number"
          inputMode="decimal"
          value={num.value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => num.onInput(event.target.value)}
          onFocus={num.onFocus}
          onBlur={num.onBlur}
        />
        {suffix ? <span className="text-[11px] text-muted-foreground">{suffix}</span> : null}
      </span>
    </div>
  );
}

interface ColorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorField({ label, value, onChange }: ColorProps) {
  const id = useId();
  return (
    <div className="mb-2.5 grid grid-cols-[1fr_auto] items-center gap-2">
      <Label className="text-xs text-muted-foreground" htmlFor={`${id}-text`}>{label}</Label>
      <span className="flex items-center gap-1.5">
        <input
          className="h-7 w-8 cursor-pointer rounded-md border bg-background p-0"
          type="color"
          aria-label={`${label}颜色选择器`}
          value={normalizeHex(value)}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          id={`${id}-text`}
          className="w-20"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </div>
  );
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({ label, value, onChange, options }: SelectProps) {
  const id = useId();
  return (
    <div className="mb-2.5 grid grid-cols-[1fr_auto] items-center gap-2">
      <Label className="text-xs text-muted-foreground" id={`${id}-label`}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="min-w-24" aria-labelledby={`${id}-label`}>
          <SelectValue>{options.find((option) => option.value === value)?.label ?? value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface SegmentProps extends SelectProps {}

export function SegField({ label, value, onChange, options }: SegmentProps) {
  return (
    <div className="mb-2.5 grid grid-cols-[1fr_auto] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={value}
        onValueChange={(next) => next && onChange(next)}
        aria-label={label}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleField({ label, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="mb-2.5 grid grid-cols-[1fr_auto] items-center gap-2">
      <Label className="text-xs text-muted-foreground" htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mt-3.5 mb-2 text-xs font-bold tracking-wide text-muted-foreground first:mt-0">{title}</h3>
      {children}
    </section>
  );
}

function normalizeHex(value: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value.slice(1).split("").map((character) => character + character).join("")}`;
  }
  return "#000000";
}
