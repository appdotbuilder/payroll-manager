import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type Employee } from '../schema';
import { eq } from 'drizzle-orm';

export const getEmployees = async (): Promise<Employee[]> => {
  try {
    // Fetch all active employees from database
    const results = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.is_active, true))
      .execute();

    // Convert numeric and date fields to proper types before returning
    return results.map(employee => ({
      ...employee,
      monthly_salary: parseFloat(employee.monthly_salary), // Convert numeric string to number
      hire_date: new Date(employee.hire_date), // Convert date string to Date object
      created_at: new Date(employee.created_at), // Convert timestamp string to Date object
      updated_at: new Date(employee.updated_at) // Convert timestamp string to Date object
    }));
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    throw error;
  }
};