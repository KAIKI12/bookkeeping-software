import { z } from 'zod'

export const billSchema = z.object({
  id: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  categoryId: z.string(),
  tagIds: z.array(z.string()).default([]),
  note: z.string().default(''),
  occurredAt: z.string(),
  source: z.enum(['manual', 'voice', 'chat', 'import']),
})

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['income', 'expense']),
  system: z.boolean().default(false),
})

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const savingGoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0),
  targetDate: z.string().optional(),
})

export const importRecordSchema = z.object({
  id: z.string(),
  source: z.enum(['wechat', 'alipay']),
  importedAt: z.string(),
  totalCount: z.number().int().min(0),
  importedCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
})

export type Bill = z.infer<typeof billSchema>
export type Category = z.infer<typeof categorySchema>
export type Tag = z.infer<typeof tagSchema>
export type SavingGoal = z.infer<typeof savingGoalSchema>
export type ImportRecord = z.infer<typeof importRecordSchema>
