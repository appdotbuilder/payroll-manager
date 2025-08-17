import { db } from '../db';
import { deductionConfigsTable } from '../db/schema';
import { type DeductionConfig } from '../schema';
import { eq } from 'drizzle-orm';

export const getDeductionConfigs = async (): Promise<DeductionConfig[]> => {
  try {
    // Fetch all active deduction configurations
    const results = await db.select()
      .from(deductionConfigsTable)
      .where(eq(deductionConfigsTable.is_active, true))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(config => ({
      ...config,
      value: parseFloat(config.value) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch deduction configurations:', error);
    throw error;
  }
};