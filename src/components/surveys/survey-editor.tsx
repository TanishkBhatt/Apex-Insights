"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createSurveyAction,
  updateSurveyAction,
  type ActionState,
} from "@/app/dashboard/surveys/actions";
import { Alert, Badge, Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  emptyQuestion,
  type EditorDraft,
  type EditorQuestion,
  type EditorSurvey,
} from "@/lib/surveys/editor";
import {
  LIMITS,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  supportsOther,
  type QuestionType,
} from "@/lib/validation/survey";
import { cn } from "@/lib/utils";

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function configForPayload(question: EditorQuestion) {
  const helpText = question.helpText.trim()
    ? { helpText: question.helpText.trim() }
    : {};

  switch (question.type) {
    case "single_choice":
    case "multiple_choice":
    case "dropdown":
      return {
        options: question.options.map((option) => option.trim()).filter(Boolean),
        ...(supportsOther(question.type) && question.allowOther
          ? { allowOther: true }
          : {}),
        ...(question.shuffleOptions ? { shuffleOptions: true } : {}),
        ...helpText,
      };
    case "ranking":
      return {
        options: question.options.map((option) => option.trim()).filter(Boolean),
        ...helpText,
      };
    case "matrix":
      return {
        rows: question.rows.map((row) => row.trim()).filter(Boolean),
        columns: question.columns.map((column) => column.trim()).filter(Boolean),
        ...helpText,
      };
    case "slider":
      return {
        min: Number(question.min),
        max: Number(question.max),
        step: Number(question.step),
        ...(question.minLabel.trim() ? { minLabel: question.minLabel.trim() } : {}),
        ...(question.maxLabel.trim() ? { maxLabel: question.maxLabel.trim() } : {}),
        ...helpText,
      };
    case "rating":
      return { icon: question.icon, ...helpText };
    case "number": {
      const min = parseOptionalNumber(question.min);
      const max = parseOptionalNumber(question.max);
      const step = parseOptionalNumber(question.step);
      return {
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
        ...(step !== undefined ? { step } : {}),
        ...(question.placeholder.trim()
          ? { placeholder: question.placeholder.trim() }
          : {}),
        ...helpText,
      };
    }
    case "email":
    case "short_text":
    case "paragraph":
      return {
        ...(question.placeholder.trim()
          ? { placeholder: question.placeholder.trim() }
          : {}),
        ...helpText,
      };
    default:
      return helpText;
  }
}

function buildPayload(input: {
  title: string;
  description: string;
  thankYouMessage: string;
  closesAt: string;
  maxResponses: string;
  questions: EditorQuestion[];
}) {
  return {
    title: input.title.trim(),
    description: input.description.trim() || undefined,
    thankYouMessage: input.thankYouMessage.trim() || undefined,
    closesAt: input.closesAt.trim()
      ? new Date(input.closesAt).toISOString()
      : undefined,
    maxResponses: input.maxResponses.trim()
      ? Number(input.maxResponses)
      : undefined,
    questions: input.questions.map((question) => ({
      ...(question.id ? { id: question.id } : {}),
      type: question.type,
      title: question.title.trim(),
      required: question.required,
      config: configForPayload(question),
    })),
  };
}

