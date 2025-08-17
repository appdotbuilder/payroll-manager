import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type CreateEmployeeInput, type Employee } from '../schema';

export const createEmployee = async (input: CreateEmployeeInput): Promise<Employee> => {
  try {
    // Insert employee record
    const result = await db.insert(employeesTable)
      .values({
        employee_id: input.employee_id,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone,
        department: input.department,
        position: input.position,
        monthly_salary: input.monthly_salary.toString(), // Convert number to string for numeric column
        hire_date: input.hire_date.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // Convert numeric fields and date back to proper types before returning
    const employee = result[0];
    return {
      ...employee,
      monthly_salary: parseFloat(employee.monthly_salary), // Convert string back to number
      hire_date: new Date(employee.hire_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Employee creation failed:', error);
    throw error;
  }
};