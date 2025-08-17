import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createEmployeeInputSchema,
  updateEmployeeInputSchema,
  employeeIdInputSchema,
  createAttendanceInputSchema,
  updateAttendanceInputSchema,
  attendanceQueryInputSchema,
  createDeductionConfigInputSchema,
  updateDeductionConfigInputSchema,
  generatePayslipInputSchema,
  payslipQueryInputSchema
} from './schema';

// Import handlers
import { createEmployee } from './handlers/create_employee';
import { getEmployees } from './handlers/get_employees';
import { getEmployeeById } from './handlers/get_employee_by_id';
import { updateEmployee } from './handlers/update_employee';
import { deleteEmployee } from './handlers/delete_employee';
import { createAttendance } from './handlers/create_attendance';
import { getAttendance } from './handlers/get_attendance';
import { updateAttendance } from './handlers/update_attendance';
import { createDeductionConfig } from './handlers/create_deduction_config';
import { getDeductionConfigs } from './handlers/get_deduction_configs';
import { updateDeductionConfig } from './handlers/update_deduction_config';
import { generatePayslip } from './handlers/generate_payslip';
import { getPayslips } from './handlers/get_payslips';
import { getPayslipById } from './handlers/get_payslip_by_id';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Employee management routes
  createEmployee: publicProcedure
    .input(createEmployeeInputSchema)
    .mutation(({ input }) => createEmployee(input)),
  
  getEmployees: publicProcedure
    .query(() => getEmployees()),
  
  getEmployeeById: publicProcedure
    .input(employeeIdInputSchema)
    .query(({ input }) => getEmployeeById(input)),
  
  updateEmployee: publicProcedure
    .input(updateEmployeeInputSchema)
    .mutation(({ input }) => updateEmployee(input)),
  
  deleteEmployee: publicProcedure
    .input(employeeIdInputSchema)
    .mutation(({ input }) => deleteEmployee(input)),

  // Attendance management routes
  createAttendance: publicProcedure
    .input(createAttendanceInputSchema)
    .mutation(({ input }) => createAttendance(input)),
  
  getAttendance: publicProcedure
    .input(attendanceQueryInputSchema)
    .query(({ input }) => getAttendance(input)),
  
  updateAttendance: publicProcedure
    .input(updateAttendanceInputSchema)
    .mutation(({ input }) => updateAttendance(input)),

  // Deduction configuration routes
  createDeductionConfig: publicProcedure
    .input(createDeductionConfigInputSchema)
    .mutation(({ input }) => createDeductionConfig(input)),
  
  getDeductionConfigs: publicProcedure
    .query(() => getDeductionConfigs()),
  
  updateDeductionConfig: publicProcedure
    .input(updateDeductionConfigInputSchema)
    .mutation(({ input }) => updateDeductionConfig(input)),

  // Payslip management routes
  generatePayslip: publicProcedure
    .input(generatePayslipInputSchema)
    .mutation(({ input }) => generatePayslip(input)),
  
  getPayslips: publicProcedure
    .input(payslipQueryInputSchema)
    .query(({ input }) => getPayslips(input)),
  
  getPayslipById: publicProcedure
    .input(employeeIdInputSchema)
    .query(({ input }) => getPayslipById(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Payroll TRPC server listening at port: ${port}`);
}

start();