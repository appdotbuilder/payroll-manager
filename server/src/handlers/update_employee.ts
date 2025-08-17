import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type UpdateEmployeeInput, type Employee } from '../schema';
import { eq } from 'drizzle-orm';

export const updateEmployee = async (input: UpdateEmployeeInput): Promise<Employee> => {
  try {
    // Check if employee exists
    const existingEmployee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, input.id))
      .execute();

    if (existingEmployee.length === 0) {
      throw new Error(`Employee with ID ${input.id} not found`);
    }

    // Prepare update values - only include fields that are provided
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.employee_id !== undefined) updateValues.employee_id = input.employee_id;
    if (input.first_name !== undefined) updateValues.first_name = input.first_name;
    if (input.last_name !== undefined) updateValues.last_name = input.last_name;
    if (input.email !== undefined) updateValues.email = input.email;
    if (input.phone !== undefined) updateValues.phone = input.phone;
    if (input.department !== undefined) updateValues.department = input.department;
    if (input.position !== undefined) updateValues.position = input.position;
    if (input.monthly_salary !== undefined) updateValues.monthly_salary = input.monthly_salary.toString();
    if (input.hire_date !== undefined) updateValues.hire_date = input.hire_date;
    if (input.is_active !== undefined) updateValues.is_active = input.is_active;

    // Update employee record
    const result = await db.update(employeesTable)
      .set(updateValues)
      .where(eq(employeesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const updatedEmployee = result[0];
    return {
      ...updatedEmployee,
      monthly_salary: parseFloat(updatedEmployee.monthly_salary),
      hire_date: new Date(updatedEmployee.hire_date),
      created_at: new Date(updatedEmployee.created_at),
      updated_at: new Date(updatedEmployee.updated_at)
    };
  } catch (error) {
    console.error('Employee update failed:', error);
    throw error;
  }
};