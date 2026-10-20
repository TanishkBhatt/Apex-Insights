import { emptyQuestion, type EditorDraft, type EditorQuestion } from "@/lib/surveys/editor";
import type { QuestionType } from "@/lib/validation/survey";

function question(
  type: QuestionType,
  title: string,
  overrides: Partial<EditorQuestion> = {},
  required = false,
): EditorQuestion {
  return { ...emptyQuestion(type), title, required, ...overrides };
}

export type SurveyTemplate = {
  id: string;
  name: string;
  description: string;
  tag: string;
  draft: EditorDraft;
};

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: "student-wellbeing",
    name: "Student wellbeing",
    description: "Check in on how students feel about school life and support.",
    tag: "Education",
    draft: {
      title: "Student wellbeing check-in",
      description:
        "A short, anonymous check-in about how you are feeling at school. There are no right or wrong answers.",
      thankYouMessage:
        "Thank you for checking in. If you need support, please speak to a teacher or school counsellor.",
      questions: [
        question("slider", "How are you feeling about school this week?", {
          helpText: "Move the slider to the number that best matches how you feel.",
          min: "1",
          max: "10",
          step: "1",
          minLabel: "Very low",
          maxLabel: "Very good",
        }, true),
        question("multiple_choice", "What has been going well recently?", {
          options: ["Friendships", "Lessons", "Clubs and activities", "My progress"],
          allowOther: true,
        }),
        question(
          "paragraph",
          "Is there anything you would like a teacher to know?",
          { placeholder: "Share as much or as little as you like…" },
        ),
      ],
    },
  },
  {
    id: "course-feedback",
    name: "Course feedback",
    description: "Collect ratings and suggestions at the end of a course or term.",
    tag: "Education",
    draft: {
      title: "Course feedback",
      description:
        "Help us improve this course by sharing your experience. Responses are anonymous.",
      thankYouMessage: "Thanks for your feedback — it directly shapes the next term.",
      questions: [
        question("rating", "How would you rate the course overall?", { icon: "star" }, true),
        question("single_choice", "How often did you feel challenged?", {
          options: ["Every lesson", "Most lessons", "Some lessons", "Rarely"],
        }, true),
        question("matrix", "How useful were each of these parts of the course?", {
          rows: ["Live lessons", "Course materials", "Assignments", "Feedback"],
          columns: ["Not useful", "Slightly", "Useful", "Very useful"],
        }, true),
        question("paragraph", "What is one thing we should keep or change?", {
          placeholder: "Your suggestion…",
        }),
      ],
    },
  },
  {
    id: "event-rsvp",
    name: "Event RSVP",
    description: "Gather attendance, guest details and dietary needs for an event.",
    tag: "Events",
    draft: {
      title: "Event RSVP",
      description:
        "Let us know whether you can make it so we can plan numbers and catering.",
      thankYouMessage: "You're on the list — we'll send final details by email.",
      questions: [
        question("short_text", "What is your full name?", {
          placeholder: "Your name",
        }, true),
        question("email", "What is your email address?", {
          placeholder: "name@example.com",
        }, true),
        question("single_choice", "Will you attend?", {
          options: ["Yes, in person", "Yes, online", "No, unable to attend"],
        }, true),
        question("number", "How many guests are you bringing?", {
          min: "0",
          max: "5",
          step: "1",
          placeholder: "0",
        }),
        question("paragraph", "Any dietary requirements or accessibility needs?", {
          placeholder: "Tell us what would help…",
        }),
      ],
    },
  },
  {
    id: "employee-pulse",
    name: "Employee pulse",
    description: "Run a quick anonymous pulse check with your team.",
    tag: "Workplace",
    draft: {
      title: "Team pulse check",
      description:
        "A quick anonymous check-in about workload, support and how we are working together.",
      thankYouMessage: "Thanks for taking a moment to share how things are going.",
      questions: [
        question("nps", "How likely are you to recommend this team as a place to work?", {}, true),
        question("rating", "How supported do you feel by your manager?", { icon: "thumb" }, true),
        question("slider", "How manageable is your current workload?", {
          min: "1",
          max: "5",
          step: "1",
          minLabel: "Overwhelming",
          maxLabel: "Very manageable",
        }, true),
        question("ranking", "What should we prioritise next quarter?", {
          options: ["Clearer priorities", "Fewer meetings", "More recognition", "Development time"],
        }),
        question("paragraph", "Anything else we should know?", {
          placeholder: "Optional comments…",
        }),
      ],
    },
  },
];

export function getSurveyTemplate(id: string | undefined): SurveyTemplate | undefined {
  if (!id) return undefined;
  return SURVEY_TEMPLATES.find((template) => template.id === id);
}
