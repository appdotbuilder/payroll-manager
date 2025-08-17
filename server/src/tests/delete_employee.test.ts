import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type EmployeeIdInput } from '../schema';
import { deleteEmployee } from '../handlers/delete_employee';
import { eq } from 'drizzle-orm';

// Test employee data
const testEmployeeData = {
  employee_id: 'EMP001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@company.com',
  phone: '+1234567890',
  department: 'Engineering',
  position: 'Software Developer',
  monthly_salary: '5000.00',
  hire_date: '2024-01-15'
};

describe('deleteEmployee', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete an employee by setting is_active to false', async () => {
    // Create test employee
    const [employee] = await db.insert(employeesTable)
      .values(testEmployeeData)
      .returning()
      .execute();

    const input: EmployeeIdInput = { id: employee.id };

    // Delete the employee
    const result = await deleteEmployee(input);

    expect(result.success).toBe(true);

    // Verify employee is soft deleted (is_active = false)
    const deletedEmployee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, employee.id))
      .execute();

    expect(deletedEmployee).toHaveLength(1);
    expect(deletedEmployee[0].is_active).toBe(false);
    expect(deletedEmployee[0].updated_at).toBeInstanceOf(Date);
  });

  it('should preserve all other employee data when soft deleting', async () => {
    // Create test employee
    const [employee] = await db.insert(employeesTable)
      .values(testEmployeeData)
      .returning()
      .execute();

    const input: EmployeeIdInput = { id: employee.id };

    // Delete the employee
    await deleteEmployee(input);

    // Verify all other data is preserved
    const deletedEmployee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, employee.id))
      .execute();

    const preserved = deletedEmployee[0];
    expect(preserved.employee_id).toBe(testEmployeeData.employee_id);
    expect(preserved.first_name).toBe(testEmployeeData.first_name);
    expect(preserved.last_name).toBe(testEmployeeData.last_name);
    expect(preserved.email).toBe(testEmployeeData.email);
    expect(preserved.phone).toBe(testEmployeeData.phone);
    expect(preserved.department).toBe(testEmployeeData.department);
    expect(preserved.position).toBe(testEmployeeData.position);
    expect(parseFloat(preserved.monthly_salary)).toBe(5000);
    expect(preserved.is_active).toBe(false);
  });

  it('should update the updated_at timestamp when deleting', async () => {
    // Create test employee
    const [employee] = await db.insert(employeesTable)
      .values(testEmployeeData)
      .returning()
      .execute();

    const originalUpdatedAt = employee.updated_at;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: EmployeeIdInput = { id: employee.id };

    // Delete the employee
    await deleteEmployee(input);

    // Verify updated_at timestamp was changed
    const deletedEmployee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, employee.id))
      .execute();

    expect(deletedEmployee[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when trying to delete non-existent employee', async () => {
    const input: EmployeeIdInput = { id: 99999 };

    await expect(deleteEmployee(input)).rejects.toThrow(/Employee with ID 99999 not found/i);
  });

  it('should handle deleting already deleted employee', async () => {
    // Create test employee
    const [employee] = await db.insert(employeesTable)
      .values(testEmployeeData)
      .returning()
      .execute();

    const input: EmployeeIdInput = { id: employee.id };

    // Delete the employee first time
    const firstResult = await deleteEmployee(input);
    expect(firstResult.success).toBe(true);

    // Delete the same employee again (should still succeed)
    const secondResult = await deleteEmployee(input);
    expect(secondResult.success).toBe(true);

    // Verify employee is still soft deleted
    const deletedEmployee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, employee.id))
      .execute();

    expect(deletedEmployee[0].is_active).toBe(false);
  });

  it('should handle multiple employee deletions correctly', async () => {
    // Create multiple test employees
    const employees = await db.insert(employeesTable)
      .values([
        { ...testEmployeeData, employee_id: 'EMP001', email: 'emp1@company.com' },
        { ...testEmployeeData, employee_id: 'EMP002', email: 'emp2@company.com' },
        { ...testEmployeeData, employee_id: 'EMP003', email: 'emp3@company.com' }
      ])
      .returning()
      .execute();

    // Delete first two employees
    await deleteEmployee({ id: employees[0].id });
    await deleteEmployee({ id: employees[1].id });

    // Verify deletion status
    const allEmployees = await db.select()
      .from(employeesTable)
      .execute();

    const emp1 = allEmployees.find(e => e.id === employees[0].id);
    const emp2 = allEmployees.find(e => e.id === employees[1].id);
    const emp3 = allEmployees.find(e => e.id === employees[2].id);

    expect(emp1?.is_active).toBe(false);
    expect(emp2?.is_active).toBe(false);
    expect(emp3?.is_active).toBe(true);
  });
});