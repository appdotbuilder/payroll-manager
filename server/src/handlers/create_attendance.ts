import { db } from '../db';
import { attendanceTable, employeesTable } from '../db/schema';
import { type CreateAttendanceInput, type Attendance } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createAttendance = async (input: CreateAttendanceInput): Promise<Attendance> => {
  try {
    // First, validate that the employee exists
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, input.employee_id))
      .execute();

    if (employee.length === 0) {
      throw new Error(`Employee with ID ${input.employee_id} does not exist`);
    }

    // Check for existing attendance record for the same employee and date
    const dateString = input.date.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD string
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employee_id, input.employee_id),
          eq(attendanceTable.date, dateString)
        )
      )
      .execute();

    if (existingAttendance.length > 0) {
      throw new Error(`Attendance record already exists for employee ${input.employee_id} on ${input.date.toISOString().split('T')[0]}`);
    }

    // Insert attendance record
    const result = await db.insert(attendanceTable)
      .values({
        employee_id: input.employee_id,
        date: dateString, // Use the converted date string
        is_present: input.is_present,
        hours_worked: input.hours_worked.toString(), // Convert number to string for numeric column
        overtime_hours: input.overtime_hours.toString(), // Convert number to string for numeric column
        notes: input.notes
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers and date string back to Date object
    const attendance = result[0];
    return {
      ...attendance,
      date: new Date(attendance.date), // Convert string back to Date
      hours_worked: parseFloat(attendance.hours_worked), // Convert string back to number
      overtime_hours: parseFloat(attendance.overtime_hours) // Convert string back to number
    };
  } catch (error) {
    console.error('Attendance creation failed:', error);
    throw error;
  }
};