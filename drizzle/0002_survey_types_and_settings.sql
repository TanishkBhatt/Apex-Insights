ALTER TABLE "questions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."question_type";--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('short_text', 'paragraph', 'number', 'email', 'single_choice', 'multiple_choice', 'dropdown', 'slider', 'rating', 'nps', 'ranking', 'matrix', 'yes_no', 'linear_scale');--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "type" SET DATA TYPE "public"."question_type" USING "type"::"public"."question_type";--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "thank_you_message" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "closes_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "max_responses" integer;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_max_responses_positive" CHECK ("surveys"."max_responses" IS NULL OR "surveys"."max_responses" > 0);