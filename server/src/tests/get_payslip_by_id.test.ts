import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable, payslipsTable } from '../db/schema';
import { getPayslipById, type GetPayslipByIdInput } from '../handlers/get_payslip_by_id';

// Test data
const testEmployee = {
  employee_id: 'EMP001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@company.com',
  phone: '+1234567890',
  department: 'Engineering',
  position: 'Software Developer',
  monthly_salary: '5000.00',
  hire_date: '2023-01-15',
  is_active: true
};

const testPayslipData = {
  pay_period_start: '2024-01-01',
  pay_period_end: '2024-01-31',
  gross_pay: '5500.00',
  total_deductions: '1100.00',
  net_pay: '4400.00',
  regular_hours: '160.00',
  overtime_hours: '20.00',
  overtime_rate: '1.5',
  deductions: JSON.stringify([
    { name: 'Income Tax', amount: 750.00 },
    { name: 'Health Insurance', amount: 200.00 },
    { name: 'Social Security', amount: 150.00 }
  ])
};

describe('getPayslipById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a payslip by ID', async () => {
    // Create employee first
    const [employee] = await db.insert(employeesTable)
      .values(testEmployee)
      .returning()
      .execute();

    // Create payslip
    const [payslip] = await db.insert(payslipsTable)
      .values({
        employee_id: employee.id,
        ...testPayslipData
      })
      .returning()
      .execute();

    const input: GetPayslipByIdInput = { id: payslip.id };
    const result = await getPayslipById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(payslip.id);
    expect(result!.employee_id).toEqual(employee.id);
    expect(result!.pay_period_start).toEqual(new Date('2024-01-01'));
    expect(result!.pay_period_end).toEqual(new Date('2024-01-31'));
    
    // Verify numeric conversions
    expect(typeof result!.gross_pay).toBe('number');
    expect(result!.gross_pay).toEqual(5500.00);
    expect(typeof result!.total_deductions).toBe('number');
    expect(result!.total_deductions).toEqual(1100.00);
    expect(typeof result!.net_pay).toBe('number');
    expect(result!.net_pay).toEqual(4400.00);
    expect(typeof result!.regular_hours).toBe('number');
    expect(result!.regular_hours).toEqual(160.00);
    expect(typeof result!.overtime_hours).toBe('number');
    expect(result!.overtime_hours).toEqual(20.00);
    expect(typeof result!.overtime_rate).toBe('number');
    expect(result!.overtime_rate).toEqual(1.5);
    
    expect(result!.deductions).toEqual(testPayslipData.deductions);
    expect(result!.generated_at).toBeInstanceOf(Date);
  });

  it('should return null when payslip does not exist', async () => {
    const input: GetPayslipByIdInput = { id: 99999 };
    const result = await getPayslipById(input);

    expect(result).toBeNull();
  });

  it('should handle payslip with zero overtime', async () => {
    // Create employee first
    const [employee] = await db.insert(employeesTable)
      .values(testEmployee)
      .returning()
      .execute();

    // Create payslip with no overtime
    const payslipWithoutOvertime = {
      employee_id: employee.id,
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31',
      gross_pay: '5000.00',
      total_deductions: '1100.00',
      net_pay: '3900.00',
      regular_hours: '160.00',
      overtime_hours: '0.00',
      overtime_rate: '1.5',
      deductions: testPayslipData.deductions
    };

    const [payslip] = await db.insert(payslipsTable)
      .values(payslipWithoutOvertime)
      .returning()
      .execute();

    const input: GetPayslipByIdInput = { id: payslip.id };
    const result = await getPayslipById(input);

    expect(result).not.toBeNull();
    expect(result!.overtime_hours).toEqual(0);
    expect(result!.gross_pay).toEqual(5000.00);
    expect(result!.net_pay).toEqual(3900.00);
  });

  it('should handle payslip with complex deduction structure', async () => {
    // Create employee first
    const [employee] = await db.insert(employeesTable)
      .values(testEmployee)
      .returning()
      .execute();

    const complexDeductions = JSON.stringify([
      { name: 'Federal Tax', amount: 500.00, type: 'percentage', rate: 0.10 },
      { name: 'State Tax', amount: 250.00, type: 'percentage', rate: 0.05 },
      { name: 'Health Insurance', amount: 200.00, type: 'fixed' },
      { name: 'Dental Insurance', amount: 50.00, type: 'fixed' },
      { name: '401k Contribution', amount: 100.00, type: 'percentage', rate: 0.02 }
    ]);

    const [payslip] = await db.insert(payslipsTable)
      .values({
        employee_id: employee.id,
        ...testPayslipData,
        deductions: complexDeductions
      })
      .returning()
      .execute();

    const input: GetPayslipByIdInput = { id: payslip.id };
    const result = await getPayslipById(input);

    expect(result).not.toBeNull();
    expect(result!.deductions).toEqual(complexDeductions);
    
    // Verify deductions can be parsed as JSON
    const parsedDeductions = JSON.parse(result!.deductions);
    expect(Array.isArray(parsedDeductions)).toBe(true);
    expect(parsedDeductions).toHaveLength(5);
    expect(parsedDeductions[0]).toHaveProperty('name', 'Federal Tax');
    expect(parsedDeductions[0]).toHaveProperty('amount', 500.00);
  });

  it('should handle payslip with decimal precision correctly', async () => {
    // Create employee first
    const [employee] = await db.insert(employeesTable)
      .values(testEmployee)
      .returning()
      .execute();

    // Create payslip with precise decimal values
    const precisePayslipData = {
      employee_id: employee.id,
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31',
      gross_pay: '5333.33',
      total_deductions: '1066.67',
      net_pay: '4266.66',
      regular_hours: '159.75',
      overtime_hours: '12.25',
      overtime_rate: '1.75',
      deductions: testPayslipData.deductions
    };

    const [payslip] = await db.insert(payslipsTable)
      .values(precisePayslipData)
      .returning()
      .execute();

    const input: GetPayslipByIdInput = { id: payslip.id };
    const result = await getPayslipById(input);

    expect(result).not.toBeNull();
    expect(result!.gross_pay).toEqual(5333.33);
    expect(result!.total_deductions).toEqual(1066.67);
    expect(result!.net_pay).toEqual(4266.66);
    expect(result!.regular_hours).toEqual(159.75);
    expect(result!.overtime_hours).toEqual(12.25);
    expect(result!.overtime_rate).toEqual(1.75);
  });
});