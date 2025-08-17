import { db } from '../db';
import { payslipsTable, employeesTable } from '../db/schema';
import { type PayslipQueryInput, type Payslip } from '../schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';

export async function getPayslips(input: PayslipQueryInput): Promise<Payslip[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by employee_id if provided
    if (input.employee_id !== undefined) {
      conditions.push(eq(payslipsTable.employee_id, input.employee_id));
    }

    // Filter by date range if provided - convert Date to string for comparison
    if (input.start_date !== undefined) {
      const startDateStr = input.start_date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
      conditions.push(gte(payslipsTable.pay_period_start, startDateStr));
    }

    if (input.end_date !== undefined) {
      const endDateStr = input.end_date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
      conditions.push(lte(payslipsTable.pay_period_end, endDateStr));
    }

    // If no filters provided, default to last 6 months
    if (conditions.length === 0) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
      conditions.push(gte(payslipsTable.pay_period_start, sixMonthsAgoStr));
    }

    // Build the complete query in one chain to maintain types
    const results = await db.select()
      .from(payslipsTable)
      .innerJoin(employeesTable, eq(payslipsTable.employee_id, employeesTable.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(payslipsTable.generated_at))
      .execute();

    // Convert numeric fields and parse dates properly
    return results.map(result => ({
      id: result.payslips.id,
      employee_id: result.payslips.employee_id,
      pay_period_start: new Date(result.payslips.pay_period_start), // Convert string to Date
      pay_period_end: new Date(result.payslips.pay_period_end), // Convert string to Date
      gross_pay: parseFloat(result.payslips.gross_pay),
      total_deductions: parseFloat(result.payslips.total_deductions),
      net_pay: parseFloat(result.payslips.net_pay),
      regular_hours: parseFloat(result.payslips.regular_hours),
      overtime_hours: parseFloat(result.payslips.overtime_hours),
      overtime_rate: parseFloat(result.payslips.overtime_rate),
      deductions: result.payslips.deductions,
      generated_at: result.payslips.generated_at // This is already a Date from timestamp column
    }));
  } catch (error) {
    console.error('Failed to fetch payslips:', error);
    throw error;
  }
}