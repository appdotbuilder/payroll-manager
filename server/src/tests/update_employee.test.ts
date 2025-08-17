import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type UpdateEmployeeInput, type CreateEmployeeInput } from '../schema';
import { updateEmployee } from '../handlers/update_employee';
import { eq } from 'drizzle-orm';

// Helper function to create a test employee
const createTestEmployee = async (): Promise<number> => {
  const testEmployee: CreateEmployeeInput = {
    employee_id: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@company.com',
    phone: '+1234567890',
    department: 'Engineering',
    position: 'Software Developer',
    monthly_salary: 5000.00,
    hire_date: new Date('2023-01-15')
  };

  const result = await db.insert(employeesTable)
    .values({
      employee_id: testEmployee.employee_id,
      first_name: testEmployee.first_name,
      last_name: testEmployee.last_name,
      email: testEmployee.email,
      phone: testEmployee.phone,
      department: testEmployee.department,
      position: testEmployee.position,
      monthly_salary: testEmployee.monthly_salary.toString(),
      hire_date: testEmployee.hire_date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      is_active: true
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateEmployee', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update employee with all fields', async () => {
    const employeeId = await createTestEmployee();

    const updateInput: UpdateEmployeeInput = {
      id: employeeId,
      employee_id: 'EMP002',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@company.com',
      phone: '+0987654321',
      department: 'Marketing',
      position: 'Marketing Manager',
      monthly_salary: 6000.00,
      hire_date: new Date('2023-02-01'),
      is_active: false
    };

    const result = await updateEmployee(updateInput);

    // Verify all updated fields
    expect(result.id).toEqual(employeeId);
    expect(result.employee_id).toEqual('EMP002');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('jane.smith@company.com');
    expect(result.phone).toEqual('+0987654321');
    expect(result.department).toEqual('Marketing');
    expect(result.position).toEqual('Marketing Manager');
    expect(result.monthly_salary).toEqual(6000.00);
    expect(typeof result.monthly_salary).toEqual('number');
    expect(result.hire_date).toEqual(new Date('2023-02-01'));
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const employeeId = await createTestEmployee();

    // Get original employee data
    const originalEmployee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, employeeId))
      .execute();

    const updateInput: UpdateEmployeeInput = {
      id: employeeId,
      first_name: 'Jane',
      monthly_salary: 6000.00
    };

    const result = await updateEmployee(updateInput);

    // Verify updated fields
    expect(result.first_name).toEqual('Jane');
    expect(result.monthly_salary).toEqual(6000.00);

    // Verify unchanged fields
    expect(result.employee_id).toEqual(originalEmployee[0].employee_id);
    expect(result.last_name).toEqual(originalEmployee[0].last_name);
    expect(result.email).toEqual(originalEmployee[0].email);
    expect(result.phone).toEqual(originalEmployee[0].phone);
    expect(result.department).toEqual(originalEmployee[0].department);
    expect(result.position).toEqual(originalEmployee[0].position);
    expect(result.hire_date).toEqual(new Date(originalEmployee[0].hire_date));
    expect(result.is_active).toEqual(originalEmployee[0].is_active);

    // Verify updated_at was changed
    expect(result.updated_at.getTime()).toBeGreaterThan(new Date(originalEmployee[0].updated_at).getTime());
  });

  it('should save updated employee to database', async () => {
    const employeeId = await createTestEmployee();

    const updateInput: UpdateEmployeeInput = {
      id: employeeId,
      first_name: 'Updated Name',
      monthly_salary: 7000.00
    };

    await updateEmployee(updateInput);

    // Query database to verify changes were saved
    const savedEmployee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, employeeId))
      .execute();

    expect(savedEmployee).toHaveLength(1);
    expect(savedEmployee[0].first_name).toEqual('Updated Name');
    expect(parseFloat(savedEmployee[0].monthly_salary)).toEqual(7000.00);
    expect(savedEmployee[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null phone field update', async () => {
    const employeeId = await createTestEmployee();

    const updateInput: UpdateEmployeeInput = {
      id: employeeId,
      phone: null
    };

    const result = await updateEmployee(updateInput);

    expect(result.phone).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when employee does not exist', async () => {
    const updateInput: UpdateEmployeeInput = {
      id: 99999, // Non-existent ID
      first_name: 'John'
    };

    await expect(updateEmployee(updateInput)).rejects.toThrow(/Employee with ID 99999 not found/i);
  });

  it('should handle date field updates correctly', async () => {
    const employeeId = await createTestEmployee();

    const newHireDate = new Date('2023-12-01');
    const updateInput: UpdateEmployeeInput = {
      id: employeeId,
      hire_date: newHireDate
    };

    const result = await updateEmployee(updateInput);

    expect(result.hire_date).toEqual(newHireDate);
    expect(result.hire_date).toBeInstanceOf(Date);
  });

  it('should update employee status from active to inactive', async () => {
    const employeeId = await createTestEmployee();

    const updateInput: UpdateEmployeeInput = {
      id: employeeId,
      is_active: false
    };

    const result = await updateEmployee(updateInput);

    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const savedEmployee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, employeeId))
      .execute();

    expect(savedEmployee[0].is_active).toEqual(false);
  });
});