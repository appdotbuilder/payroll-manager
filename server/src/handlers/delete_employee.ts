import { db } from '../db';
import { employeesTable } from '../db/schema';
import { type EmployeeIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteEmployee = async (input: EmployeeIdInput): Promise<{ success: boolean }> => {
  try {
    // First verify the employee exists
    const existingEmployee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, input.id))
      .execute();

    if (existingEmployee.length === 0) {
      throw new Error(`Employee with ID ${input.id} not found`);
    }

    // Soft delete by setting is_active to false
    const result = await db.update(employeesTable)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(employeesTable.id, input.id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Employee deletion failed:', error);
    throw error;
  }
};