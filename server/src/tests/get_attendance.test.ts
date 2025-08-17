import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable, attendanceTable } from '../db/schema';
import { type AttendanceQueryInput, type CreateEmployeeInput, type CreateAttendanceInput } from '../schema';
import { getAttendance } from '../handlers/get_attendance';

// Test employee data
const testEmployee: CreateEmployeeInput = {
  employee_id: 'EMP001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  department: 'Engineering',
  position: 'Software Developer',
  monthly_salary: 5000.00,
  hire_date: new Date('2023-01-01')
};

describe('getAttendance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no attendance records exist', async () => {
    const input: AttendanceQueryInput = {};
    const result = await getAttendance(input);

    expect(result).toEqual([]);
  });

  it('should return all attendance records from last 30 days when no filters provided', async () => {
    // Create test employee
    const employees = await db.insert(employeesTable)
      .values({
        employee_id: testEmployee.employee_id,
        first_name: testEmployee.first_name,
        last_name: testEmployee.last_name,
        email: testEmployee.email,
        phone: testEmployee.phone,
        department: testEmployee.department,
        position: testEmployee.position,
        monthly_salary: testEmployee.monthly_salary.toString(),
        hire_date: testEmployee.hire_date.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const employeeId = employees[0].id;

    // Create attendance records - some within 30 days, some older
    const today = new Date();
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(today.getDate() - 20);
    
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(today.getDate() - 40);

    const recentAttendance: CreateAttendanceInput = {
      employee_id: employeeId,
      date: twentyDaysAgo,
      is_present: true,
      hours_worked: 8.0,
      overtime_hours: 1.5,
      notes: 'Recent record'
    };

    const oldAttendance: CreateAttendanceInput = {
      employee_id: employeeId,
      date: fortyDaysAgo,
      is_present: true,
      hours_worked: 8.0,
      overtime_hours: 0.0,
      notes: 'Old record'
    };

    await db.insert(attendanceTable)
      .values([
        {
          employee_id: recentAttendance.employee_id,
          date: recentAttendance.date.toISOString().split('T')[0],
          is_present: recentAttendance.is_present,
          hours_worked: recentAttendance.hours_worked.toString(),
          overtime_hours: recentAttendance.overtime_hours.toString(),
          notes: recentAttendance.notes
        },
        {
          employee_id: oldAttendance.employee_id,
          date: oldAttendance.date.toISOString().split('T')[0],
          is_present: oldAttendance.is_present,
          hours_worked: oldAttendance.hours_worked.toString(),
          overtime_hours: oldAttendance.overtime_hours.toString(),
          notes: oldAttendance.notes
        }
      ])
      .execute();

    const result = await getAttendance({});

    // Should only return the recent record (within 30 days)
    expect(result).toHaveLength(1);
    expect(result[0].notes).toEqual('Recent record');
    expect(result[0].hours_worked).toEqual(8.0);
    expect(result[0].overtime_hours).toEqual(1.5);
    expect(typeof result[0].hours_worked).toBe('number');
    expect(typeof result[0].overtime_hours).toBe('number');
  });

  it('should filter attendance records by employee_id', async () => {
    // Create two test employees
    const employees = await db.insert(employeesTable)
      .values([
        {
          employee_id: 'EMP001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          department: 'Engineering',
          position: 'Developer',
          monthly_salary: '5000.00',
          hire_date: '2023-01-01'
        },
        {
          employee_id: 'EMP002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1234567891',
          department: 'Marketing',
          position: 'Manager',
          monthly_salary: '6000.00',
          hire_date: '2023-01-01'
        }
      ])
      .returning()
      .execute();

    const employee1Id = employees[0].id;
    const employee2Id = employees[1].id;

    // Create attendance records for both employees
    const today = new Date();
    await db.insert(attendanceTable)
      .values([
        {
          employee_id: employee1Id,
          date: today.toISOString().split('T')[0],
          is_present: true,
          hours_worked: '8.0',
          overtime_hours: '1.0',
          notes: 'Employee 1 record'
        },
        {
          employee_id: employee2Id,
          date: today.toISOString().split('T')[0],
          is_present: true,
          hours_worked: '7.5',
          overtime_hours: '0.5',
          notes: 'Employee 2 record'
        }
      ])
      .execute();

    const input: AttendanceQueryInput = {
      employee_id: employee1Id
    };

    const result = await getAttendance(input);

    expect(result).toHaveLength(1);
    expect(result[0].employee_id).toEqual(employee1Id);
    expect(result[0].notes).toEqual('Employee 1 record');
    expect(result[0].hours_worked).toEqual(8.0);
    expect(result[0].overtime_hours).toEqual(1.0);
  });

  it('should filter attendance records by date range', async () => {
    // Create test employee
    const employees = await db.insert(employeesTable)
      .values({
        employee_id: testEmployee.employee_id,
        first_name: testEmployee.first_name,
        last_name: testEmployee.last_name,
        email: testEmployee.email,
        phone: testEmployee.phone,
        department: testEmployee.department,
        position: testEmployee.position,
        monthly_salary: testEmployee.monthly_salary.toString(),
        hire_date: testEmployee.hire_date.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const employeeId = employees[0].id;

    // Create attendance records across different dates
    const startDate = new Date('2024-01-10');
    const inRangeDate = new Date('2024-01-15');
    const endDate = new Date('2024-01-20');
    const outsideRangeDate = new Date('2024-01-25');

    await db.insert(attendanceTable)
      .values([
        {
          employee_id: employeeId,
          date: '2024-01-05', // Before range
          is_present: true,
          hours_worked: '8.0',
          overtime_hours: '0.0',
          notes: 'Before range'
        },
        {
          employee_id: employeeId,
          date: inRangeDate.toISOString().split('T')[0], // In range
          is_present: true,
          hours_worked: '8.0',
          overtime_hours: '1.0',
          notes: 'In range'
        },
        {
          employee_id: employeeId,
          date: outsideRangeDate.toISOString().split('T')[0], // After range
          is_present: false,
          hours_worked: '0.0',
          overtime_hours: '0.0',
          notes: 'After range'
        }
      ])
      .execute();

    const input: AttendanceQueryInput = {
      start_date: startDate,
      end_date: endDate
    };

    const result = await getAttendance(input);

    expect(result).toHaveLength(1);
    expect(result[0].notes).toEqual('In range');
    expect(result[0].date).toEqual(inRangeDate);
    expect(result[0].hours_worked).toEqual(8.0);
    expect(result[0].overtime_hours).toEqual(1.0);
  });

  it('should combine employee_id and date range filters', async () => {
    // Create two test employees
    const employees = await db.insert(employeesTable)
      .values([
        {
          employee_id: 'EMP001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          department: 'Engineering',
          position: 'Developer',
          monthly_salary: '5000.00',
          hire_date: '2023-01-01'
        },
        {
          employee_id: 'EMP002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1234567891',
          department: 'Marketing',
          position: 'Manager',
          monthly_salary: '6000.00',
          hire_date: '2023-01-01'
        }
      ])
      .returning()
      .execute();

    const employee1Id = employees[0].id;
    const employee2Id = employees[1].id;

    const targetDate = new Date('2024-01-15');

    await db.insert(attendanceTable)
      .values([
        {
          employee_id: employee1Id,
          date: targetDate.toISOString().split('T')[0], // Target employee, target date
          is_present: true,
          hours_worked: '8.0',
          overtime_hours: '2.0',
          notes: 'Target record'
        },
        {
          employee_id: employee2Id,
          date: targetDate.toISOString().split('T')[0], // Wrong employee, target date
          is_present: true,
          hours_worked: '8.0',
          overtime_hours: '1.0',
          notes: 'Wrong employee'
        },
        {
          employee_id: employee1Id,
          date: '2024-01-25', // Target employee, wrong date
          is_present: true,
          hours_worked: '8.0',
          overtime_hours: '0.5',
          notes: 'Wrong date'
        }
      ])
      .execute();

    const input: AttendanceQueryInput = {
      employee_id: employee1Id,
      start_date: new Date('2024-01-10'),
      end_date: new Date('2024-01-20')
    };

    const result = await getAttendance(input);

    expect(result).toHaveLength(1);
    expect(result[0].employee_id).toEqual(employee1Id);
    expect(result[0].notes).toEqual('Target record');
    expect(result[0].overtime_hours).toEqual(2.0);
  });

  it('should return records ordered by date descending (most recent first)', async () => {
    // Create test employee
    const employees = await db.insert(employeesTable)
      .values({
        employee_id: testEmployee.employee_id,
        first_name: testEmployee.first_name,
        last_name: testEmployee.last_name,
        email: testEmployee.email,
        phone: testEmployee.phone,
        department: testEmployee.department,
        position: testEmployee.position,
        monthly_salary: testEmployee.monthly_salary.toString(),
        hire_date: testEmployee.hire_date.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const employeeId = employees[0].id;

    // Create attendance records on different dates
    const earlierDate = new Date('2024-01-10');
    const laterDate = new Date('2024-01-20');

    await db.insert(attendanceTable)
      .values([
        {
          employee_id: employeeId,
          date: earlierDate.toISOString().split('T')[0],
          is_present: true,
          hours_worked: '8.0',
          overtime_hours: '1.0',
          notes: 'Earlier record'
        },
        {
          employee_id: employeeId,
          date: laterDate.toISOString().split('T')[0],
          is_present: true,
          hours_worked: '7.5',
          overtime_hours: '0.5',
          notes: 'Later record'
        }
      ])
      .execute();

    // Query with specific date range to avoid 30-day filter
    const result = await getAttendance({
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    });

    expect(result).toHaveLength(2);
    // Most recent should be first
    expect(result[0].notes).toEqual('Later record');
    expect(result[0].date).toEqual(laterDate);
    expect(result[1].notes).toEqual('Earlier record');
    expect(result[1].date).toEqual(earlierDate);
  });

  it('should handle numeric conversion correctly', async () => {
    // Create test employee
    const employees = await db.insert(employeesTable)
      .values({
        employee_id: testEmployee.employee_id,
        first_name: testEmployee.first_name,
        last_name: testEmployee.last_name,
        email: testEmployee.email,
        phone: testEmployee.phone,
        department: testEmployee.department,
        position: testEmployee.position,
        monthly_salary: testEmployee.monthly_salary.toString(),
        hire_date: testEmployee.hire_date.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const employeeId = employees[0].id;

    await db.insert(attendanceTable)
      .values({
        employee_id: employeeId,
        date: new Date().toISOString().split('T')[0],
        is_present: true,
        hours_worked: '8.75', // Store as string
        overtime_hours: '2.25', // Store as string
        notes: 'Numeric test'
      })
      .execute();

    const result = await getAttendance({});

    expect(result).toHaveLength(1);
    expect(typeof result[0].hours_worked).toBe('number');
    expect(typeof result[0].overtime_hours).toBe('number');
    expect(result[0].hours_worked).toEqual(8.75);
    expect(result[0].overtime_hours).toEqual(2.25);
  });
});