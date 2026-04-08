import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core'

export const billsTable = sqliteTable('bills', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  amount: real('amount').notNull(),
  categoryId: text('category_id').notNull(),
  note: text('note').notNull().default(''),
  occurredAt: text('occurred_at').notNull(),
  source: text('source').notNull(),
})

export const categoriesTable = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  system: integer('system', { mode: 'boolean' }).notNull().default(false),
})

export const tagsTable = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
})

export const billTagsTable = sqliteTable('bill_tags', {
  billId: text('bill_id').notNull(),
  tagId: text('tag_id').notNull(),
})

export const savingGoalsTable = sqliteTable('saving_goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  targetDate: text('target_date'),
})

export const importRecordsTable = sqliteTable('import_records', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  importedAt: text('imported_at').notNull(),
  totalCount: integer('total_count').notNull(),
  importedCount: integer('imported_count').notNull(),
  skippedCount: integer('skipped_count').notNull(),
})
