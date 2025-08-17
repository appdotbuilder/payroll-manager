import { db } from '../db';
import { employeesTable, attendanceTable, deductionConfigsTable, payslipsTable } from '../db/schema';
import { type GeneratePayslipInput, type Payslip } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const generatePayslip = async (input: GeneratePayslipInput): Promise<Payslip> => {
  try {
    // 1. Fetch employee details and monthly salary
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, input.employee_id))
      .execute();

    if (employee.length === 0) {
      throw new Error('Employee not found');
    }

    if (!employee[0].is_active) {
      throw new Error('Employee is not active');
    }

    const employeeData = employee[0];
    const monthlySalary = parseFloat(employeeData.monthly_salary);

    // 2. Calculate working days and total days in the pay period
    const startDate = new Date(input.pay_period_start);
    const endDate = new Date(input.pay_period_end);
    
    if (startDate > endDate) {
      throw new Error('Pay period start date cannot be after end date');
    }

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dailyRate = monthlySalary / 30; // Assuming 30 days per month for calculation

    // 3. Fetch attendance records for the period
    const attendanceRecords = await db.select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employee_id, input.employee_id),
          gte(attendanceTable.date, input.pay_period_start.toISOString().split('T')[0]),
          lte(attendanceTable.date, input.pay_period_end.toISOString().split('T')[0])
        )
      )
      .execute();

    // 4. Calculate gross pay
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let workedDays = 0;

    attendanceRecords.forEach(record => {
      if (record.is_present) {
        workedDays++;
        totalRegularHours += parseFloat(record.hours_worked);
        totalOvertimeHours += parseFloat(record.overtime_hours);
      }
    });

    // Calculate base pay for worked days
    const basePay = (dailyRate * workedDays);
    
    // Calculate hourly rate for overtime (assuming 8-hour workday)
    const hourlyRate = dailyRate / 8;
    const overtimePay = totalOvertimeHours * hourlyRate * input.overtime_rate;
    
    const grossPay = basePay + overtimePay;

    // 5. Fetch active deduction configurations
    const deductionConfigs = await db.select()
      .from(deductionConfigsTable)
      .where(eq(deductionConfigsTable.is_active, true))
      .execute();

    // 6. Apply deductions
    let totalDeductions = 0;
    const deductionDetails: any[] = [];

    deductionConfigs.forEach(config => {
      const configValue = parseFloat(config.value);
      let deductionAmount = 0;

      if (config.type === 'percentage') {
        deductionAmount = grossPay * configValue;
      } else {
        deductionAmount = configValue;
      }

      totalDeductions += deductionAmount;
      
      deductionDetails.push({
        name: config.name,
        type: config.type,
        value: configValue,
        amount: deductionAmount
      });
    });

    // 7. Calculate net pay
    const netPay = grossPay - totalDeductions;

    // 8. Store deduction details as JSON
    const deductionsJson = JSON.stringify(deductionDetails);

    // 9. Save and return the generated payslip
    const result = await db.insert(payslipsTable)
      .values({
        employee_id: input.employee_id,
        pay_period_start: input.pay_period_start.toISOString().split('T')[0],
        pay_period_end: input.pay_period_end.toISOString().split('T')[0],
        gross_pay: grossPay.toString(),
        total_deductions: totalDeductions.toString(),
        net_pay: netPay.toString(),
        regular_hours: totalRegularHours.toString(),
        overtime_hours: totalOvertimeHours.toString(),
        overtime_rate: input.overtime_rate.toString(),
        deductions: deductionsJson
      })
      .returning()
      .execute();

    const payslip = result[0];
    return {
      ...payslip,
      pay_period_start: new Date(payslip.pay_period_start),
      pay_period_end: new Date(payslip.pay_period_end),
      gross_pay: parseFloat(payslip.gross_pay),
      total_deductions: parseFloat(payslip.total_deductions),
      net_pay: parseFloat(payslip.net_pay),
      regular_hours: parseFloat(payslip.regular_hours),
      overtime_hours: parseFloat(payslip.overtime_hours),
      overtime_rate: parseFloat(payslip.overtime_rate)
    };

  } catch (error) {
    console.error('Payslip generation failed:', error);
    throw error;
  }
};