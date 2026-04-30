import { z } from "zod";

export const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  estimate_hours: z.number().optional(),
});

export const StorySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  specialty: z.string().default("generalist"),
  // Until feat/assignment-sprints lands, the LLM still picks assignee. After,
  // the backend pipeline writes it deterministically and the LLM emits null.
  assignee: z.string().nullable().default(""),
  estimate_points: z.number().default(0),
  depends_on: z.array(z.string()).default([]),
  subtasks: z.array(SubtaskSchema).default([]),
});

export const EpicSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string().default(""),
  stories: z.array(StorySchema).default([]),
});

export const TeamMemberSchema = z.object({
  name: z.string(),
  specialties: z.array(z.string()).default([]),
  capacity_pct: z.number().default(100),
});

export const PhaseTrackSchema = z.object({
  member: z.string(),
  story_ids: z.array(z.string()).default([]),
});

export const PhaseSchema = z.object({
  phase: z.number(),
  parallel_tracks: z.array(PhaseTrackSchema).default([]),
  rationale: z.string().default(""),
});

export const RiskSchema = z.object({
  risk: z.string(),
  mitigation: z.string().default(""),
});

// feat/assignment-sprints follow-up: sprint planning fields.
// Both are optional so plans produced before the sprints branch lands still validate.
export const SprintSchema = z.object({
  number: z.number(),
  name: z.string(),
  length_weeks: z.number().default(2),
  story_ids: z.array(z.string()).default([]),
  rationale: z.string().default(""),
});

export const SprintConfigSchema = z.object({
  length_weeks: z.number().default(2),
  suggested_count: z.number().optional(),
  default_velocity_points_per_member: z.number().optional(),
  rationale: z.string().default(""),
});

export const ExecutionPlanSchema = z.object({
  phases: z.array(PhaseSchema).default([]),
  critical_path: z.array(z.string()).default([]),
  risks: z.array(RiskSchema).default([]),
  estimated_time_saved_minutes: z.number().optional(),
  // optional client-side annotations
  _load_by_member: z.record(z.number()).optional(),
  _dag_report: z
    .object({
      unknown_refs: z.array(z.tuple([z.string(), z.string()])).default([]),
      cycles: z.array(z.array(z.string())).default([]),
      ok: z.boolean(),
    })
    .optional(),
});

export const ProjectMetaSchema = z.object({
  name: z.string(),
  key: z.string(),
  summary: z.string().default(""),
  vision: z.string().default(""),
});

export const ProjectSchema = z.object({
  project: ProjectMetaSchema,
  team: z.array(TeamMemberSchema).default([]),
  epics: z.array(EpicSchema).default([]),
  execution_plan: ExecutionPlanSchema.default({
    phases: [],
    critical_path: [],
    risks: [],
  }),
  // feat/assignment-sprints follow-up: optional until that branch lands.
  sprints: z.array(SprintSchema).optional(),
  sprint_config: SprintConfigSchema.optional(),
});

export type Subtask = z.infer<typeof SubtaskSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Epic = z.infer<typeof EpicSchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type Sprint = z.infer<typeof SprintSchema>;
export type SprintConfig = z.infer<typeof SprintConfigSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;
export type Project = z.infer<typeof ProjectSchema>;
