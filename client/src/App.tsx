import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, FileText, Settings } from 'lucide-react';
import { EmployeeManagement } from '@/components/EmployeeManagement';
import { AttendanceManagement } from '@/components/AttendanceManagement';
import { PayslipManagement } from '@/components/PayslipManagement';
import { DeductionManagement } from '@/components/DeductionManagement';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💼 Payroll Management System
          </h1>
          <p className="text-gray-600">
            Manage employee data, track attendance, calculate salaries, and generate payslips
          </p>
        </div>

        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="payslips" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Payslips
            </TabsTrigger>
            <TabsTrigger value="deductions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Deductions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle>Employee Management</CardTitle>
                <CardDescription>
                  Add, edit, and manage employee records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmployeeManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Tracking</CardTitle>
                <CardDescription>
                  Track daily attendance and work hours for employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AttendanceManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payslips">
            <Card>
              <CardHeader>
                <CardTitle>Payslip Management</CardTitle>
                <CardDescription>
                  Generate and view employee payslips with salary calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PayslipManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deductions">
            <Card>
              <CardHeader>
                <CardTitle>Deduction Configuration</CardTitle>
                <CardDescription>
                  Configure tax percentages and other deductions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeductionManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;