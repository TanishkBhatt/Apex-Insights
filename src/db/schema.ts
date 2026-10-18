import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type QuestionType =
  | "short_text"
  | "paragraph"
  | "single_choice"
  | "multiple_choice"
  | "dropdown"
  | "linear_scale"
  | "yes_no";

export type SurveyStatus = "draft" | "published" | "closed";

/**
 * Structured, validated question configuration stored as JSONB.
 * Which fields are required for a given type is enforced by Zod
 * (src/lib/validation/question.ts) and by CHECK constraints below.
 */
export type QuestionConfig = {
  options?: string[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
};

export type AnswerValue = string | number | boolean | string[];

/* ------------------------------------------------------------------ */
/* Better Auth tables (official Drizzle integration shape)            */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Surveys                                                             */
/* ------------------------------------------------------------------ */

export const surveyStatus = pgEnum("survey_status", ["draft", "published", "closed"]);

export const questionTypeEnum = pgEnum("question_type", [
  "short_text",
  "paragraph",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "linear_scale",
  "yes_no",
]);

export const surveys = pgTable(
  "surveys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    slug: text("slug").notNull().unique(),
    status: surveyStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    index("surveys_owner_id_idx").on(t.ownerId),
    index("surveys_status_idx").on(t.status),
    check("surveys_title_not_blank", sql`length(btrim(${t.title})) BETWEEN 1 AND 300`),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull(),
    title: text("title").notNull(),
    required: boolean("required").notNull().default(false),
    position: integer("position").notNull(),
    config: jsonb("config").$type<QuestionConfig>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("questions_survey_position_uq").on(t.surveyId, t.position),
    index("questions_survey_id_idx").on(t.surveyId),
    check("questions_position_non_negative", sql`${t.position} >= 0`),
    check("questions_title_not_blank", sql`length(btrim(${t.title})) BETWEEN 1 AND 500`),
  ],
);

/* ------------------------------------------------------------------ */
/* Real responses                                                      */
/* ------------------------------------------------------------------ */

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("responses_survey_id_idx").on(t.surveyId)],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    value: jsonb("value").$type<AnswerValue>().notNull(),
  },
  (t) => [
    uniqueIndex("answers_response_question_uq").on(t.responseId, t.questionId),
    index("answers_question_id_idx").on(t.questionId),
    index("answers_response_id_idx").on(t.responseId),
  ],
);

/* ------------------------------------------------------------------ */
/* Synthetic demo data (fully separate from real responses)            */
/* ------------------------------------------------------------------ */

export const demoDatasets = pgTable(
  "demo_datasets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" })
      .unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seed: text("seed").notNull(),
    generatorVersion: text("generator_version").notNull(),
    config: jsonb("config")
      .$type<{ count: number; pattern: string }>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("demo_datasets_owner_id_idx").on(t.ownerId),
    check(
      "demo_datasets_count_range",
      sql`(${t.config}->>'count')::int BETWEEN 1 AND 2000`,
    ),
  ],
);

export const demoResponses = pgTable(
  "demo_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => demoDatasets.id, { onDelete: "cascade" }),
    seedIndex: integer("seed_index").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("demo_responses_dataset_id_idx").on(t.datasetId),
    uniqueIndex("demo_responses_dataset_seed_index_uq").on(t.datasetId, t.seedIndex),
  ],
);

export const demoAnswers = pgTable(
  "demo_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    demoResponseId: uuid("demo_response_id")
      .notNull()
      .references(() => demoResponses.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    value: jsonb("value").$type<AnswerValue>().notNull(),
  },
  (t) => [
    uniqueIndex("demo_answers_response_question_uq").on(t.demoResponseId, t.questionId),
    index("demo_answers_question_id_idx").on(t.questionId),
  ],
);

export type User = typeof user.$inferSelect;
export type Survey = typeof surveys.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type ResponseRow = typeof responses.$inferSelect;
export type AnswerRow = typeof answers.$inferSelect;
export type DemoDataset = typeof demoDatasets.$inferSelect;
export type DemoResponseRow = typeof demoResponses.$inferSelect;
export type DemoAnswerRow = typeof demoAnswers.$inferSelect;
