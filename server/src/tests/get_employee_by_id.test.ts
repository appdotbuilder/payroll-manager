import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type EmployeeIdInput } from '../schema';
import { getEmployeeById } from '../handlers/get_employee_by_id';

describe('getEmployeeById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testEmployee = {
    employee_id: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@company.com',
    phone: '+1234567890',
    department: 'Engineering',
    position: 'Software Engineer',
    monthly_salary: '5000.00',
    hire_date: '2023-01-15' // Date stored as string in database
  };

  it('should return employee when found', async () => {
    // Create test employee
    const insertResult = await db.insert(employeesTable)
      .values(testEmployee)
      .returning()
      .execute();

    const createdEmployee = insertResult[0];

    const input: EmployeeIdInput = { id: createdEmployee.id };
    const result = await getEmployeeById(input);

    // Should return the employee
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdEmployee.id);
    expect(result!.employee_id).toEqual('EMP001');
    expect(result!.first_name).toEqual('John');
    expect(result!.last_name).toEqual('Doe');
    expect(result!.email).toEqual('john.doe@company.com');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.department).toEqual('Engineering');
    expect(result!.position).toEqual('Software Engineer');
    expect(result!.monthly_salary).toEqual(5000); // Should be converted to number
    expect(typeof result!.monthly_salary).toEqual('number');
    expect(result!.hire_date).toEqual(new Date('2023-01-15'));
    expect(result!.is_active).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.hire_date).toBeInstanceOf(Date);
  });

  it('should return null when employee not found', async () => {
    const input: EmployeeIdInput = { id: 999999 };
    const result = await getEmployeeById(input);

    expect(result).toBeNull();
  });

  it('should handle employee with null phone', async () => {
    // Create employee with null phone
    const employeeWithNullPhone = {
      ...testEmployee,
      employee_id: 'EMP002',
      email: 'jane.doe@company.com',
      phone: null
    };

    const insertResult = await db.insert(employeesTable)
      .values(employeeWithNullPhone)
      .returning()
      .execute();

    const createdEmployee = insertResult[0];

    const input: EmployeeIdInput = { id: createdEmployee.id };
    const result = await getEmployeeById(input);

    expect(result).not.toBeNull();
    expect(result!.phone).toBeNull();
    expect(result!.employee_id).toEqual('EMP002');
  });

  it('should handle inactive employee', async () => {
    // Create inactive employee
    const inactiveEmployee = {
      ...testEmployee,
      employee_id: 'EMP003',
      email: 'inactive@company.com',
      is_active: false
    };

    const insertResult = await db.insert(employeesTable)
      .values(inactiveEmployee)
      .returning()
      .execute();

    const createdEmployee = insertResult[0];

    const input: EmployeeIdInput = { id: createdEmployee.id };
    const result = await getEmployeeById(input);

    expect(result).not.toBeNull();
    expect(result!.is_active).toEqual(false);
    expect(result!.employee_id).toEqual('EMP003');
  });

  it('should handle different salary amounts correctly', async () => {
    // Create employee with different salary
    const highSalaryEmployee = {
      ...testEmployee,
      employee_id: 'EMP004',
      email: 'high.salary@company.com',
      monthly_salary: '12500.50'
    };

    const insertResult = await db.insert(employeesTable)
      .values(highSalaryEmployee)
      .returning()
      .execute();

    const createdEmployee = insertResult[0];

    const input: EmployeeIdInput = { id: createdEmployee.id };
    const result = await getEmployeeById(input);

    expect(result).not.toBeNull();
    expect(result!.monthly_salary).toEqual(12500.5);
    expect(typeof result!.monthly_salary).toEqual('number');
  });

  it('should handle multiple employees and return correct one', async () => {
    // Create multiple employees
    const employee1 = {
      ...testEmployee,
      employee_id: 'EMP005',
      email: 'emp1@company.com'
    };

    const employee2 = {
      ...testEmployee,
      employee_id: 'EMP006',
      email: 'emp2@company.com',
      first_name: 'Jane'
    };

    const insertResult1 = await db.insert(employeesTable)
      .values(employee1)
      .returning()
      .execute();

    const insertResult2 = await db.insert(employeesTable)
      .values(employee2)
      .returning()
      .execute();

    const createdEmployee1 = insertResult1[0];
    const createdEmployee2 = insertResult2[0];

    // Query for first employee
    const input1: EmployeeIdInput = { id: createdEmployee1.id };
    const result1 = await getEmployeeById(input1);

    expect(result1).not.toBeNull();
    expect(result1!.employee_id).toEqual('EMP005');
    expect(result1!.first_name).toEqual('John');

    // Query for second employee
    const input2: EmployeeIdInput = { id: createdEmployee2.id };
    const result2 = await getEmployeeById(input2);

    expect(result2).not.toBeNull();
    expect(result2!.employee_id).toEqual('EMP006');
    expect(result2!.first_name).toEqual('Jane');
  });
});