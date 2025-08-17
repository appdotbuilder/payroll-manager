import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type EmployeeIdInput, type Employee } from '../schema';
import { eq } from 'drizzle-orm';

export const getEmployeeById = async (input: EmployeeIdInput): Promise<Employee | null> => {
  try {
    // Query the employee by ID
    const result = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, input.id))
      .execute();

    // Return null if no employee found
    if (result.length === 0) {
      return null;
    }

    // Convert numeric and date fields back to proper types before returning
    const employee = result[0];
    return {
      ...employee,
      monthly_salary: parseFloat(employee.monthly_salary), // Convert string back to number
      hire_date: new Date(employee.hire_date), // Convert string back to Date
      created_at: new Date(employee.created_at), // Convert string back to Date
      updated_at: new Date(employee.updated_at) // Convert string back to Date
    };
  } catch (error) {
    console.error('Failed to fetch employee by ID:', error);
    throw error;
  }
};