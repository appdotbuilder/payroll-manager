import { z } from 'zod';

// Employee schema
export const employeeSchema = z.object({
  id: z.number(),
  employee_id: z.string(), // Unique employee identifier
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  department: z.string(),
  position: z.string(),
  monthly_salary: z.number(), // Base monthly salary
  hire_date: z.coerce.date(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Employee = z.infer<typeof employeeSchema>;

// Input schema for creating employees
export const createEmployeeInputSchema = z.object({
  employee_id: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  department: z.string().min(1),
  position: z.string().min(1),
  monthly_salary: z.number().positive(),
  hire_date: z.coerce.date()
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

// Input schema for updating employees
export const updateEmployeeInputSchema = z.object({
  id: z.number(),
  employee_id: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  department: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  monthly_salary: z.number().positive().optional(),
  hire_date: z.coerce.date().optional(),
  is_active: z.boolean().optional()
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  id: z.number(),
  employee_id: z.number(),
  date: z.coerce.date(),
  is_present: z.boolean(),
  hours_worked: z.number(), // Daily hours worked
  overtime_hours: z.number(), // Overtime hours
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Attendance = z.infer<typeof attendanceSchema>;

// Input schema for creating attendance records
export const createAttendanceInputSchema = z.object({
  employee_id: z.number(),
  date: z.coerce.date(),
  is_present: z.boolean(),
  hours_worked: z.number().min(0).max(24),
  overtime_hours: z.number().min(0).max(24),
  notes: z.string().nullable()
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceInputSchema>;

// Input schema for updating attendance records
export const updateAttendanceInputSchema = z.object({
  id: z.number(),
  is_present: z.boolean().optional(),
  hours_worked: z.number().min(0).max(24).optional(),
  overtime_hours: z.number().min(0).max(24).optional(),
  notes: z.string().nullable().optional()
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceInputSchema>;

// Deduction configuration schema
export const deductionConfigSchema = z.object({
  id: z.number(),
  name: z.string(), // e.g., "Income Tax", "Health Insurance", "Social Security"
  type: z.enum(['percentage', 'fixed']), // percentage of salary or fixed amount
  value: z.number(), // percentage (e.g., 0.15 for 15%) or fixed amount
  is_active: z.boolean(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type DeductionConfig = z.infer<typeof deductionConfigSchema>;

// Input schema for creating deduction configurations
export const createDeductionConfigInputSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  description: z.string().nullable()
});

export type CreateDeductionConfigInput = z.infer<typeof createDeductionConfigInputSchema>;

// Input schema for updating deduction configurations
export const updateDeductionConfigInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  type: z.enum(['percentage', 'fixed']).optional(),
  value: z.number().positive().optional(),
  is_active: z.boolean().optional(),
  description: z.string().nullable().optional()
});

export type UpdateDeductionConfigInput = z.infer<typeof updateDeductionConfigInputSchema>;

// Payslip schema
export const payslipSchema = z.object({
  id: z.number(),
  employee_id: z.number(),
  pay_period_start: z.coerce.date(),
  pay_period_end: z.coerce.date(),
  gross_pay: z.number(), // Base salary + overtime
  total_deductions: z.number(), // Sum of all deductions
  net_pay: z.number(), // Gross pay - total deductions
  regular_hours: z.number(), // Regular working hours in the period
  overtime_hours: z.number(), // Overtime hours in the period
  overtime_rate: z.number(), // Rate for overtime (e.g., 1.5x regular rate)
  deductions: z.string(), // JSON string of deduction details
  generated_at: z.coerce.date()
});

export type Payslip = z.infer<typeof payslipSchema>;

// Input schema for generating payslips
export const generatePayslipInputSchema = z.object({
  employee_id: z.number(),
  pay_period_start: z.coerce.date(),
  pay_period_end: z.coerce.date(),
  overtime_rate: z.number().positive().default(1.5) // Default 1.5x regular rate
});

export type GeneratePayslipInput = z.infer<typeof generatePayslipInputSchema>;

// Query input schemas
export const employeeIdInputSchema = z.object({
  id: z.number()
});

export type EmployeeIdInput = z.infer<typeof employeeIdInputSchema>;

export const attendanceQueryInputSchema = z.object({
  employee_id: z.number().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type AttendanceQueryInput = z.infer<typeof attendanceQueryInputSchema>;

export const payslipQueryInputSchema = z.object({
  employee_id: z.number().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type PayslipQueryInput = z.infer<typeof payslipQueryInputSchema>;