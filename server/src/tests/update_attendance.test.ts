import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable, attendanceTable } from '../db/schema';
import { type UpdateAttendanceInput, type CreateEmployeeInput, type CreateAttendanceInput } from '../schema';
import { updateAttendance } from '../handlers/update_attendance';
import { eq } from 'drizzle-orm';

// Test data
const testEmployee: CreateEmployeeInput = {
  employee_id: 'EMP001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  department: 'Engineering',
  position: 'Software Developer',
  monthly_salary: 5000,
  hire_date: new Date('2023-01-15')
};

const testAttendance: CreateAttendanceInput = {
  employee_id: 0, // Will be set after creating employee
  date: new Date('2024-01-15'),
  is_present: true,
  hours_worked: 8,
  overtime_hours: 2,
  notes: 'Regular workday with overtime'
};

describe('updateAttendance', () => {
  let createdEmployeeId: number;
  let createdAttendanceId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test employee first
    const employeeResult = await db.insert(employeesTable)
      .values({
        employee_id: testEmployee.employee_id,
        first_name: testEmployee.first_name,
        last_name: testEmployee.last_name,
        email: testEmployee.email,
        phone: testEmployee.phone,
        department: testEmployee.department,
        position: testEmployee.position,
        monthly_salary: testEmployee.monthly_salary.toString(),
        hire_date: testEmployee.hire_date.toISOString().split('T')[0] // Convert Date to string format for date column
      })
      .returning()
      .execute();
    
    createdEmployeeId = employeeResult[0].id;

    // Create a test attendance record
    const attendanceResult = await db.insert(attendanceTable)
      .values({
        employee_id: createdEmployeeId,
        date: testAttendance.date.toISOString().split('T')[0], // Convert Date to string format for date column
        is_present: testAttendance.is_present,
        hours_worked: testAttendance.hours_worked.toString(),
        overtime_hours: testAttendance.overtime_hours.toString(),
        notes: testAttendance.notes
      })
      .returning()
      .execute();
    
    createdAttendanceId = attendanceResult[0].id;
  });

  afterEach(resetDB);

  it('should update attendance record with all fields', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: createdAttendanceId,
      is_present: false,
      hours_worked: 4,
      overtime_hours: 0,
      notes: 'Half day - sick leave'
    };

    const result = await updateAttendance(updateInput);

    // Verify the returned data
    expect(result.id).toEqual(createdAttendanceId);
    expect(result.employee_id).toEqual(createdEmployeeId);
    expect(result.is_present).toEqual(false);
    expect(result.hours_worked).toEqual(4);
    expect(result.overtime_hours).toEqual(0);
    expect(result.notes).toEqual('Half day - sick leave');
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify numeric types
    expect(typeof result.hours_worked).toBe('number');
    expect(typeof result.overtime_hours).toBe('number');
  });

  it('should update only specified fields', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: createdAttendanceId,
      hours_worked: 6,
      notes: 'Updated hours only'
    };

    const result = await updateAttendance(updateInput);

    // Verify updated fields
    expect(result.hours_worked).toEqual(6);
    expect(result.notes).toEqual('Updated hours only');
    
    // Verify unchanged fields remain the same
    expect(result.is_present).toEqual(true); // Should remain original value
    expect(result.overtime_hours).toEqual(2); // Should remain original value
    expect(result.employee_id).toEqual(createdEmployeeId);
  });

  it('should update hours_worked to zero', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: createdAttendanceId,
      hours_worked: 0,
      overtime_hours: 0
    };

    const result = await updateAttendance(updateInput);

    expect(result.hours_worked).toEqual(0);
    expect(result.overtime_hours).toEqual(0);
    expect(typeof result.hours_worked).toBe('number');
    expect(typeof result.overtime_hours).toBe('number');
  });

  it('should set notes to null', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: createdAttendanceId,
      notes: null
    };

    const result = await updateAttendance(updateInput);

    expect(result.notes).toBeNull();
  });

  it('should update the updated_at timestamp', async () => {
    // Get original record
    const originalRecord = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, createdAttendanceId))
      .execute();

    const originalUpdatedAt = originalRecord[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateAttendanceInput = {
      id: createdAttendanceId,
      is_present: false
    };

    const result = await updateAttendance(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should save updated data to database', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: createdAttendanceId,
      is_present: false,
      hours_worked: 3.5,
      overtime_hours: 1.25,
      notes: 'Database verification test'
    };

    await updateAttendance(updateInput);

    // Query database to verify changes were saved
    const savedRecord = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, createdAttendanceId))
      .execute();

    expect(savedRecord).toHaveLength(1);
    const record = savedRecord[0];
    expect(record.is_present).toEqual(false);
    expect(parseFloat(record.hours_worked)).toEqual(3.5);
    expect(parseFloat(record.overtime_hours)).toEqual(1.25);
    expect(record.notes).toEqual('Database verification test');
  });

  it('should throw error for non-existent attendance record', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: 99999, // Non-existent ID
      is_present: false
    };

    await expect(updateAttendance(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle decimal hours correctly', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: createdAttendanceId,
      hours_worked: 7.75,
      overtime_hours: 2.25
    };

    const result = await updateAttendance(updateInput);

    expect(result.hours_worked).toEqual(7.75);
    expect(result.overtime_hours).toEqual(2.25);
    expect(typeof result.hours_worked).toBe('number');
    expect(typeof result.overtime_hours).toBe('number');

    // Verify precision is maintained in database
    const savedRecord = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, createdAttendanceId))
      .execute();

    expect(parseFloat(savedRecord[0].hours_worked)).toEqual(7.75);
    expect(parseFloat(savedRecord[0].overtime_hours)).toEqual(2.25);
  });
});