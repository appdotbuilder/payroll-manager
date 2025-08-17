import { serial, text, pgTable, timestamp, numeric, integer, boolean, date, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for deduction types
export const deductionTypeEnum = pgEnum('deduction_type', ['percentage', 'fixed']);

// Employees table
export const employeesTable = pgTable('employees', {
  id: serial('id').primaryKey(),
  employee_id: text('employee_id').notNull().unique(), // Unique employee identifier
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'), // Nullable by default
  department: text('department').notNull(),
  position: text('position').notNull(),
  monthly_salary: numeric('monthly_salary', { precision: 10, scale: 2 }).notNull(),
  hire_date: date('hire_date').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Attendance table
export const attendanceTable = pgTable('attendance', {
  id: serial('id').primaryKey(),
  employee_id: integer('employee_id').references(() => employeesTable.id).notNull(),
  date: date('date').notNull(),
  is_present: boolean('is_present').default(true).notNull(),
  hours_worked: numeric('hours_worked', { precision: 4, scale: 2 }).default('0').notNull(),
  overtime_hours: numeric('overtime_hours', { precision: 4, scale: 2 }).default('0').notNull(),
  notes: text('notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Deduction configurations table
export const deductionConfigsTable = pgTable('deduction_configs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: deductionTypeEnum('type').notNull(),
  value: numeric('value', { precision: 10, scale: 4 }).notNull(), // Supports both percentages and fixed amounts
  is_active: boolean('is_active').default(true).notNull(),
  description: text('description'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Payslips table
export const payslipsTable = pgTable('payslips', {
  id: serial('id').primaryKey(),
  employee_id: integer('employee_id').references(() => employeesTable.id).notNull(),
  pay_period_start: date('pay_period_start').notNull(),
  pay_period_end: date('pay_period_end').notNull(),
  gross_pay: numeric('gross_pay', { precision: 10, scale: 2 }).notNull(),
  total_deductions: numeric('total_deductions', { precision: 10, scale: 2 }).notNull(),
  net_pay: numeric('net_pay', { precision: 10, scale: 2 }).notNull(),
  regular_hours: numeric('regular_hours', { precision: 6, scale: 2 }).notNull(),
  overtime_hours: numeric('overtime_hours', { precision: 6, scale: 2 }).default('0').notNull(),
  overtime_rate: numeric('overtime_rate', { precision: 4, scale: 2 }).default('1.5').notNull(),
  deductions: text('deductions').notNull(), // JSON string of deduction details
  generated_at: timestamp('generated_at').defaultNow().notNull(),
});

// Define relations
export const employeesRelations = relations(employeesTable, ({ many }) => ({
  attendance: many(attendanceTable),
  payslips: many(payslipsTable),
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [attendanceTable.employee_id],
    references: [employeesTable.id],
  }),
}));

export const payslipsRelations = relations(payslipsTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [payslipsTable.employee_id],
    references: [employeesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Employee = typeof employeesTable.$inferSelect;
export type NewEmployee = typeof employeesTable.$inferInsert;

export type Attendance = typeof attendanceTable.$inferSelect;
export type NewAttendance = typeof attendanceTable.$inferInsert;

export type DeductionConfig = typeof deductionConfigsTable.$inferSelect;
export type NewDeductionConfig = typeof deductionConfigsTable.$inferInsert;

export type Payslip = typeof payslipsTable.$inferSelect;
export type NewPayslip = typeof payslipsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  employees: employeesTable,
  attendance: attendanceTable,
  deductionConfigs: deductionConfigsTable,
  payslips: payslipsTable,
};