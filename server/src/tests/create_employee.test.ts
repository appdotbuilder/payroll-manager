import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type CreateEmployeeInput } from '../schema';
import { createEmployee } from '../handlers/create_employee';
import { eq, or } from 'drizzle-orm';

// Complete test input with all required fields
const testInput: CreateEmployeeInput = {
  employee_id: 'EMP001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@company.com',
  phone: '+1234567890',
  department: 'Engineering',
  position: 'Software Developer',
  monthly_salary: 5000.00,
  hire_date: new Date('2024-01-15')
};

describe('createEmployee', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an employee with all fields', async () => {
    const result = await createEmployee(testInput);

    // Basic field validation
    expect(result.employee_id).toEqual('EMP001');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.email).toEqual('john.doe@company.com');
    expect(result.phone).toEqual('+1234567890');
    expect(result.department).toEqual('Engineering');
    expect(result.position).toEqual('Software Developer');
    expect(result.monthly_salary).toEqual(5000.00);
    expect(typeof result.monthly_salary).toEqual('number');
    expect(result.hire_date).toEqual(new Date('2024-01-15'));
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an employee with null phone', async () => {
    const inputWithNullPhone: CreateEmployeeInput = {
      ...testInput,
      employee_id: 'EMP002',
      email: 'jane.doe@company.com',
      phone: null
    };

    const result = await createEmployee(inputWithNullPhone);

    expect(result.phone).toBeNull();
    expect(result.employee_id).toEqual('EMP002');
    expect(result.email).toEqual('jane.doe@company.com');
  });

  it('should save employee to database correctly', async () => {
    const result = await createEmployee(testInput);

    // Query database to verify insertion
    const employees = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, result.id))
      .execute();

    expect(employees).toHaveLength(1);
    const savedEmployee = employees[0];
    
    expect(savedEmployee.employee_id).toEqual('EMP001');
    expect(savedEmployee.first_name).toEqual('John');
    expect(savedEmployee.last_name).toEqual('Doe');
    expect(savedEmployee.email).toEqual('john.doe@company.com');
    expect(savedEmployee.phone).toEqual('+1234567890');
    expect(savedEmployee.department).toEqual('Engineering');
    expect(savedEmployee.position).toEqual('Software Developer');
    expect(parseFloat(savedEmployee.monthly_salary)).toEqual(5000.00);
    expect(new Date(savedEmployee.hire_date)).toEqual(new Date('2024-01-15'));
    expect(savedEmployee.is_active).toEqual(true);
    expect(savedEmployee.created_at).toBeInstanceOf(Date);
    expect(savedEmployee.updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal salary amounts correctly', async () => {
    const decimalSalaryInput: CreateEmployeeInput = {
      ...testInput,
      employee_id: 'EMP003',
      email: 'decimal@company.com',
      monthly_salary: 4567.89
    };

    const result = await createEmployee(decimalSalaryInput);

    expect(result.monthly_salary).toEqual(4567.89);
    expect(typeof result.monthly_salary).toEqual('number');

    // Verify in database
    const employees = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, result.id))
      .execute();

    expect(parseFloat(employees[0].monthly_salary)).toEqual(4567.89);
  });

  it('should throw error for duplicate employee_id', async () => {
    // Create first employee
    await createEmployee(testInput);

    // Try to create second employee with same employee_id
    const duplicateInput: CreateEmployeeInput = {
      ...testInput,
      email: 'different@company.com' // Different email but same employee_id
    };

    await expect(createEmployee(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should throw error for duplicate email', async () => {
    // Create first employee
    await createEmployee(testInput);

    // Try to create second employee with same email
    const duplicateInput: CreateEmployeeInput = {
      ...testInput,
      employee_id: 'EMP002' // Different employee_id but same email
    };

    await expect(createEmployee(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle different date formats correctly', async () => {
    const dateInput: CreateEmployeeInput = {
      ...testInput,
      employee_id: 'EMP004',
      email: 'date.test@company.com',
      hire_date: new Date('2023-12-25')
    };

    const result = await createEmployee(dateInput);

    expect(result.hire_date).toEqual(new Date('2023-12-25'));

    // Verify in database
    const employees = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, result.id))
      .execute();

    expect(new Date(employees[0].hire_date)).toEqual(new Date('2023-12-25'));
  });

  it('should create multiple employees successfully', async () => {
    const employee1: CreateEmployeeInput = {
      ...testInput,
      employee_id: 'EMP005',
      email: 'emp1@company.com'
    };

    const employee2: CreateEmployeeInput = {
      ...testInput,
      employee_id: 'EMP006',
      email: 'emp2@company.com',
      department: 'Marketing',
      position: 'Marketing Manager',
      monthly_salary: 4500.00
    };

    const result1 = await createEmployee(employee1);
    const result2 = await createEmployee(employee2);

    expect(result1.employee_id).toEqual('EMP005');
    expect(result2.employee_id).toEqual('EMP006');
    expect(result2.department).toEqual('Marketing');
    expect(result2.position).toEqual('Marketing Manager');
    expect(result2.monthly_salary).toEqual(4500.00);

    // Verify both exist in database
    const allEmployees = await db.select()
      .from(employeesTable)
      .where(or(
        eq(employeesTable.id, result1.id),
        eq(employeesTable.id, result2.id)
      ))
      .execute();

    expect(allEmployees).toHaveLength(2);
  });
});