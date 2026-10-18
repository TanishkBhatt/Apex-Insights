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
  type EditorQuestion,
  type EditorSurvey,
} from "@/lib/surveys/editor";
import {
  LIMITS,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  type QuestionType,
} from "@/lib/validation/survey";
import { cn } from "@/lib/utils";

function buildPayload(title: string, description: string, questions: EditorQuestion[]) {
  return {
    title: title.trim(),
    description: description.trim() || undefined,
    questions: questions.map((question) => {
      const base = {
        ...(question.id ? { id: question.id } : {}),
        type: question.type,
        title: question.title.trim(),
        required: question.required,
      };
      switch (question.type) {
        case "single_choice":
        case "multiple_choice":
        case "dropdown":
          return {
            ...base,
            config: { options: question.options.map((o) => o.trim()).filter(Boolean) },
          };
        case "linear_scale":
          return {
            ...base,
            config: {
              min: Number(question.min),
              max: Number(question.max),
              ...(question.minLabel.trim() ? { minLabel: question.minLabel.trim() } : {}),
              ...(question.maxLabel.trim() ? { maxLabel: question.maxLabel.trim() } : {}),
            },
          };
        case "short_text":
        case "paragraph":
          return {
            ...base,
            config: question.placeholder.trim()
              ? { placeholder: question.placeholder.trim() }
              : {},
          };
        default:
          return { ...base, config: {} };
      }
    }),
  };
}

export function SurveyEditor({ survey }: { survey?: EditorSurvey }) {
  const router = useRouter();
  const isEdit = Boolean(survey);

  const [title, setTitle] = useState(survey?.title ?? "");
  const [description, setDescription] = useState(survey?.description ?? "");
  const [questions, setQuestions] = useState<EditorQuestion[]>(
    survey?.questions.length ? survey.questions : [emptyQuestion("short_text")],
  );
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionState | null>(null);

  const readOnlyStructure = useMemo(() => survey?.status !== "draft", [survey?.status]);

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

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);

    if (!title.trim()) {
      setResult({ ok: false, error: "A survey title is required." });
      return;
    }
    if (questions.length === 0) {
      setResult({ ok: false, error: "Add at least one question." });
      return;
    }
    const blankQuestion = questions.findIndex((question) => !question.title.trim());
    if (blankQuestion !== -1) {
      setResult({
        ok: false,
        error: `Question ${blankQuestion + 1} needs a question text.`,
      });
      return;
    }
    const blankChoice = questions.findIndex(
      (question) =>
        ["single_choice", "multiple_choice", "dropdown"].includes(question.type) &&
        question.options.map((o) => o.trim()).filter(Boolean).length < LIMITS.optionsMin,
    );
    if (blankChoice !== -1) {
      setResult({
        ok: false,
        error: `Question ${blankChoice + 1} needs at least ${LIMITS.optionsMin} options.`,
      });
      return;
    }

    setPending(true);
    try {
      const payload = buildPayload(title, description, questions);
      const response = isEdit
        ? await updateSurveyAction(survey!.id, payload)
        : await createSurveyAction(payload);

      setResult(response);

      if (response.ok && !isEdit && response.surveyId) {
        router.push(`/dashboard/surveys/${response.surveyId}/edit`);
      } else if (response.ok) {
        router.refresh();
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
          {result.ok ? (result.message ?? "Saved.") : result.error}
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
            />
          </Field>
        </CardBody>
      </Card>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id ?? `new-${index}`}>
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

              {["single_choice", "multiple_choice", "dropdown"].includes(question.type) ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Options</p>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <Input
                        value={option}
                        maxLength={LIMITS.optionLengthMax}
                        aria-label={`Option ${optionIndex + 1}`}
                        onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
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
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(index)}
                    disabled={question.options.length >= LIMITS.optionsMax}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add option
                  </Button>
                  {fieldErrors?.[`questions.${index}.config.options`]?.[0] ? (
                    <p className="text-xs font-medium text-red-600">
                      {fieldErrors[`questions.${index}.config.options`]?.[0]}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {question.type === "linear_scale" ? (
                <div className="grid gap-4 sm:grid-cols-4">
                  <Field label="Min" htmlFor={`min-${index}`}>
                    <Input
                      id={`min-${index}`}
                      type="number"
                      min={LIMITS.scaleMinMin}
                      max={LIMITS.scaleMinMax}
                      value={question.min}
                      onChange={(e) => updateQuestion(index, { min: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Max" htmlFor={`max-${index}`}>
                    <Input
                      id={`max-${index}`}
                      type="number"
                      min={LIMITS.scaleMaxMin}
                      max={LIMITS.scaleMaxMax}
                      value={question.max}
                      onChange={(e) => updateQuestion(index, { max: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Min label" htmlFor={`min-label-${index}`}>
                    <Input
                      id={`min-label-${index}`}
                      value={question.minLabel}
                      maxLength={LIMITS.scaleLabelMax}
                      onChange={(e) => updateQuestion(index, { minLabel: e.target.value })}
                      placeholder="Not at all"
                    />
                  </Field>
                  <Field label="Max label" htmlFor={`max-label-${index}`}>
                    <Input
                      id={`max-label-${index}`}
                      value={question.maxLabel}
                      maxLength={LIMITS.scaleLabelMax}
                      onChange={(e) => updateQuestion(index, { maxLabel: e.target.value })}
                      placeholder="Very much"
                    />
                  </Field>
                </div>
              ) : null}

              {question.type === "short_text" || question.type === "paragraph" ? (
                <Field label="Placeholder (optional)" htmlFor={`placeholder-${index}`}>
                  <Input
                    id={`placeholder-${index}`}
                    value={question.placeholder}
                    maxLength={LIMITS.optionLengthMax}
                    onChange={(e) => updateQuestion(index, { placeholder: e.target.value })}
                    placeholder="Type your answer…"
                  />
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
              prev.length >= LIMITS.questionMax ? prev : [...prev, emptyQuestion(e.target.value as QuestionType)],
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
