"use client";

import type { QuestionConfig, QuestionType } from "@/db/schema";
import { Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type QuestionFieldValue = string | number | boolean | string[] | undefined;

export type QuestionFieldData = {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  config: QuestionConfig;
};

function range(min: number, max: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += 1) values.push(value);
  return values;
}

export function QuestionField({
  question,
  value,
  onChange,
  disabled = false,
  namePrefix = "q",
}: {
  question: QuestionFieldData;
  value: QuestionFieldValue;
  onChange?: (value: QuestionFieldValue) => void;
  disabled?: boolean;
  namePrefix?: string;
}) {
  const config = question.config ?? {};
  const name = `${namePrefix}-${question.id}`;
  const describedBy = `${name}-help`;

  const options = config.options ?? [];

  function emit(next: QuestionFieldValue) {
    onChange?.(next);
  }

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

    case "single_choice":
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
        </div>
      );

    case "multiple_choice": {
      const selected = Array.isArray(value) ? value : [];
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
          {config.minLabel || config.maxLabel ? (
            <div className="flex justify-between text-xs text-slate-500" id={describedBy}>
              <span>{config.minLabel ?? min}</span>
              <span>{config.maxLabel ?? max}</span>
            </div>
          ) : null}
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
}
