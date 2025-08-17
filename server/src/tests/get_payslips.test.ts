import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable, payslipsTable } from '../db/schema';
import { type PayslipQueryInput } from '../schema';
import { getPayslips } from '../handlers/get_payslips';

describe('getPayslips', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test employee
  const createTestEmployee = async () => {
    const result = await db.insert(employeesTable)
      .values({
        employee_id: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        department: 'Engineering',
        position: 'Software Developer',
        monthly_salary: '5000.00',
        hire_date: '2023-01-15'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test payslip
  const createTestPayslip = async (employeeId: number, overrides: Partial<any> = {}) => {
    const defaultValues = {
      employee_id: employeeId,
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31',
      gross_pay: '5500.00',
      total_deductions: '1100.00',
      net_pay: '4400.00',
      regular_hours: '160.00',
      overtime_hours: '10.00',
      overtime_rate: '1.5',
      deductions: JSON.stringify([
        { name: 'Income Tax', amount: 800 },
        { name: 'Health Insurance', amount: 300 }
      ])
    };

    const result = await db.insert(payslipsTable)
      .values({ ...defaultValues, ...overrides })
      .returning()
      .execute();
    return result[0];
  };

  it('should return payslips for a specific employee', async () => {
    const employee = await createTestEmployee();
    const payslip = await createTestPayslip(employee.id);

    const input: PayslipQueryInput = {
      employee_id: employee.id
    };

    const result = await getPayslips(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(payslip.id);
    expect(result[0].employee_id).toEqual(employee.id);
    expect(result[0].gross_pay).toEqual(5500);
    expect(result[0].total_deductions).toEqual(1100);
    expect(result[0].net_pay).toEqual(4400);
    expect(result[0].regular_hours).toEqual(160);
    expect(result[0].overtime_hours).toEqual(10);
    expect(result[0].overtime_rate).toEqual(1.5);
    expect(typeof result[0].gross_pay).toBe('number');
    expect(typeof result[0].total_deductions).toBe('number');
    expect(typeof result[0].net_pay).toBe('number');
  });

  it('should filter payslips by date range', async () => {
    const employee = await createTestEmployee();
    
    // Create payslips for different months
    await createTestPayslip(employee.id, {
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31'
    });
    
    await createTestPayslip(employee.id, {
      pay_period_start: '2024-02-01',
      pay_period_end: '2024-02-29'
    });
    
    await createTestPayslip(employee.id, {
      pay_period_start: '2024-03-01',
      pay_period_end: '2024-03-31'
    });

    const input: PayslipQueryInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-02-29')
    };

    const result = await getPayslips(input);

    expect(result).toHaveLength(2);
    // Should include January and February payslips based on pay_period_end <= end_date
    expect(result.some(p => p.pay_period_start.getMonth() === 0)).toBe(true); // January
    expect(result.some(p => p.pay_period_start.getMonth() === 1)).toBe(true); // February
    expect(result.every(p => p.pay_period_start.getMonth() < 2)).toBe(true); // No March
  });

  it('should filter by employee and date range combined', async () => {
    const employee1 = await createTestEmployee();
    
    const employee2 = await db.insert(employeesTable)
      .values({
        employee_id: 'EMP002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1234567891',
        department: 'Marketing',
        position: 'Marketing Manager',
        monthly_salary: '6000.00',
        hire_date: '2023-02-01'
      })
      .returning()
      .execute();

    // Create payslips for both employees
    await createTestPayslip(employee1.id, {
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31'
    });
    
    await createTestPayslip(employee2[0].id, {
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31'
    });
    
    await createTestPayslip(employee1.id, {
      pay_period_start: '2024-02-01',
      pay_period_end: '2024-02-29'
    });

    const input: PayslipQueryInput = {
      employee_id: employee1.id,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getPayslips(input);

    expect(result).toHaveLength(1);
    expect(result[0].employee_id).toEqual(employee1.id);
    expect(result[0].pay_period_start.getMonth()).toEqual(0); // January
  });

  it('should return recent payslips when no filters provided', async () => {
    const employee = await createTestEmployee();
    const now = new Date();
    
    // Create payslips - one recent, one old (more than 6 months)
    await createTestPayslip(employee.id, {
      pay_period_start: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0],
      pay_period_end: new Date(now.getFullYear(), now.getMonth() - 2, 28).toISOString().split('T')[0]
    });
    
    await createTestPayslip(employee.id, {
      pay_period_start: new Date(now.getFullYear(), now.getMonth() - 8, 1).toISOString().split('T')[0],
      pay_period_end: new Date(now.getFullYear(), now.getMonth() - 8, 28).toISOString().split('T')[0]
    });

    const input: PayslipQueryInput = {};

    const result = await getPayslips(input);

    // Should return only recent payslips (within last 6 months)
    expect(result).toHaveLength(1);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    expect(result[0].pay_period_start.getTime()).toBeGreaterThan(sixMonthsAgo.getTime());
  });

  it('should order payslips by generated_at descending', async () => {
    const employee = await createTestEmployee();
    
    // Create payslips with different generated_at times
    const payslip1 = await createTestPayslip(employee.id, {
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31'
    });
    
    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const payslip2 = await createTestPayslip(employee.id, {
      pay_period_start: '2024-02-01',
      pay_period_end: '2024-02-29'
    });

    const input: PayslipQueryInput = {
      employee_id: employee.id
    };

    const result = await getPayslips(input);

    expect(result).toHaveLength(2);
    // Most recent should be first
    expect(result[0].generated_at.getTime()).toBeGreaterThanOrEqual(
      result[1].generated_at.getTime()
    );
  });

  it('should return empty array when no payslips match filters', async () => {
    const employee = await createTestEmployee();
    await createTestPayslip(employee.id);

    const input: PayslipQueryInput = {
      employee_id: 999 // Non-existent employee
    };

    const result = await getPayslips(input);

    expect(result).toHaveLength(0);
  });

  it('should handle date filtering with start_date only', async () => {
    const employee = await createTestEmployee();
    
    await createTestPayslip(employee.id, {
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31'
    });
    
    await createTestPayslip(employee.id, {
      pay_period_start: '2023-12-01',
      pay_period_end: '2023-12-31'
    });

    const input: PayslipQueryInput = {
      start_date: new Date('2024-01-01')
    };

    const result = await getPayslips(input);

    expect(result).toHaveLength(1);
    expect(result[0].pay_period_start.getFullYear()).toEqual(2024);
  });

  it('should handle date filtering with end_date only', async () => {
    const employee = await createTestEmployee();
    
    await createTestPayslip(employee.id, {
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31'
    });
    
    await createTestPayslip(employee.id, {
      pay_period_start: '2024-03-01',
      pay_period_end: '2024-03-31'
    });

    const input: PayslipQueryInput = {
      end_date: new Date('2024-02-15')
    };

    const result = await getPayslips(input);

    expect(result).toHaveLength(1);
    expect(result[0].pay_period_start.getMonth()).toEqual(0); // January
  });

  it('should properly convert all numeric fields to numbers', async () => {
    const employee = await createTestEmployee();
    const payslip = await createTestPayslip(employee.id, {
      gross_pay: '1234.56',
      total_deductions: '234.78',
      net_pay: '999.78',
      regular_hours: '160.50',
      overtime_hours: '12.25',
      overtime_rate: '2.0'
    });

    const input: PayslipQueryInput = {
      employee_id: employee.id
    };

    const result = await getPayslips(input);

    expect(result).toHaveLength(1);
    const payslipResult = result[0];
    
    expect(typeof payslipResult.gross_pay).toBe('number');
    expect(typeof payslipResult.total_deductions).toBe('number');
    expect(typeof payslipResult.net_pay).toBe('number');
    expect(typeof payslipResult.regular_hours).toBe('number');
    expect(typeof payslipResult.overtime_hours).toBe('number');
    expect(typeof payslipResult.overtime_rate).toBe('number');
    
    expect(payslipResult.gross_pay).toEqual(1234.56);
    expect(payslipResult.total_deductions).toEqual(234.78);
    expect(payslipResult.net_pay).toEqual(999.78);
    expect(payslipResult.regular_hours).toEqual(160.5);
    expect(payslipResult.overtime_hours).toEqual(12.25);
    expect(payslipResult.overtime_rate).toEqual(2.0);
  });

  it('should return dates as proper Date objects', async () => {
    const employee = await createTestEmployee();
    await createTestPayslip(employee.id);

    const input: PayslipQueryInput = {
      employee_id: employee.id
    };

    const result = await getPayslips(input);

    expect(result).toHaveLength(1);
    expect(result[0].pay_period_start).toBeInstanceOf(Date);
    expect(result[0].pay_period_end).toBeInstanceOf(Date);
    expect(result[0].generated_at).toBeInstanceOf(Date);
    expect(typeof result[0].pay_period_start.getMonth).toBe('function');
    expect(typeof result[0].pay_period_end.getTime).toBe('function');
  });
});