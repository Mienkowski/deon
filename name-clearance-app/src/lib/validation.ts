import { z } from "zod";

export const niceClassSchema = z.object({
  classNumber: z.number().int().min(1).max(45),
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  selected: z.boolean(),
  source: z.enum(["rule", "llm", "user"]),
});

export const candidateSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(200),
  markType: z.enum([
    "product", "service", "company", "project", "application",
    "technology", "event", "organization", "personal_brand",
  ]),
  description: z.string().max(2000).default(""),
  industry: z.string().max(300).default(""),
  territories: z.array(z.string().min(2).max(3)).min(1, "Wybierz co najmniej jedno terytorium"),
  plannedDomain: z.string().max(255).optional(),
  languages: z.array(z.string()).optional(),
  customerGroups: z.string().max(500).optional(),
  usageDescription: z.string().max(1000).optional(),
  goodsServices: z.string().max(1000).optional(),
  niceClasses: z.array(niceClassSchema).optional(),
  plannedStartDate: z.string().optional(),
  spellingVariants: z.array(z.string()).optional(),
  slogan: z.string().max(300).optional(),
  hasLogo: z.boolean().optional(),
  competitors: z.array(z.string()).optional(),
  priorityMarkets: z.array(z.string()).optional(),
});

export const suggestSchema = z.object({
  description: z.string().max(2000).default(""),
  industry: z.string().max(300).default(""),
  goodsServices: z.string().max(1000).default(""),
});

export type CandidateInput = z.infer<typeof candidateSchema>;
