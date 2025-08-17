import { db } from '../db';
import { attendanceTable } from '../db/schema';
import { type AttendanceQueryInput, type Attendance } from '../schema';
import { eq, gte, lte, and, desc, type SQL } from 'drizzle-orm';

export const getAttendance = async (input: AttendanceQueryInput): Promise<Attendance[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by employee_id if provided
    if (input.employee_id !== undefined) {
      conditions.push(eq(attendanceTable.employee_id, input.employee_id));
    }

    // Filter by date range if provided
    if (input.start_date) {
      const startDateStr = input.start_date.toISOString().split('T')[0];
      conditions.push(gte(attendanceTable.date, startDateStr));
    }

    if (input.end_date) {
      const endDateStr = input.end_date.toISOString().split('T')[0];
      conditions.push(lte(attendanceTable.date, endDateStr));
    }

    // If no date filters provided, default to last 30 days
    if (!input.start_date && !input.end_date) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      conditions.push(gte(attendanceTable.date, thirtyDaysAgoStr));
    }

    // Execute query based on whether we have conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(attendanceTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(attendanceTable.date))
          .execute()
      : await db.select()
          .from(attendanceTable)
          .orderBy(desc(attendanceTable.date))
          .execute();

    // Convert fields back to proper types
    return results.map(record => ({
      ...record,
      date: new Date(record.date), // Convert string date back to Date
      hours_worked: parseFloat(record.hours_worked),
      overtime_hours: parseFloat(record.overtime_hours)
    }));
  } catch (error) {
    console.error('Attendance query failed:', error);
    throw error;
  }
};