import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { attendanceTable, employeesTable } from '../db/schema';
import { type CreateAttendanceInput } from '../schema';
import { createAttendance } from '../handlers/create_attendance';
import { eq, and } from 'drizzle-orm';

describe('createAttendance', () => {
  let testEmployeeId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test employee first
    const employeeResult = await db.insert(employeesTable)
      .values({
        employee_id: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@company.com',
        phone: '+1-555-0123',
        department: 'Engineering',
        position: 'Software Engineer',
        monthly_salary: '5000.00',
        hire_date: '2024-01-01' // Use string format for date column
      })
      .returning()
      .execute();
    
    testEmployeeId = employeeResult[0].id;
  });

  afterEach(resetDB);

  const createTestInput = (overrides?: Partial<CreateAttendanceInput>): CreateAttendanceInput => ({
    employee_id: testEmployeeId,
    date: new Date('2024-01-15'),
    is_present: true,
    hours_worked: 8.0,
    overtime_hours: 1.5,
    notes: 'Regular work day with some overtime',
    ...overrides
  });

  it('should create an attendance record', async () => {
    const testInput = createTestInput();
    const result = await createAttendance(testInput);

    // Basic field validation
    expect(result.employee_id).toEqual(testEmployeeId);
    expect(result.date).toEqual(testInput.date);
    expect(result.is_present).toEqual(true);
    expect(result.hours_worked).toEqual(8.0);
    expect(result.overtime_hours).toEqual(1.5);
    expect(result.notes).toEqual('Regular work day with some overtime');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify numeric types
    expect(typeof result.hours_worked).toBe('number');
    expect(typeof result.overtime_hours).toBe('number');
  });

  it('should save attendance record to database', async () => {
    const testInput = createTestInput();
    const result = await createAttendance(testInput);

    // Query database to verify record was saved
    const attendanceRecords = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, result.id))
      .execute();

    expect(attendanceRecords).toHaveLength(1);
    const record = attendanceRecords[0];
    expect(record.employee_id).toEqual(testEmployeeId);
    expect(record.date).toEqual(testInput.date.toISOString().split('T')[0]); // Database stores as string
    expect(record.is_present).toEqual(true);
    expect(parseFloat(record.hours_worked)).toEqual(8.0);
    expect(parseFloat(record.overtime_hours)).toEqual(1.5);
    expect(record.notes).toEqual('Regular work day with some overtime');
    expect(record.created_at).toBeInstanceOf(Date);
    expect(record.updated_at).toBeInstanceOf(Date);
  });

  it('should create attendance record with zero hours and no notes', async () => {
    const testInput = createTestInput({
      is_present: false,
      hours_worked: 0,
      overtime_hours: 0,
      notes: null
    });
    
    const result = await createAttendance(testInput);

    expect(result.is_present).toEqual(false);
    expect(result.hours_worked).toEqual(0);
    expect(result.overtime_hours).toEqual(0);
    expect(result.notes).toBeNull();
  });

  it('should handle attendance record with maximum allowed hours', async () => {
    const testInput = createTestInput({
      hours_worked: 24,
      overtime_hours: 12
    });
    
    const result = await createAttendance(testInput);

    expect(result.hours_worked).toEqual(24);
    expect(result.overtime_hours).toEqual(12);
  });

  it('should throw error when employee does not exist', async () => {
    const testInput = createTestInput({
      employee_id: 99999 // Non-existent employee
    });

    await expect(createAttendance(testInput))
      .rejects.toThrow(/Employee with ID 99999 does not exist/i);
  });

  it('should prevent duplicate attendance records for same employee and date', async () => {
    const testInput = createTestInput();
    
    // Create first attendance record
    await createAttendance(testInput);
    
    // Attempt to create duplicate record
    await expect(createAttendance(testInput))
      .rejects.toThrow(/Attendance record already exists for employee/i);
  });

  it('should allow multiple attendance records for same employee on different dates', async () => {
    const testInput1 = createTestInput({
      date: new Date('2024-01-15')
    });
    
    const testInput2 = createTestInput({
      date: new Date('2024-01-16'),
      hours_worked: 7.5,
      overtime_hours: 0
    });

    const result1 = await createAttendance(testInput1);
    const result2 = await createAttendance(testInput2);

    expect(result1.date).toEqual(new Date('2024-01-15'));
    expect(result2.date).toEqual(new Date('2024-01-16'));
    expect(result1.id).not.toEqual(result2.id);
  });

  it('should allow different employees to have attendance on same date', async () => {
    // Create second test employee
    const employee2Result = await db.insert(employeesTable)
      .values({
        employee_id: 'EMP002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@company.com',
        phone: '+1-555-0124',
        department: 'Marketing',
        position: 'Marketing Manager',
        monthly_salary: '4500.00',
        hire_date: '2024-01-02' // Use string format for date column
      })
      .returning()
      .execute();
    
    const testEmployee2Id = employee2Result[0].id;
    const testDate = new Date('2024-01-15');

    const testInput1 = createTestInput({
      employee_id: testEmployeeId,
      date: testDate
    });
    
    const testInput2 = createTestInput({
      employee_id: testEmployee2Id,
      date: testDate,
      hours_worked: 7.0,
      overtime_hours: 0.5
    });

    const result1 = await createAttendance(testInput1);
    const result2 = await createAttendance(testInput2);

    expect(result1.employee_id).toEqual(testEmployeeId);
    expect(result2.employee_id).toEqual(testEmployee2Id);
    expect(result1.date).toEqual(testDate);
    expect(result2.date).toEqual(testDate);
    expect(result1.id).not.toEqual(result2.id);
  });

  it('should validate attendance records are properly stored with date filtering', async () => {
    const testDate = new Date('2024-01-15');
    const testInput = createTestInput({
      date: testDate
    });
    
    await createAttendance(testInput);

    // Query with date and employee filter
    const dateString = testDate.toISOString().split('T')[0];
    const attendanceRecords = await db.select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employee_id, testEmployeeId),
          eq(attendanceTable.date, dateString) // Use string format for query
        )
      )
      .execute();

    expect(attendanceRecords).toHaveLength(1);
    expect(attendanceRecords[0].employee_id).toEqual(testEmployeeId);
    expect(attendanceRecords[0].date).toEqual(dateString); // Database returns string
  });
});