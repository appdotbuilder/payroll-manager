import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Plus, Eye, DollarSign, Calculator, TrendingUp } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Employee, Payslip, GeneratePayslipInput, PayslipQueryInput } from '../../../server/src/schema';

interface PayslipWithEmployee extends Payslip {
  employee?: Employee;
}

export function PayslipManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payslips, setPayslips] = useState<PayslipWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithEmployee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form state for generating payslips
  const [generateFormData, setGenerateFormData] = useState<GeneratePayslipInput>({
    employee_id: 0,
    pay_period_start: new Date(),
    pay_period_end: new Date(),
    overtime_rate: 1.5
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

  const loadPayslips = useCallback(async () => {
    try {
      const query: PayslipQueryInput = {
        employee_id: selectedEmployee === 'all' ? undefined : parseInt(selectedEmployee),
        start_date: startDate ? new Date(startDate) : undefined,
        end_date: endDate ? new Date(endDate) : undefined
      };
      const result = await trpc.getPayslips.query(query);
      const payslipsWithEmployees = result.map((payslip: Payslip) => ({
        ...payslip,
        employee: employees.find((emp: Employee) => emp.id === payslip.employee_id)
      }));
      setPayslips(payslipsWithEmployees);
    } catch (error) {
      console.error('Failed to load payslips:', error);
      // Stub data since backend handlers are placeholders
      const stubPayslips: PayslipWithEmployee[] = [
        {
          id: 1,
          employee_id: 1,
          pay_period_start: new Date('2024-01-01'),
          pay_period_end: new Date('2024-01-31'),
          gross_pay: 5250,
          total_deductions: 1050,
          net_pay: 4200,
          regular_hours: 160,
          overtime_hours: 10,
          overtime_rate: 1.5,
          deductions: JSON.stringify([
            { name: 'Income Tax', type: 'percentage', value: 0.15, amount: 787.5 },
            { name: 'Social Security', type: 'percentage', value: 0.05, amount: 262.5 }
          ]),
          generated_at: new Date(),
          employee: employees.find((emp: Employee) => emp.id === 1)
        },
        {
          id: 2,
          employee_id: 2,
          pay_period_start: new Date('2024-01-01'),
          pay_period_end: new Date('2024-01-31'),
          gross_pay: 4750,
          total_deductions: 950,
          net_pay: 3800,
          regular_hours: 160,
          overtime_hours: 5,
          overtime_rate: 1.5,
          deductions: JSON.stringify([
            { name: 'Income Tax', type: 'percentage', value: 0.15, amount: 712.5 },
            { name: 'Social Security', type: 'percentage', value: 0.05, amount: 237.5 }
          ]),
          generated_at: new Date(),
          employee: employees.find((emp: Employee) => emp.id === 2)
        }
      ];
      
      // Filter stub data based on selection
      let filteredData = stubPayslips;
      if (selectedEmployee !== 'all') {
        filteredData = stubPayslips.filter((payslip: PayslipWithEmployee) => payslip.employee_id === parseInt(selectedEmployee));
      }
      setPayslips(filteredData);
    }
  }, [selectedEmployee, startDate, endDate, employees]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (employees.length > 0) {
      loadPayslips();
    }
  }, [loadPayslips, employees]);

  const handleGeneratePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.generatePayslip.mutate(generateFormData);
      const payslipWithEmployee = {
        ...response,
        employee: employees.find((emp: Employee) => emp.id === response.employee_id)
      };
      setPayslips((prev: PayslipWithEmployee[]) => [...prev, payslipWithEmployee]);
      setGenerateFormData({
        employee_id: 0,
        pay_period_start: new Date(),
        pay_period_end: new Date(),
        overtime_rate: 1.5
      });
      setIsGenerateDialogOpen(false);
    } catch (error) {
      console.error('Failed to generate payslip:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewPayslip = (payslip: PayslipWithEmployee) => {
    setSelectedPayslip(payslip);
    setIsViewDialogOpen(true);
  };

  const parseDeductions = (deductionsJson: string) => {
    try {
      return JSON.parse(deductionsJson);
    } catch {
      return [];
    }
  };

  const getTotalGrossPay = (): number => {
    return payslips.reduce((total: number, payslip: PayslipWithEmployee) => total + payslip.gross_pay, 0);
  };

  const getTotalNetPay = (): number => {
    return payslips.reduce((total: number, payslip: PayslipWithEmployee) => total + payslip.net_pay, 0);
  };

  const getTotalDeductions = (): number => {
    return payslips.reduce((total: number, payslip: PayslipWithEmployee) => total + payslip.total_deductions, 0);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payslips</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payslips.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${getTotalGrossPay().toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${getTotalDeductions().toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Pay</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${getTotalNetPay().toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
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
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Payslip
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Payslip</DialogTitle>
              <DialogDescription>
                Generate a new payslip for an employee for a specific pay period.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGeneratePayslip}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee</Label>
                  <Select
                    value={generateFormData.employee_id.toString() || ''}
                    onValueChange={(value) =>
                      setGenerateFormData((prev: GeneratePayslipInput) => ({ ...prev, employee_id: parseInt(value) }))
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pay_period_start">Pay Period Start</Label>
                    <Input
                      id="pay_period_start"
                      type="date"
                      value={generateFormData.pay_period_start.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setGenerateFormData((prev: GeneratePayslipInput) => ({ ...prev, pay_period_start: new Date(e.target.value) }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay_period_end">Pay Period End</Label>
                    <Input
                      id="pay_period_end"
                      type="date"
                      value={generateFormData.pay_period_end.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setGenerateFormData((prev: GeneratePayslipInput) => ({ ...prev, pay_period_end: new Date(e.target.value) }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtime_rate">Overtime Rate Multiplier</Label>
                  <Input
                    id="overtime_rate"
                    type="number"
                    value={generateFormData.overtime_rate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setGenerateFormData((prev: GeneratePayslipInput) => ({ ...prev, overtime_rate: parseFloat(e.target.value) || 1.5 }))
                    }
                    min="1"
                    step="0.1"
                    placeholder="1.5"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || generateFormData.employee_id === 0}>
                  {isLoading ? 'Generating...' : 'Generate Payslip'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payslips Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Pay Period</TableHead>
              <TableHead>Gross Pay</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead>Regular Hours</TableHead>
              <TableHead>Overtime Hours</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                  No payslips found. Generate your first payslip to get started! 💰
                </TableCell>
              </TableRow>
            ) : (
              payslips.map((payslip: PayslipWithEmployee) => (
                <TableRow key={payslip.id}>
                  <TableCell className="font-medium">
                    {payslip.employee 
                      ? `${payslip.employee.first_name} ${payslip.employee.last_name}`
                      : 'Unknown Employee'
                    }
                  </TableCell>
                  <TableCell>
                    {payslip.pay_period_start.toLocaleDateString()} - {payslip.pay_period_end.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    ${payslip.gross_pay.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-red-600">
                    ${payslip.total_deductions.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-bold text-blue-600">
                    ${payslip.net_pay.toFixed(2)}
                  </TableCell>
                  <TableCell>{payslip.regular_hours}h</TableCell>
                  <TableCell>
                    {payslip.overtime_hours > 0 ? (
                      <span className="text-orange-600 font-medium">{payslip.overtime_hours}h</span>
                    ) : (
                      '0h'
                    )}
                  </TableCell>
                  <TableCell>{payslip.generated_at.toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewPayslip(payslip)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Payslip Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
            <DialogDescription>
              {selectedPayslip?.employee 
                ? `${selectedPayslip.employee.first_name} ${selectedPayslip.employee.last_name} - ${selectedPayslip.pay_period_start.toLocaleDateString()} to ${selectedPayslip.pay_period_end.toLocaleDateString()}`
                : 'Payslip Details'
              }
            </DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Employee Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>Name:</span>
                  <span className="font-medium">
                    {selectedPayslip.employee 
                      ? `${selectedPayslip.employee.first_name} ${selectedPayslip.employee.last_name}`
                      : 'Unknown Employee'
                    }
                  </span>
                  <span>Employee ID:</span>
                  <span className="font-medium">
                    {selectedPayslip.employee?.employee_id || 'N/A'}
                  </span>
                  <span>Department:</span>
                  <span className="font-medium">
                    {selectedPayslip.employee?.department || 'N/A'}
                  </span>
                  <span>Position:</span>
                  <span className="font-medium">
                    {selectedPayslip.employee?.position || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Hours & Earnings */}
              <div>
                <h4 className="font-medium mb-3">Hours & Earnings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Regular Hours ({selectedPayslip.regular_hours}h):</span>
                    <span className="font-medium">
                      ${(selectedPayslip.gross_pay - (selectedPayslip.overtime_hours * (selectedPayslip.employee?.monthly_salary || 0) / 160 * selectedPayslip.overtime_rate)).toFixed(2)}
                    </span>
                  </div>
                  {selectedPayslip.overtime_hours > 0 && (
                    <div className="flex justify-between">
                      <span>Overtime Hours ({selectedPayslip.overtime_hours}h @ {selectedPayslip.overtime_rate}x):</span>
                      <span className="font-medium text-orange-600">
                        ${(selectedPayslip.overtime_hours * (selectedPayslip.employee?.monthly_salary || 0) / 160 * selectedPayslip.overtime_rate).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium text-green-600">
                    <span>Gross Pay:</span>
                    <span>${selectedPayslip.gross_pay.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="font-medium mb-3">Deductions</h4>
                <div className="space-y-2 text-sm">
                  {parseDeductions(selectedPayslip.deductions).map((deduction: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span>
                        {deduction.name} ({deduction.type === 'percentage' ? `${(deduction.value * 100).toFixed(1)}%` : `$${deduction.value}`}):
                      </span>
                      <span className="font-medium text-red-600">-${deduction.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-medium text-red-600">
                    <span>Total Deductions:</span>
                    <span>-${selectedPayslip.total_deductions.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between text-lg font-bold text-blue-600">
                  <span>Net Pay:</span>
                  <span>${selectedPayslip.net_pay.toFixed(2)}</span>
                </div>
              </div>

              {/* Generation Info */}
              <div className="text-xs text-gray-500 text-center">
                Generated on {selectedPayslip.generated_at.toLocaleDateString()} at {selectedPayslip.generated_at.toLocaleTimeString()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}