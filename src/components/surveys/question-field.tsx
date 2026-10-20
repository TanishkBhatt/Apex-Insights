"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Heart,
  Star,
  ThumbsUp,
} from "lucide-react";
import type { QuestionConfig, QuestionType } from "@/db/schema";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LIMITS,
  OTHER_PREFIX,
  isOtherAnswerValue,
} from "@/lib/validation/survey";
import { cn } from "@/lib/utils";

export type QuestionFieldValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, string>
  | undefined;

export type QuestionFieldData = {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  config: QuestionConfig;
};

function range(min: number, max: number, step = 1): number[] {
  const values: number[] = [];
  const safeStep = step > 0 ? step : 1;
  const count = Math.floor((max - min) / safeStep);
  for (let index = 0; index <= count; index += 1) {
    values.push(Math.round((min + index * safeStep) * 1e6) / 1e6);
  }
  return values;
}

function asRecord(value: QuestionFieldValue): Record<string, string> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {};
}

function shuffleOptions(options: string[]): string[] {
  const next = [...options];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function QuestionField({
  question,
  value,
  onChange,
  disabled = false,
  namePrefix = "q",
  error,
}: {
  question: QuestionFieldData;
  value: QuestionFieldValue;
  onChange?: (value: QuestionFieldValue) => void;
  disabled?: boolean;
  namePrefix?: string;
  error?: string | null;
}) {
  const config = question.config ?? {};
  const name = `${namePrefix}-${question.id}`;
  const [options, setOptions] = useState(config.options ?? []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const base = config.options ?? [];
      setOptions(config.shuffleOptions ? shuffleOptions(base) : base);
    });
    return () => cancelAnimationFrame(frame);
  }, [question.id, config.options, config.shuffleOptions]);

  function emit(next: QuestionFieldValue) {
    onChange?.(next);
  }

  const control = (() => {
    switch (question.type) {
      case "short_text":
        return (
          <Input
            id={name}
            name={name}
            value={typeof value === "string" ? value : ""}
            placeholder={config.placeholder ?? ""}
            disabled={disabled}
            onChange={(e) => emit(e.target.value)}
          />
        );

      case "paragraph":
        return (
          <Textarea
            id={name}
            name={name}
            value={typeof value === "string" ? value : ""}
            placeholder={config.placeholder ?? ""}
            disabled={disabled}
            rows={4}
            onChange={(e) => emit(e.target.value)}
          />
        );

      case "email":
        return (
          <Input
            id={name}
            name={name}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={typeof value === "string" ? value : ""}
            placeholder={config.placeholder ?? "name@example.com"}
            disabled={disabled}
            onChange={(e) => emit(e.target.value)}
          />
        );

      case "number":
        return (
          <Input
            id={name}
            name={name}
            type="number"
            inputMode="decimal"
            min={config.min}
            max={config.max}
            step={config.step ?? "any"}
            value={typeof value === "number" ? String(value) : ""}
            placeholder={config.placeholder ?? ""}
            disabled={disabled}
            onChange={(e) =>
              emit(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        );

      case "dropdown":
        return (
          <Select
            id={name}
            name={name}
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(e) => emit(e.target.value)}
          >
            <option value="">Select an option…</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        );

      case "single_choice": {
        const otherSelected = isOtherAnswerValue(value);
        const otherText = otherSelected ? value.slice(OTHER_PREFIX.length) : "";
        return (
          <div className="space-y-2">
            {options.map((option, index) => (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700",
                  !disabled && "hover:bg-slate-50",
                  disabled && "cursor-default opacity-80",
                )}
              >
                <input
                  type="radio"
                  id={index === 0 ? name : undefined}
                  name={name}
                  value={option}
                  disabled={disabled}
                  checked={value === option}
                  onChange={() => emit(option)}
                  className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {option}
              </label>
            ))}
            {config.allowOther ? (
              <div className="space-y-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700",
                    !disabled && "hover:bg-slate-50",
                    disabled && "cursor-default opacity-80",
                  )}
                >
                  <input
                    type="radio"
                    name={name}
                    value="other"
                    disabled={disabled}
                    checked={otherSelected}
                    onChange={() => emit(`${OTHER_PREFIX}${otherText}`)}
                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Other
                </label>
                {otherSelected ? (
                  <Input
                    aria-label="Your other answer"
                    value={otherText}
                    maxLength={LIMITS.otherAnswerMax}
                    disabled={disabled}
                    placeholder="Type your answer…"
                    onChange={(e) => emit(`${OTHER_PREFIX}${e.target.value}`)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      }

      case "multiple_choice": {
        const selected = Array.isArray(value) ? value : [];
        const otherEntry = selected.find(isOtherAnswerValue);
        const otherText = otherEntry ? otherEntry.slice(OTHER_PREFIX.length) : "";
        return (
          <div className="space-y-2">
            {options.map((option, index) => (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700",
                  !disabled && "hover:bg-slate-50",
                  disabled && "cursor-default opacity-80",
                )}
              >
                <input
                  type="checkbox"
                  id={index === 0 ? name : undefined}
                  name={name}
                  value={option}
                  disabled={disabled}
                  checked={selected.includes(option)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, option]
                      : selected.filter((item) => item !== option);
                    emit(next);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {option}
              </label>
            ))}
            {config.allowOther ? (
              <div className="space-y-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700",
                    !disabled && "hover:bg-slate-50",
                    disabled && "cursor-default opacity-80",
                  )}
                >
                  <input
                    type="checkbox"
                    name={`${name}-other`}
                    value="other"
                    disabled={disabled}
                    checked={Boolean(otherEntry)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        emit([...selected, `${OTHER_PREFIX}${otherText}`]);
                      } else {
                        emit(selected.filter((item) => !isOtherAnswerValue(item)));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Other
                </label>
                {otherEntry ? (
                  <Input
                    aria-label="Your other answer"
                    value={otherText}
                    maxLength={LIMITS.otherAnswerMax}
                    disabled={disabled}
                    placeholder="Type your answer…"
                    onChange={(e) =>
                      emit([
                        ...selected.filter((item) => !isOtherAnswerValue(item)),
                        `${OTHER_PREFIX}${e.target.value}`,
                      ])
                    }
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      }

      case "slider": {
        const min = config.min ?? 0;
        const max = config.max ?? 10;
        const step = config.step ?? 1;
        const current = typeof value === "number" ? value : min;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                id={name}
                name={name}
                type="range"
                min={min}
                max={max}
                step={step}
                value={current}
                disabled={disabled}
                onChange={(e) => emit(Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
              />
              <span className="min-w-14 rounded-md bg-indigo-50 px-2 py-1 text-center text-sm font-semibold text-indigo-700">
                {typeof value === "number" ? value : "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{config.minLabel ? `${config.minLabel} (${min})` : `Lowest (${min})`}</span>
              <span>{config.maxLabel ? `${config.maxLabel} (${max})` : `Highest (${max})`}</span>
            </div>
          </div>
        );
      }

      case "rating": {
        const Icon =
          config.icon === "heart" ? Heart : config.icon === "thumb" ? ThumbsUp : Star;
        return (
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Rating">
            {range(LIMITS.ratingMin, LIMITS.ratingMax).map((score) => {
              const active = typeof value === "number" && value >= score;
              return (
                <button
                  key={score}
                  type="button"
                  role="radio"
                  aria-checked={value === score}
                  aria-label={`${score} out of ${LIMITS.ratingMax}`}
                  disabled={disabled}
                  onClick={() => emit(score)}
                  className={cn(
                    "rounded-lg border p-2 transition",
                    active
                      ? "border-amber-400 bg-amber-50 text-amber-500"
                      : "border-slate-200 text-slate-300 hover:bg-slate-50",
                    disabled && "cursor-default opacity-80",
                  )}
                >
                  <Icon
                    className="h-7 w-7"
                    fill={active ? "currentColor" : "none"}
                    aria-hidden
                  />
                </button>
              );
            })}
            <span className="ml-1 text-sm text-slate-500">
              {typeof value === "number" ? `${value} / ${LIMITS.ratingMax}` : "Select a rating"}
            </span>
          </div>
        );
      }

      case "nps": {
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="NPS score">
              {range(0, 10).map((score) => {
                const active = value === score;
                const tone =
                  score >= 9
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : score >= 7
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-red-400 bg-red-50 text-red-700";
                return (
                  <button
                    key={score}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => emit(score)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition",
                      active ? tone : "border-slate-200 text-slate-600 hover:bg-slate-50",
                      disabled && "cursor-default opacity-80",
                    )}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Not at all likely</span>
              <span>Extremely likely</span>
            </div>
          </div>
        );
      }

      case "ranking": {
        const ranked = Array.isArray(value)
          ? value.filter((item) => options.includes(item))
          : [];
        const order = [...ranked, ...options.filter((option) => !ranked.includes(option))];
        const move = (index: number, direction: -1 | 1) => {
          const target = index + direction;
          if (target < 0 || target >= order.length) return;
          const next = [...order];
          [next[index], next[target]] = [next[target], next[index]];
          emit(next);
        };
        return (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              {ranked.length > 0
                ? "Drag items or use the arrows to reorder."
                : "Items are shown in their default order — reorder them to rank."}
            </p>
            <ol className="space-y-2">
              {order.map((option, index) => (
                <li
                  key={option}
                  draggable={!disabled}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", String(index));
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = Number(event.dataTransfer.getData("text/plain"));
                    if (!Number.isInteger(from) || from === index) return;
                    const next = [...order];
                    const [moved] = next.splice(from, 1);
                    next.splice(index, 0, moved);
                    emit(next);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-slate-700",
                    !disabled && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option}</span>
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${option} up`}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === order.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${option} down`}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
            {ranked.length === 0 && !disabled ? (
              <Button variant="outline" size="sm" onClick={() => emit(order)}>
                Use this order
              </Button>
            ) : null}
          </div>
        );
      }

      case "matrix": {
        const rows = config.rows ?? [];
        const columns = config.columns ?? [];
        const record = asRecord(value);
        return (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 py-2 pr-3 text-left font-medium text-slate-600">
                    <span className="sr-only">Row</span>
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="border-b border-slate-200 px-2 py-2 text-center text-xs font-medium text-slate-600"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row} className="border-b border-slate-100 last:border-b-0">
                    <th className="py-2 pr-3 text-left font-normal text-slate-700">{row}</th>
                    {columns.map((column) => (
                      <td key={column} className="px-2 py-2 text-center">
                        <input
                          type="radio"
                          name={`${name}-${row}`}
                          value={column}
                          disabled={disabled}
                          checked={record[row] === column}
                          onChange={() => emit({ ...record, [row]: column })}
                          aria-label={`${row}: ${column}`}
                          className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case "linear_scale": {
        const min = config.min ?? 1;
        const max = config.max ?? 5;
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {range(min, max).map((step, index) => (
                <label
                  key={step}
                  className={cn(
                    "flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium",
                    value === step
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600",
                    !disabled && value !== step && "hover:bg-slate-50",
                    disabled && "cursor-default opacity-80",
                  )}
                >
                  <input
                    type="radio"
                    id={index === 0 ? name : undefined}
                    name={name}
                    value={step}
                    disabled={disabled}
                    checked={value === step}
                    onChange={() => emit(step)}
                    className="sr-only"
                  />
                  {step}
                </label>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{config.minLabel ? `${config.minLabel} (${min})` : `Lowest (${min})`}</span>
              <span>{config.maxLabel ? `${config.maxLabel} (${max})` : `Highest (${max})`}</span>
            </div>
          </div>
        );
      }

      case "yes_no":
        return (
          <div className="flex gap-2">
            {[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((option, index) => (
              <label
                key={option.label}
                className={cn(
                  "flex min-w-24 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium",
                  value === option.value
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600",
                  !disabled && value !== option.value && "hover:bg-slate-50",
                  disabled && "cursor-default opacity-80",
                )}
              >
                <input
                  type="radio"
                  id={index === 0 ? name : undefined}
                  name={name}
                  value={option.label}
                  disabled={disabled}
                  checked={value === option.value}
                  onChange={() => emit(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        );

      default:
        return <p className="text-sm text-red-600">Unsupported question type.</p>;
    }
  })();

  return (
    <div className="space-y-2">
      {control}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
