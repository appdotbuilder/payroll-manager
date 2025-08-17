import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable, attendanceTable, deductionConfigsTable, payslipsTable } from '../db/schema';
import { type GeneratePayslipInput } from '../schema';
import { generatePayslip } from '../handlers/generate_payslip';
import { eq } from 'drizzle-orm';

describe('generatePayslip', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test employee
  const createTestEmployee = async () => {
    const result = await db.insert(employeesTable)
      .values({
        employee_id: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        department: 'IT',
        position: 'Developer',
        monthly_salary: '5000.00',
        hire_date: '2023-01-01',
        is_active: true
      })
      .returning()
      .execute();
    return result[0];
  };

  // Create test deduction configs
  const createTestDeductions = async () => {
    await db.insert(deductionConfigsTable)
      .values([
        {
          name: 'Income Tax',
          type: 'percentage',
          value: '0.15', // 15%
          is_active: true,
          description: 'Income tax deduction'
        },
        {
          name: 'Health Insurance',
          type: 'fixed',
          value: '100.00',
          is_active: true,
          description: 'Health insurance premium'
        },
        {
          name: 'Inactive Deduction',
          type: 'fixed',
          value: '50.00',
          is_active: false,
          description: 'Should not be applied'
        }
      ])
      .execute();
  };

  // Create test attendance records
  const createTestAttendance = async (employeeId: number) => {
    await db.insert(attendanceTable)
      .values([
        {
          employee_id: employeeId,
          date: '2024-01-01',
          is_present: true,
          hours_worked: '8.00',
          overtime_hours: '2.00',
          notes: 'Regular work day with overtime'
        },
        {
          employee_id: employeeId,
          date: '2024-01-02',
          is_present: true,
          hours_worked: '8.00',
          overtime_hours: '0.00',
          notes: 'Regular work day'
        },
        {
          employee_id: employeeId,
          date: '2024-01-03',
          is_present: false,
          hours_worked: '0.00',
          overtime_hours: '0.00',
          notes: 'Absent'
        },
        {
          employee_id: employeeId,
          date: '2024-01-04',
          is_present: true,
          hours_worked: '8.00',
          overtime_hours: '1.00',
          notes: 'Regular work day with some overtime'
        }
      ])
      .execute();
  };

  const testInput: GeneratePayslipInput = {
    employee_id: 1,
    pay_period_start: new Date('2024-01-01'),
    pay_period_end: new Date('2024-01-05'),
    overtime_rate: 1.5
  };

  it('should generate a payslip successfully', async () => {
    const employee = await createTestEmployee();
    await createTestDeductions();
    await createTestAttendance(employee.id);

    const input = { ...testInput, employee_id: employee.id };
    const result = await generatePayslip(input);

    // Basic field validation
    expect(result.employee_id).toEqual(employee.id);
    expect(result.pay_period_start.toISOString()).toEqual(input.pay_period_start.toISOString());
    expect(result.pay_period_end.toISOString()).toEqual(input.pay_period_end.toISOString());
    expect(result.overtime_rate).toEqual(1.5);
    expect(result.id).toBeDefined();
    expect(result.generated_at).toBeInstanceOf(Date);

    // Verify numeric fields are numbers
    expect(typeof result.gross_pay).toBe('number');
    expect(typeof result.total_deductions).toBe('number');
    expect(typeof result.net_pay).toBe('number');
    expect(typeof result.regular_hours).toBe('number');
    expect(typeof result.overtime_hours).toBe('number');

    // Verify calculations
    expect(result.regular_hours).toEqual(24); // 8+8+0+8 hours worked
    expect(result.overtime_hours).toEqual(3); // 2+0+0+1 overtime hours

    // Daily rate = 5000/30 = 166.67, worked 3 days = 500
    // Overtime: 3 hours * (166.67/8) * 1.5 = ~93.75
    // Gross pay should be around 593.75
    expect(result.gross_pay).toBeCloseTo(593.75, 2);

    // Deductions: 15% of gross pay + 100 fixed
    const expectedTaxDeduction = result.gross_pay * 0.15;
    const expectedTotalDeductions = expectedTaxDeduction + 100;
    expect(result.total_deductions).toBeCloseTo(expectedTotalDeductions, 2);

    // Net pay = gross - deductions
    expect(result.net_pay).toBeCloseTo(result.gross_pay - result.total_deductions, 2);

    // Verify deductions JSON
    const deductions = JSON.parse(result.deductions);
    expect(deductions).toHaveLength(2); // Only active deductions
    expect(deductions[0].name).toEqual('Income Tax');
    expect(deductions[0].type).toEqual('percentage');
    expect(deductions[1].name).toEqual('Health Insurance');
    expect(deductions[1].type).toEqual('fixed');
  });

  it('should save payslip to database', async () => {
    const employee = await createTestEmployee();
    await createTestDeductions();
    await createTestAttendance(employee.id);

    const input = { ...testInput, employee_id: employee.id };
    const result = await generatePayslip(input);

    // Verify saved in database
    const payslips = await db.select()
      .from(payslipsTable)
      .where(eq(payslipsTable.id, result.id))
      .execute();

    expect(payslips).toHaveLength(1);
    expect(payslips[0].employee_id).toEqual(employee.id);
    expect(parseFloat(payslips[0].gross_pay)).toEqual(result.gross_pay);
    expect(parseFloat(payslips[0].net_pay)).toEqual(result.net_pay);
  });

  it('should handle employee with no attendance records', async () => {
    const employee = await createTestEmployee();
    await createTestDeductions();
    // No attendance records created

    const input = { ...testInput, employee_id: employee.id };
    const result = await generatePayslip(input);

    expect(result.regular_hours).toEqual(0);
    expect(result.overtime_hours).toEqual(0);
    expect(result.gross_pay).toEqual(0);
    expect(result.net_pay).toEqual(-100); // Only fixed deductions applied
  });

  it('should handle employee with no deduction configs', async () => {
    const employee = await createTestEmployee();
    await createTestAttendance(employee.id);
    // No deduction configs created

    const input = { ...testInput, employee_id: employee.id };
    const result = await generatePayslip(input);

    expect(result.total_deductions).toEqual(0);
    expect(result.net_pay).toEqual(result.gross_pay);
    
    const deductions = JSON.parse(result.deductions);
    expect(deductions).toHaveLength(0);
  });

  it('should throw error for non-existent employee', async () => {
    const input = { ...testInput, employee_id: 999 };
    
    await expect(generatePayslip(input)).rejects.toThrow(/employee not found/i);
  });

  it('should throw error for inactive employee', async () => {
    const employee = await createTestEmployee();
    
    // Deactivate employee
    await db.update(employeesTable)
      .set({ is_active: false })
      .where(eq(employeesTable.id, employee.id))
      .execute();

    const input = { ...testInput, employee_id: employee.id };
    
    await expect(generatePayslip(input)).rejects.toThrow(/employee is not active/i);
  });

  it('should throw error for invalid date range', async () => {
    const employee = await createTestEmployee();
    
    const input: GeneratePayslipInput = {
      employee_id: employee.id,
      pay_period_start: new Date('2024-01-05'),
      pay_period_end: new Date('2024-01-01'), // End before start
      overtime_rate: 1.5
    };
    
    await expect(generatePayslip(input)).rejects.toThrow(/start date cannot be after end date/i);
  });

  it('should calculate different overtime rates correctly', async () => {
    const employee = await createTestEmployee();
    await createTestAttendance(employee.id);

    const input = { ...testInput, employee_id: employee.id, overtime_rate: 2.0 };
    const result = await generatePayslip(input);

    // With 2x overtime rate, overtime pay should be higher
    const dailyRate = 5000 / 30;
    const hourlyRate = dailyRate / 8;
    const expectedOvertimePay = 3 * hourlyRate * 2.0; // 3 overtime hours at 2x rate
    const expectedBasePay = dailyRate * 3; // 3 worked days
    const expectedGrossPay = expectedBasePay + expectedOvertimePay;

    expect(result.overtime_rate).toEqual(2.0);
    expect(result.gross_pay).toBeCloseTo(expectedGrossPay, 2);
  });

  it('should handle mixed deduction types correctly', async () => {
    const employee = await createTestEmployee();
    await createTestAttendance(employee.id);

    // Create multiple deductions of different types
    await db.insert(deductionConfigsTable)
      .values([
        {
          name: 'Tax 1',
          type: 'percentage',
          value: '0.10', // 10%
          is_active: true
        },
        {
          name: 'Tax 2',
          type: 'percentage',
          value: '0.05', // 5%
          is_active: true
        },
        {
          name: 'Fixed 1',
          type: 'fixed',
          value: '50.00',
          is_active: true
        },
        {
          name: 'Fixed 2',
          type: 'fixed',
          value: '25.00',
          is_active: true
        }
      ])
      .execute();

    const input = { ...testInput, employee_id: employee.id };
    const result = await generatePayslip(input);

    const deductions = JSON.parse(result.deductions);
    expect(deductions).toHaveLength(4);

    // Calculate expected deductions
    const percentageDeductions = result.gross_pay * (0.10 + 0.05); // 15% total
    const fixedDeductions = 50 + 25; // 75 total
    const expectedTotalDeductions = percentageDeductions + fixedDeductions;

    expect(result.total_deductions).toBeCloseTo(expectedTotalDeductions, 2);
  });
});