import { db } from '../db';
import { attendanceTable } from '../db/schema';
import { type UpdateAttendanceInput, type Attendance } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateAttendance(input: UpdateAttendanceInput): Promise<Attendance> {
  try {
    // First, check if the attendance record exists
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, input.id))
      .execute();

    if (existingAttendance.length === 0) {
      throw new Error(`Attendance record with id ${input.id} not found`);
    }

    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.is_present !== undefined) {
      updateData.is_present = input.is_present;
    }

    if (input.hours_worked !== undefined) {
      updateData.hours_worked = input.hours_worked.toString(); // Convert number to string for numeric column
    }

    if (input.overtime_hours !== undefined) {
      updateData.overtime_hours = input.overtime_hours.toString(); // Convert number to string for numeric column
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Update the attendance record
    const result = await db.update(attendanceTable)
      .set(updateData)
      .where(eq(attendanceTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const attendance = result[0];
    return {
      ...attendance,
      date: new Date(attendance.date), // Convert date string back to Date
      hours_worked: parseFloat(attendance.hours_worked), // Convert string back to number
      overtime_hours: parseFloat(attendance.overtime_hours) // Convert string back to number
    };
  } catch (error) {
    console.error('Attendance update failed:', error);
    throw error;
  }
}