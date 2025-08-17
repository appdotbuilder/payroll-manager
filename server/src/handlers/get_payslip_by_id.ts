import { db } from '../db';
import { payslipsTable } from '../db/schema';
import { type Payslip } from '../schema';
import { eq } from 'drizzle-orm';

export interface GetPayslipByIdInput {
  id: number;
}

export const getPayslipById = async (input: GetPayslipByIdInput): Promise<Payslip | null> => {
  try {
    // Query payslip by ID
    const results = await db.select()
      .from(payslipsTable)
      .where(eq(payslipsTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const payslip = results[0];
    
    // Convert numeric and date fields back to proper types before returning
    return {
      ...payslip,
      gross_pay: parseFloat(payslip.gross_pay),
      total_deductions: parseFloat(payslip.total_deductions),
      net_pay: parseFloat(payslip.net_pay),
      regular_hours: parseFloat(payslip.regular_hours),
      overtime_hours: parseFloat(payslip.overtime_hours),
      overtime_rate: parseFloat(payslip.overtime_rate),
      pay_period_start: new Date(payslip.pay_period_start),
      pay_period_end: new Date(payslip.pay_period_end),
      generated_at: new Date(payslip.generated_at)
    };
  } catch (error) {
    console.error('Payslip retrieval failed:', error);
    throw error;
  }
};