export function SurveyEditor({
  survey,
  initial,
}: {
  survey?: EditorSurvey;
  initial?: EditorDraft;
}) {
  const router = useRouter();
  const isEdit = Boolean(survey);
  const draft = survey ?? initial;

  const [title, setTitle] = useState(draft?.title ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [thankYouMessage, setThankYouMessage] = useState(
    draft?.thankYouMessage ?? "",
  );
  const [closesAt, setClosesAt] = useState(draft?.closesAt ?? "");
  const [maxResponses, setMaxResponses] = useState(draft?.maxResponses ?? "");
  const [questions, setQuestions] = useState<EditorQuestion[]>(
    draft?.questions.length ? draft.questions : [emptyQuestion("short_text")],
  );
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionState | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const readOnlyStructure = useMemo(() => survey?.status !== "draft", [survey?.status]);

  function errorFor(path: string): string | undefined {
    return errors[path]?.[0];
  }

  function questionHasError(index: number): boolean {
    const prefix = `questions.${index}.`;
    return Object.keys(errors).some(
      (key) => key === `questions.${index}` || key.startsWith(prefix),
    );
  }

  function scrollToFirstError(issues: Record<string, string[] | undefined>) {
    const first = Object.keys(issues)[0];
    if (!first) return;
    let targetId: string | null = null;
    if (first === "title") targetId = "survey-title";
    else if (first === "description") targetId = "survey-description";
    else if (first === "thankYouMessage") targetId = "survey-thank-you";
    else if (first === "closesAt") targetId = "survey-closes-at";
    else if (first === "maxResponses") targetId = "survey-max-responses";
    else if (first === "questions") targetId = "questions-list";
    else {
      const match = /^questions\.(\d+)/.exec(first);
      if (match) targetId = `question-card-${match[1]}`;
    }
    if (!targetId) return;
    requestAnimationFrame(() => {
      const element = document.getElementById(targetId);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element
        .querySelector<HTMLElement>("input, select, textarea")
        ?.focus({ preventScroll: true });
    });
  }

  function validateClient(
    currentTitle: string,
    currentQuestions: EditorQuestion[],
    settings: { thankYouMessage: string; closesAt: string; maxResponses: string },
  ): Record<string, string[]> {
    const issues: Record<string, string[]> = {};
    const add = (path: string, message: string) => {
      issues[path] = [...(issues[path] ?? []), message];
    };

    if (!currentTitle.trim()) add("title", "A survey title is required.");
    if (currentQuestions.length === 0) add("questions", "Add at least one question.");

    if (settings.thankYouMessage.trim().length > LIMITS.surveyThankYouMax) {
      add("thankYouMessage", `Thank-you message must be at most ${LIMITS.surveyThankYouMax} characters.`);
    }
    if (settings.closesAt.trim()) {
      const date = new Date(settings.closesAt);
      if (Number.isNaN(date.getTime())) {
        add("closesAt", "Enter a valid close date and time.");
      }
    }
    if (settings.maxResponses.trim()) {
      const limit = Number(settings.maxResponses);
      if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.surveyMaxResponsesMax) {
        add(
          "maxResponses",
          `Response limit must be a whole number between 1 and ${LIMITS.surveyMaxResponsesMax}.`,
        );
      }
    }

    currentQuestions.forEach((question, index) => {
      const prefix = `questions.${index}`;
      if (!question.title.trim()) {
        add(`${prefix}.title`, "Question text is required.");
      }
      if (question.helpText.trim().length > LIMITS.questionHelpMax) {
        add(
          `${prefix}.config.helpText`,
          `Help text must be at most ${LIMITS.questionHelpMax} characters.`,
        );
      }

      if (["single_choice", "multiple_choice", "dropdown", "ranking"].includes(question.type)) {
        const options = question.options.map((option) => option.trim());
        if (options.filter(Boolean).length < LIMITS.optionsMin) {
          add(
            `${prefix}.config.options`,
            `Add at least ${LIMITS.optionsMin} options.`,
          );
        }
        const seen = new Set<string>();
        options.forEach((option, optionIndex) => {
          if (!option) return;
          if (option.toLowerCase().startsWith("other:")) {
            add(
              `${prefix}.config.options.${optionIndex}`,
              'Options cannot start with "Other:".',
            );
          }
          const key = option.toLowerCase();
          if (seen.has(key)) {
            add(`${prefix}.config.options.${optionIndex}`, "Options must be unique.");
          }
          seen.add(key);
        });
      }

      if (question.type === "matrix") {
        if (question.rows.filter((row) => row.trim()).length < LIMITS.matrixRowsMin) {
          add(`${prefix}.config.rows`, "Add at least one matrix row.");
        }
        if (
          question.columns.filter((column) => column.trim()).length <
          LIMITS.matrixColumnsMin
        ) {
          add(
            `${prefix}.config.columns`,
            `Add at least ${LIMITS.matrixColumnsMin} matrix columns.`,
          );
        }
        for (const [label, values, path] of [
          ["rows", question.rows, `${prefix}.config.rows`],
          ["columns", question.columns, `${prefix}.config.columns`],
        ] as const) {
          const seen = new Set<string>();
          values.forEach((value, valueIndex) => {
            const key = value.trim().toLowerCase();
            if (!key) return;
            if (seen.has(key)) {
              add(`${path}.${valueIndex}`, `Matrix ${label} must be unique.`);
            }
            seen.add(key);
          });
        }
      }

      if (question.type === "slider") {
        const min = parseOptionalNumber(question.min);
        const max = parseOptionalNumber(question.max);
        const step = parseOptionalNumber(question.step);
        if (min === undefined || max === undefined) {
          add(`${prefix}.config`, "Slider questions require a minimum and maximum.");
        } else {
          if (min < LIMITS.sliderAbsMin || min > LIMITS.sliderAbsMax) {
            add(
              `${prefix}.config.min`,
              `Minimum must be between ${LIMITS.sliderAbsMin} and ${LIMITS.sliderAbsMax}.`,
            );
          }
          if (max < LIMITS.sliderAbsMin || max > LIMITS.sliderAbsMax) {
            add(
              `${prefix}.config.max`,
              `Maximum must be between ${LIMITS.sliderAbsMin} and ${LIMITS.sliderAbsMax}.`,
            );
          }
          if (max <= min) {
            add(`${prefix}.config.max`, "Maximum must be greater than minimum.");
          } else if (max - min > LIMITS.sliderSpanMax) {
            add(
              `${prefix}.config.max`,
              `The slider can span at most ${LIMITS.sliderSpanMax}.`,
            );
          }
        }
        if (step === undefined || step <= 0) {
          add(`${prefix}.config.step`, "Step must be greater than 0.");
        } else if (min !== undefined && max !== undefined && step > max - min) {
          add(`${prefix}.config.step`, "Step cannot be larger than the slider range.");
        }
      }

      if (question.type === "number") {
        const min = parseOptionalNumber(question.min);
        const max = parseOptionalNumber(question.max);
        const step = parseOptionalNumber(question.step);
        if (min !== undefined && (min < LIMITS.numberAbsMin || min > LIMITS.numberAbsMax)) {
          add(
            `${prefix}.config.min`,
            `Minimum must be between ${LIMITS.numberAbsMin} and ${LIMITS.numberAbsMax}.`,
          );
        }
        if (max !== undefined && (max < LIMITS.numberAbsMin || max > LIMITS.numberAbsMax)) {
          add(
            `${prefix}.config.max`,
            `Maximum must be between ${LIMITS.numberAbsMin} and ${LIMITS.numberAbsMax}.`,
          );
        }
        if (min !== undefined && max !== undefined && max <= min) {
          add(`${prefix}.config.max`, "Maximum must be greater than minimum.");
        }
        if (step !== undefined && step < LIMITS.numberStepMin) {
          add(`${prefix}.config.step`, `Step must be at least ${LIMITS.numberStepMin}.`);
        }
        if (
          step !== undefined &&
          min !== undefined &&
          max !== undefined &&
          step > max - min
        ) {
          add(`${prefix}.config.step`, "Step cannot be larger than the allowed range.");
        }
      }
    });

    return issues;
  }

  function updateQuestion(index: number, patch: Partial<EditorQuestion>) {
    setQuestions((prev) =>
      prev.map((question, i) => (i === index ? { ...question, ...patch } : question)),
    );
  }

  function changeType(index: number, type: QuestionType) {
    const fresh = emptyQuestion(type);
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === index ? { ...fresh, title: question.title, required: question.required } : question,
      ),
    );
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== questionIndex) return question;
        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options };
      }),
    );
  }

  function addOption(questionIndex: number) {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== questionIndex) return question;
        if (question.options.length >= LIMITS.optionsMax) return question;
        return { ...question, options: [...question.options, ""] };
      }),
    );
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== questionIndex) return question;
        if (question.options.length <= LIMITS.optionsMin) return question;
        return { ...question, options: question.options.filter((_, oi) => oi !== optionIndex) };
      }),
    );
  }

  function updateList(
    questionIndex: number,
    key: "rows" | "columns",
    itemIndex: number,
    value: string,
  ) {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== questionIndex) return question;
        const list = [...question[key]];
        list[itemIndex] = value;
        return { ...question, [key]: list };
      }),
    );
  }

  function addListItem(questionIndex: number, key: "rows" | "columns") {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== questionIndex) return question;
        const max =
          key === "rows" ? LIMITS.matrixRowsMax : LIMITS.matrixColumnsMax;
        if (question[key].length >= max) return question;
        return { ...question, [key]: [...question[key], ""] };
      }),
    );
  }

  function removeListItem(questionIndex: number, key: "rows" | "columns", itemIndex: number) {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== questionIndex) return question;
        const min = key === "rows" ? LIMITS.matrixRowsMin : LIMITS.matrixColumnsMin;
        if (question[key].length <= min) return question;
        return {
          ...question,
          [key]: question[key].filter((_, index) => index !== itemIndex),
        };
      }),
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    const clientIssues = validateClient(title, questions, {
      thankYouMessage,
      closesAt,
      maxResponses,
    });
    if (Object.keys(clientIssues).length > 0) {
      setErrors(clientIssues);
      setResult({
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: clientIssues,
      });
      scrollToFirstError(clientIssues);
      return;
    }
    setErrors({});

    setPending(true);
    try {
      const payload = buildPayload({
        title,
        description,
        thankYouMessage,
        closesAt,
        maxResponses,
        questions,
      });
      const response = isEdit
        ? await updateSurveyAction(survey!.id, payload)
        : await createSurveyAction(payload);

      setResult(response);

      if (response.ok && !isEdit && response.surveyId) {
        router.push(`/dashboard/surveys/${response.surveyId}/edit`);
      } else if (response.ok) {
        router.refresh();
      } else {
        const serverIssues = response.fieldErrors ?? {};
        setErrors(serverIssues);
        scrollToFirstError(serverIssues);
      }
    } catch {
      setResult({ ok: false, error: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {result ? (
        <Alert tone={result.ok ? "success" : "error"}>
          {result.ok ? (
            result.message ?? "Saved."
          ) : (
            <div>
              <p>{result.error}</p>
              {result.fieldErrors && Object.keys(result.fieldErrors).length > 0 ? (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                  {Array.from(
                    new Set(
                      Object.values(result.fieldErrors)
                        .flat()
                        .filter((message): message is string => Boolean(message)),
                    ),
                  )
                    .slice(0, 5)
                    .map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                </ul>
              ) : null}
            </div>
          )}
        </Alert>
      ) : null}

      {readOnlyStructure && isEdit ? (
        <Alert tone="info">
          This survey is {survey?.status}. You can still edit text and add options, but questions
          with responses keep their type and existing options.
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Survey details"
          description="Give your survey a clear title and an optional description for respondents."
        />
        <CardBody className="space-y-4">
          <Field
            label="Survey title"
            htmlFor="survey-title"
            error={fieldErrors?.title?.[0]}
          >
            <Input
              id="survey-title"
              value={title}
              maxLength={LIMITS.surveyTitleMax}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Student wellbeing survey"
              aria-invalid={fieldErrors?.title ? true : undefined}
              required
            />
          </Field>
          <Field
            label="Description (optional)"
            htmlFor="survey-description"
            error={fieldErrors?.description?.[0]}
          >
            <Textarea
              id="survey-description"
              value={description}
              maxLength={LIMITS.surveyDescriptionMax}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short introduction shown above the questions."
              aria-invalid={fieldErrors?.description ? true : undefined}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Response settings"
          description="Control the thank-you message and when the survey stops accepting responses."
        />
        <CardBody className="space-y-4">
          <Field
            label="Thank-you message (optional)"
            htmlFor="survey-thank-you"
            error={fieldErrors?.thankYouMessage?.[0]}
            hint="Shown after someone submits. Leave blank for the default message."
          >
            <Textarea
              id="survey-thank-you"
              value={thankYouMessage}
              maxLength={LIMITS.surveyThankYouMax}
              onChange={(e) => setThankYouMessage(e.target.value)}
              placeholder="Thanks for taking the time to share your feedback."
              aria-invalid={fieldErrors?.thankYouMessage ? true : undefined}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Close date and time (optional)"
              htmlFor="survey-closes-at"
              error={fieldErrors?.closesAt?.[0]}
              hint="The survey stops accepting responses at this local time."
            >
              <Input
                id="survey-closes-at"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                aria-invalid={fieldErrors?.closesAt ? true : undefined}
              />
            </Field>
            <Field
              label="Response limit (optional)"
              htmlFor="survey-max-responses"
              error={fieldErrors?.maxResponses?.[0]}
              hint={`Between 1 and ${LIMITS.surveyMaxResponsesMax}.`}
            >
              <Input
                id="survey-max-responses"
                type="number"
                min={1}
                max={LIMITS.surveyMaxResponsesMax}
                step={1}
                value={maxResponses}
                onChange={(e) => setMaxResponses(e.target.value)}
                placeholder="No limit"
                aria-invalid={fieldErrors?.maxResponses ? true : undefined}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4" id="questions-list">
        {questions.map((question, index) => (
          <Card
            key={question.id ?? `new-${index}`}
            id={`question-card-${index}`}
            className={cn(
              questionHasError(index) && "border-red-500/70 ring-1 ring-red-500/40",
            )}
          >
            <CardHeader
              title={`Question ${index + 1}`}
              description={question.id ? "Saved question" : "Not saved yet"}
              actions={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move question ${index + 1} up`}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === questions.length - 1}
                    aria-label={`Move question ${index + 1} down`}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                    aria-label={`Remove question ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" aria-hidden />
                  </Button>
                </div>
              }
            />
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Field
                  label="Question text"
                  htmlFor={`question-title-${index}`}
                  error={fieldErrors?.[`questions.${index}.title`]?.[0]}
                >
                  <Input
                    id={`question-title-${index}`}
                    value={question.title}
                    maxLength={LIMITS.questionTitleMax}
                    onChange={(e) => updateQuestion(index, { title: e.target.value })}
                    placeholder="How satisfied are you with the canteen?"
                    aria-invalid={errorFor(`questions.${index}.title`) ? true : undefined}
                    required
                  />
                </Field>
                <Field label="Type" htmlFor={`question-type-${index}`}>
                  <Select
                    id={`question-type-${index}`}
                    value={question.type}
                    onChange={(e) => changeType(index, e.target.value as QuestionType)}
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {QUESTION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field
                label="Help text (optional)"
                htmlFor={`question-help-${index}`}
                error={errorFor(`questions.${index}.config.helpText`)}
              >
                <Input
                  id={`question-help-${index}`}
                  value={question.helpText}
                  maxLength={LIMITS.questionHelpMax}
                  onChange={(e) => updateQuestion(index, { helpText: e.target.value })}
                  placeholder="A short hint shown under the question."
                  aria-invalid={
                    errorFor(`questions.${index}.config.helpText`) ? true : undefined
                  }
                />
              </Field>

              {["single_choice", "multiple_choice", "dropdown", "ranking"].includes(
                question.type,
              ) ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    {question.type === "ranking" ? "Items to rank" : "Options"}
                  </p>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Input
                          id={`option-${index}-${optionIndex}`}
                          value={option}
                          maxLength={LIMITS.optionLengthMax}
                          aria-label={`Option ${optionIndex + 1}`}
                          aria-invalid={
                            errorFor(`questions.${index}.config.options.${optionIndex}`) ||
                            errorFor(`questions.${index}.config.options`)
                              ? true
                              : undefined
                          }
                          onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                          placeholder={`${question.type === "ranking" ? "Item" : "Option"} ${
                            optionIndex + 1
                          }`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index, optionIndex)}
                          disabled={question.options.length <= LIMITS.optionsMin}
                          aria-label={`Remove option ${optionIndex + 1}`}
                        >
                          <Trash2 className="h-4 w-4 text-slate-500" aria-hidden />
                        </Button>
                      </div>
                      {errorFor(`questions.${index}.config.options.${optionIndex}`) ? (
                        <p className="text-xs font-medium text-red-600" role="alert">
                          {errorFor(`questions.${index}.config.options.${optionIndex}`)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(index)}
                    disabled={question.options.length >= LIMITS.optionsMax}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add {question.type === "ranking" ? "item" : "option"}
                  </Button>
                  {errorFor(`questions.${index}.config.options`) ? (
                    <p className="text-xs font-medium text-red-600" role="alert">
                      {errorFor(`questions.${index}.config.options`)}
                    </p>
                  ) : null}
                  {supportsOther(question.type) ? (
                    <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={question.allowOther}
                        onChange={(e) =>
                          updateQuestion(index, { allowOther: e.target.checked })
                        }
                      />
                      Add an “Other” free-text option
                    </label>
                  ) : null}
                  {["single_choice", "multiple_choice", "dropdown"].includes(
                    question.type,
                  ) ? (
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={question.shuffleOptions}
                        onChange={(e) =>
                          updateQuestion(index, { shuffleOptions: e.target.checked })
                        }
                      />
                      Shuffle option order for each respondent
                    </label>
                  ) : null}
                </div>
              ) : null}

              {question.type === "matrix" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {(
                    [
                      { key: "rows", label: "Rows", max: LIMITS.matrixRowsMax, min: LIMITS.matrixRowsMin },
                      {
                        key: "columns",
                        label: "Columns",
                        max: LIMITS.matrixColumnsMax,
                        min: LIMITS.matrixColumnsMin,
                      },
                    ] as const
                  ).map(({ key, label, max, min }) => (
                    <div key={key} className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">{label}</p>
                      {question[key].map((value, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-2">
                          <Input
                            value={value}
                            maxLength={LIMITS.matrixLabelMax}
                            aria-label={`${label} ${itemIndex + 1}`}
                            onChange={(e) => updateList(index, key, itemIndex, e.target.value)}
                            placeholder={`${label.slice(0, -1)} ${itemIndex + 1}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeListItem(index, key, itemIndex)}
                            disabled={question[key].length <= min}
                            aria-label={`Remove ${label.slice(0, -1)} ${itemIndex + 1}`}
                          >
                            <Trash2 className="h-4 w-4 text-slate-500" aria-hidden />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addListItem(index, key)}
                        disabled={question[key].length >= max}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Add {label.slice(0, -1).toLowerCase()}
                      </Button>
                      {errorFor(`questions.${index}.config.${key}`) ? (
                        <p className="text-xs font-medium text-red-600" role="alert">
                          {errorFor(`questions.${index}.config.${key}`)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {question.type === "slider" ? (
                <div className="grid gap-4 sm:grid-cols-5">
                  <Field
                    label="Min"
                    htmlFor={`min-${index}`}
                    hint={`${LIMITS.sliderAbsMin}–${LIMITS.sliderAbsMax}`}
                    error={errorFor(`questions.${index}.config.min`)}
                  >
                    <Input
                      id={`min-${index}`}
                      type="number"
                      value={question.min}
                      aria-invalid={errorFor(`questions.${index}.config.min`) ? true : undefined}
                      onChange={(e) => updateQuestion(index, { min: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Max"
                    htmlFor={`max-${index}`}
                    hint={`${LIMITS.sliderAbsMin}–${LIMITS.sliderAbsMax}`}
                    error={errorFor(`questions.${index}.config.max`)}
                  >
                    <Input
                      id={`max-${index}`}
                      type="number"
                      value={question.max}
                      aria-invalid={errorFor(`questions.${index}.config.max`) ? true : undefined}
                      onChange={(e) => updateQuestion(index, { max: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Step"
                    htmlFor={`step-${index}`}
                    error={errorFor(`questions.${index}.config.step`)}
                  >
                    <Input
                      id={`step-${index}`}
                      type="number"
                      min={LIMITS.sliderStepMin}
                      step="any"
                      value={question.step}
                      aria-invalid={errorFor(`questions.${index}.config.step`) ? true : undefined}
                      onChange={(e) => updateQuestion(index, { step: e.target.value })}
                    />
                  </Field>
                  <Field label="Min label" htmlFor={`min-label-${index}`}>
                    <Input
                      id={`min-label-${index}`}
                      value={question.minLabel}
                      maxLength={LIMITS.scaleLabelMax}
                      onChange={(e) => updateQuestion(index, { minLabel: e.target.value })}
                      placeholder="Low"
                    />
                  </Field>
                  <Field label="Max label" htmlFor={`max-label-${index}`}>
                    <Input
                      id={`max-label-${index}`}
                      value={question.maxLabel}
                      maxLength={LIMITS.scaleLabelMax}
                      onChange={(e) => updateQuestion(index, { maxLabel: e.target.value })}
                      placeholder="High"
                    />
                  </Field>
                </div>
              ) : null}

              {question.type === "number" ? (
                <div className="grid gap-4 sm:grid-cols-4">
                  <Field
                    label="Min (optional)"
                    htmlFor={`number-min-${index}`}
                    error={errorFor(`questions.${index}.config.min`)}
                  >
                    <Input
                      id={`number-min-${index}`}
                      type="number"
                      step="any"
                      value={question.min}
                      onChange={(e) => updateQuestion(index, { min: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Max (optional)"
                    htmlFor={`number-max-${index}`}
                    error={errorFor(`questions.${index}.config.max`)}
                  >
                    <Input
                      id={`number-max-${index}`}
                      type="number"
                      step="any"
                      value={question.max}
                      onChange={(e) => updateQuestion(index, { max: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Step (optional)"
                    htmlFor={`number-step-${index}`}
                    hint="Use 0.01 for decimals."
                    error={errorFor(`questions.${index}.config.step`)}
                  >
                    <Input
                      id={`number-step-${index}`}
                      type="number"
                      min={LIMITS.numberStepMin}
                      step="any"
                      value={question.step}
                      onChange={(e) => updateQuestion(index, { step: e.target.value })}
                    />
                  </Field>
                  <Field label="Placeholder" htmlFor={`placeholder-${index}`}>
                    <Input
                      id={`placeholder-${index}`}
                      value={question.placeholder}
                      maxLength={LIMITS.optionLengthMax}
                      onChange={(e) => updateQuestion(index, { placeholder: e.target.value })}
                      placeholder="Enter a number…"
                    />
                  </Field>
                </div>
              ) : null}

              {["short_text", "paragraph", "email"].includes(question.type) ? (
                <Field label="Placeholder (optional)" htmlFor={`placeholder-${index}`}>
                  <Input
                    id={`placeholder-${index}`}
                    value={question.placeholder}
                    maxLength={LIMITS.optionLengthMax}
                    onChange={(e) => updateQuestion(index, { placeholder: e.target.value })}
                    placeholder={
                      question.type === "email" ? "name@example.com" : "Type your answer…"
                    }
                  />
                </Field>
              ) : null}

              {question.type === "rating" ? (
                <Field label="Icon" htmlFor={`rating-icon-${index}`}>
                  <Select
                    id={`rating-icon-${index}`}
                    value={question.icon}
                    onChange={(e) =>
                      updateQuestion(index, {
                        icon: e.target.value as "star" | "heart" | "thumb",
                      })
                    }
                  >
                    <option value="star">Star</option>
                    <option value="heart">Heart</option>
                    <option value="thumb">Thumb</option>
                  </Select>
                </Field>
              ) : null}

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={question.required}
                  onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                />
                Required question
              </label>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className={cn("w-auto", "min-w-48")}
          aria-label="Add a question"
          value=""
          onChange={(e) => {
            if (!e.target.value) return;
            setQuestions((prev) =>
              prev.length >= LIMITS.questionMax
                ? prev
                : [...prev, emptyQuestion(e.target.value as QuestionType)],
            );
          }}
        >
          <option value="">Add question…</option>
          {QUESTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {QUESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
        <Badge tone="slate">
          {questions.length} / {LIMITS.questionMax} questions
        </Badge>
        <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Answers are validated against the saved question configuration.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-surface px-5 py-4">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create survey"}
        </Button>
        <span className="text-sm text-slate-500">
          {isEdit
            ? "Changes apply immediately to the public survey link."
            : "You can publish the survey after creating it."}
        </span>
      </div>
    </form>
  );
}
