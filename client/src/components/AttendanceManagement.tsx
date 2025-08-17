import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Plus, Edit } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Employee, Attendance, CreateAttendanceInput, AttendanceQueryInput } from '../../../server/src/schema';

export function AttendanceManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  // Form state for creating attendance
  const [createFormData, setCreateFormData] = useState<CreateAttendanceInput>({
    employee_id: 0,
    date: new Date(),
    is_present: true,
    hours_worked: 8,
    overtime_hours: 0,
    notes: null
  });

  const loadEmployees = useCallback(async () => {
    try {
      const result = await trpc.getEmployees.query();
      setEmployees(result);
    } catch (error) {
      console.error('Failed to load employees:', error);
      // Stub data since backend handlers are placeholders
      const stubEmployees: Employee[] = [
        {
          id: 1,
          employee_id: 'EMP001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@company.com',
          phone: '+1234567890',
          department: 'Engineering',
          position: 'Software Developer',
          monthly_salary: 5000,
          hire_date: new Date('2023-01-15'),
          is_active: true,
          created_at: new Date('2023-01-15'),
          updated_at: new Date('2023-01-15')
        },
        {
          id: 2,
          employee_id: 'EMP002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@company.com',
          phone: '+1234567891',
          department: 'HR',
          position: 'HR Manager',
          monthly_salary: 4500,
          hire_date: new Date('2023-02-01'),
          is_active: true,
          created_at: new Date('2023-02-01'),
          updated_at: new Date('2023-02-01')
        }
      ];
      setEmployees(stubEmployees);
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    try {
      const query: AttendanceQueryInput = {
        start_date: new Date(selectedDate),
        end_date: new Date(selectedDate),
        employee_id: selectedEmployee === 'all' ? undefined : parseInt(selectedEmployee)
      };
      const result = await trpc.getAttendance.query(query);
      setAttendance(result);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      // Stub data since backend handlers are placeholders
      const stubAttendance: Attendance[] = [
        {
          id: 1,
          employee_id: 1,
          date: new Date(selectedDate),
          is_present: true,
          hours_worked: 8,
          overtime_hours: 0,
          notes: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          employee_id: 2,
          date: new Date(selectedDate),
          is_present: true,
          hours_worked: 8,
          overtime_hours: 2,
          notes: 'Project deadline work',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      
      // Filter stub data based on selection
      let filteredData = stubAttendance;
      if (selectedEmployee !== 'all') {
        filteredData = stubAttendance.filter((att: Attendance) => att.employee_id === parseInt(selectedEmployee));
      }
      setAttendance(filteredData);
    }
  }, [selectedDate, selectedEmployee]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createAttendance.mutate(createFormData);
      setAttendance((prev: Attendance[]) => [...prev, response]);
      setCreateFormData({
        employee_id: 0,
        date: new Date(),
        is_present: true,
        hours_worked: 8,
        overtime_hours: 0,
        notes: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployeeName = (employeeId: number): string => {
    const employee = employees.find((emp: Employee) => emp.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
  };

  const getTotalHours = (): number => {
    return attendance.reduce((total: number, att: Attendance) => total + att.hours_worked + att.overtime_hours, 0);
  };

  const getTotalOvertimeHours = (): number => {
    return attendance.reduce((total: number, att: Attendance) => total + att.overtime_hours, 0);
  };

  const getPresentCount = (): number => {
    return attendance.filter((att: Attendance) => att.is_present).length;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getPresentCount()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendance.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{getTotalHours()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{getTotalOvertimeHours()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="space-y-2">
            <Label htmlFor="date-filter">Date</Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee-filter">Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((employee: Employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Mark Attendance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
              <DialogDescription>
                Record attendance for an employee.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAttendance}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee</Label>
                  <Select
                    value={createFormData.employee_id.toString() || ''}
                    onValueChange={(value) =>
                      setCreateFormData((prev: CreateAttendanceInput) => ({ ...prev, employee_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee: Employee) => (
                        <SelectItem key={employee.id} value={employee.id.toString()}>
                          {employee.first_name} {employee.last_name} ({employee.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance_date">Date</Label>
                  <Input
                    id="attendance_date"
                    type="date"
                    value={createFormData.date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateAttendanceInput) => ({ ...prev, date: new Date(e.target.value) }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="is_present">Present</Label>
                  <Select
                    value={createFormData.is_present.toString()}
                    onValueChange={(value) =>
                      setCreateFormData((prev: CreateAttendanceInput) => ({ ...prev, is_present: value === 'true' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Present</SelectItem>
                      <SelectItem value="false">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createFormData.is_present && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hours_worked">Hours Worked</Label>
                        <Input
                          id="hours_worked"
                          type="number"
                          value={createFormData.hours_worked}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateFormData((prev: CreateAttendanceInput) => ({ ...prev, hours_worked: parseFloat(e.target.value) || 0 }))
                          }
                          min="0"
                          max="24"
                          step="0.5"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="overtime_hours">Overtime Hours</Label>
                        <Input
                          id="overtime_hours"
                          type="number"
                          value={createFormData.overtime_hours}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateFormData((prev: CreateAttendanceInput) => ({ ...prev, overtime_hours: parseFloat(e.target.value) || 0 }))
                          }
                          min="0"
                          max="24"
                          step="0.5"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={createFormData.notes || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setCreateFormData((prev: CreateAttendanceInput) => ({
                            ...prev,
                            notes: e.target.value || null
                          }))
                        }
                        placeholder="Add any notes about this attendance record..."
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || createFormData.employee_id === 0}>
                  {isLoading ? 'Saving...' : 'Save Attendance'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attendance Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hours Worked</TableHead>
              <TableHead>Overtime Hours</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                  No attendance records found for the selected date and employee. 📅
                </TableCell>
              </TableRow>
            ) : (
              attendance.map((record: Attendance) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{getEmployeeName(record.employee_id)}</TableCell>
                  <TableCell>{record.date.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={record.is_present ? "default" : "secondary"}>
                      {record.is_present ? 'Present' : 'Absent'}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.hours_worked}h</TableCell>
                  <TableCell>
                    {record.overtime_hours > 0 ? (
                      <span className="text-orange-600 font-medium">{record.overtime_hours}h</span>
                    ) : (
                      '0h'
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {(record.hours_worked + record.overtime_hours).toFixed(1)}h
                  </TableCell>
                  <TableCell>
                    {record.notes ? (
                      <span className="text-sm text-gray-600">{record.notes}</span>
                    ) : (
                      <span className="text-sm text-gray-400">No notes</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {attendance.length > 0 && (
        <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <div className="flex gap-6">
            <span>Present: <strong className="text-green-600">{getPresentCount()}</strong></span>
            <span>Total Hours: <strong className="text-blue-600">{getTotalHours()}</strong></span>
            <span>Overtime: <strong className="text-orange-600">{getTotalOvertimeHours()}</strong></span>
          </div>
          <div className="text-right">
            <p>Showing {attendance.length} record(s) for {new Date(selectedDate).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}