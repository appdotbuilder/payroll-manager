import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type CreateEmployeeInput } from '../schema';
import { getEmployees } from '../handlers/get_employees';

// Test employee data
const testEmployee1: CreateEmployeeInput = {
  employee_id: 'EMP001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@company.com',
  phone: '+1-555-0123',
  department: 'Engineering',
  position: 'Software Developer',
  monthly_salary: 5000.00,
  hire_date: new Date('2023-01-15')
};

const testEmployee2: CreateEmployeeInput = {
  employee_id: 'EMP002',
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane.smith@company.com',
  phone: null,
  department: 'Marketing',
  position: 'Marketing Manager',
  monthly_salary: 6500.50,
  hire_date: new Date('2022-03-10')
};

describe('getEmployees', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no employees exist', async () => {
    const result = await getEmployees();

    expect(result).toEqual([]);
  });

  it('should return all active employees', async () => {
    // Create first test employee
    await db.insert(employeesTable)
      .values({
        employee_id: testEmployee1.employee_id,
        first_name: testEmployee1.first_name,
        last_name: testEmployee1.last_name,
        email: testEmployee1.email,
        phone: testEmployee1.phone,
        department: testEmployee1.department,
        position: testEmployee1.position,
        monthly_salary: testEmployee1.monthly_salary.toString(),
        hire_date: testEmployee1.hire_date.toISOString().split('T')[0], // Convert Date to date string
        is_active: true
      })
      .execute();

    // Create second test employee
    await db.insert(employeesTable)
      .values({
        employee_id: testEmployee2.employee_id,
        first_name: testEmployee2.first_name,
        last_name: testEmployee2.last_name,
        email: testEmployee2.email,
        phone: testEmployee2.phone,
        department: testEmployee2.department,
        position: testEmployee2.position,
        monthly_salary: testEmployee2.monthly_salary.toString(),
        hire_date: testEmployee2.hire_date.toISOString().split('T')[0], // Convert Date to date string
        is_active: true
      })
      .execute();

    const result = await getEmployees();

    expect(result).toHaveLength(2);
    
    // Verify first employee
    const emp1 = result.find(emp => emp.employee_id === 'EMP001');
    expect(emp1).toBeDefined();
    expect(emp1!.first_name).toEqual('John');
    expect(emp1!.last_name).toEqual('Doe');
    expect(emp1!.email).toEqual('john.doe@company.com');
    expect(emp1!.phone).toEqual('+1-555-0123');
    expect(emp1!.department).toEqual('Engineering');
    expect(emp1!.position).toEqual('Software Developer');
    expect(emp1!.monthly_salary).toEqual(5000.00);
    expect(typeof emp1!.monthly_salary).toBe('number');
    expect(emp1!.hire_date).toBeInstanceOf(Date);
    expect(emp1!.is_active).toBe(true);
    expect(emp1!.id).toBeDefined();
    expect(emp1!.created_at).toBeInstanceOf(Date);
    expect(emp1!.updated_at).toBeInstanceOf(Date);

    // Verify second employee
    const emp2 = result.find(emp => emp.employee_id === 'EMP002');
    expect(emp2).toBeDefined();
    expect(emp2!.first_name).toEqual('Jane');
    expect(emp2!.last_name).toEqual('Smith');
    expect(emp2!.email).toEqual('jane.smith@company.com');
    expect(emp2!.phone).toBeNull();
    expect(emp2!.department).toEqual('Marketing');
    expect(emp2!.position).toEqual('Marketing Manager');
    expect(emp2!.monthly_salary).toEqual(6500.50);
    expect(typeof emp2!.monthly_salary).toBe('number');
  });

  it('should only return active employees', async () => {
    // Create active employee
    await db.insert(employeesTable)
      .values({
        employee_id: 'EMP001',
        first_name: 'Active',
        last_name: 'Employee',
        email: 'active@company.com',
        phone: null,
        department: 'Engineering',
        position: 'Developer',
        monthly_salary: '5000.00',
        hire_date: '2023-01-15', // Date string format
        is_active: true
      })
      .execute();

    // Create inactive employee
    await db.insert(employeesTable)
      .values({
        employee_id: 'EMP002',
        first_name: 'Inactive',
        last_name: 'Employee',
        email: 'inactive@company.com',
        phone: null,
        department: 'Engineering',
        position: 'Developer',
        monthly_salary: '5000.00',
        hire_date: '2022-01-15', // Date string format
        is_active: false
      })
      .execute();

    const result = await getEmployees();

    expect(result).toHaveLength(1);
    expect(result[0].first_name).toEqual('Active');
    expect(result[0].is_active).toBe(true);
  });

  it('should handle numeric salary conversion correctly', async () => {
    // Create employee with precise decimal salary
    await db.insert(employeesTable)
      .values({
        employee_id: 'EMP001',
        first_name: 'Test',
        last_name: 'Employee',
        email: 'test@company.com',
        phone: null,
        department: 'Finance',
        position: 'Analyst',
        monthly_salary: '7250.75', // String in database
        hire_date: '2023-01-15', // Date string format
        is_active: true
      })
      .execute();

    const result = await getEmployees();

    expect(result).toHaveLength(1);
    expect(result[0].monthly_salary).toEqual(7250.75);
    expect(typeof result[0].monthly_salary).toBe('number');
  });

  it('should handle employees with null phone numbers', async () => {
    await db.insert(employeesTable)
      .values({
        employee_id: 'EMP001',
        first_name: 'No',
        last_name: 'Phone',
        email: 'nophone@company.com',
        phone: null,
        department: 'HR',
        position: 'Manager',
        monthly_salary: '4500.00',
        hire_date: '2023-01-15', // Date string format
        is_active: true
      })
      .execute();

    const result = await getEmployees();

    expect(result).toHaveLength(1);
    expect(result[0].phone).toBeNull();
  });
});