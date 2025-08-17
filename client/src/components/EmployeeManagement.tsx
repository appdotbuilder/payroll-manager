import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '../../../server/src/schema';

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form state for creating new employees
  const [createFormData, setCreateFormData] = useState<CreateEmployeeInput>({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: null,
    department: '',
    position: '',
    monthly_salary: 0,
    hire_date: new Date()
  });

  // Form state for editing employees
  const [editFormData, setEditFormData] = useState<UpdateEmployeeInput>({
    id: 0
  });

  const loadEmployees = useCallback(async () => {
    try {
      const result = await trpc.getEmployees.query();
      setEmployees(result);
    } catch (error) {
      console.error('Failed to load employees:', error);
      // Note: Using stub data since backend handlers are placeholders
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

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createEmployee.mutate(createFormData);
      setEmployees((prev: Employee[]) => [...prev, response]);
      setCreateFormData({
        employee_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: null,
        department: '',
        position: '',
        monthly_salary: 0,
        hire_date: new Date()
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create employee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.updateEmployee.mutate(editFormData);
      setEmployees((prev: Employee[]) => 
        prev.map((emp: Employee) => emp.id === editingEmployee.id ? response : emp)
      );
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Failed to update employee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    try {
      await trpc.deleteEmployee.mutate({ id });
      setEmployees((prev: Employee[]) => prev.filter((emp: Employee) => emp.id !== id));
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditFormData({
      id: employee.id,
      employee_id: employee.employee_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      monthly_salary: employee.monthly_salary,
      hire_date: employee.hire_date,
      is_active: employee.is_active
    });
    setIsEditDialogOpen(true);
  };

  const activeEmployees = employees.filter((emp: Employee) => emp.is_active);
  const inactiveEmployees = employees.filter((emp: Employee) => !emp.is_active);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeEmployees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveEmployees.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Employee List</h3>
          <p className="text-sm text-gray-600">Manage your company's employee records</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new employee record.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEmployee}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      value={createFormData.employee_id}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEmployeeInput) => ({ ...prev, employee_id: e.target.value }))
                      }
                      placeholder="EMP001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={createFormData.first_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEmployeeInput) => ({ ...prev, first_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={createFormData.last_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEmployeeInput) => ({ ...prev, last_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createFormData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEmployeeInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    value={createFormData.phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateEmployeeInput) => ({
                        ...prev,
                        phone: e.target.value || null
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={createFormData.department}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEmployeeInput) => ({ ...prev, department: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={createFormData.position}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEmployeeInput) => ({ ...prev, position: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly_salary">Monthly Salary</Label>
                    <Input
                      id="monthly_salary"
                      type="number"
                      value={createFormData.monthly_salary}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEmployeeInput) => ({ ...prev, monthly_salary: parseFloat(e.target.value) || 0 }))
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Hire Date</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={createFormData.hire_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEmployeeInput) => ({ ...prev, hire_date: new Date(e.target.value) }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Employee'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employees Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                  No employees found. Add your first employee to get started! 👥
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee: Employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.employee_id}</TableCell>
                  <TableCell>{employee.first_name} {employee.last_name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>${employee.monthly_salary.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={employee.is_active ? "default" : "secondary"}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(employee)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {employee.first_name} {employee.last_name}? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteEmployee(employee.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information.
            </DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <form onSubmit={handleEditEmployee}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_employee_id">Employee ID</Label>
                    <Input
                      id="edit_employee_id"
                      value={editFormData.employee_id || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: UpdateEmployeeInput) => ({ ...prev, employee_id: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_first_name">First Name</Label>
                    <Input
                      id="edit_first_name"
                      value={editFormData.first_name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: UpdateEmployeeInput) => ({ ...prev, first_name: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_last_name">Last Name</Label>
                    <Input
                      id="edit_last_name"
                      value={editFormData.last_name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: UpdateEmployeeInput) => ({ ...prev, last_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_email">Email</Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: UpdateEmployeeInput) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input
                    id="edit_phone"
                    value={editFormData.phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateEmployeeInput) => ({
                        ...prev,
                        phone: e.target.value || null
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_department">Department</Label>
                    <Input
                      id="edit_department"
                      value={editFormData.department || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: UpdateEmployeeInput) => ({ ...prev, department: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_position">Position</Label>
                    <Input
                      id="edit_position"
                      value={editFormData.position || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: UpdateEmployeeInput) => ({ ...prev, position: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_monthly_salary">Monthly Salary</Label>
                    <Input
                      id="edit_monthly_salary"
                      type="number"
                      value={editFormData.monthly_salary || 0}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: UpdateEmployeeInput) => ({ ...prev, monthly_salary: parseFloat(e.target.value) || 0 }))
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_hire_date">Hire Date</Label>
                    <Input
                      id="edit_hire_date"
                      type="date"
                      value={editFormData.hire_date ? editFormData.hire_date.toISOString().split('T')[0] : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: UpdateEmployeeInput) => ({ ...prev, hire_date: new Date(e.target.value) }))
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Employee'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}