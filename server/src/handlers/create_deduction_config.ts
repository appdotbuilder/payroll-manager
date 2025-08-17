import { db } from '../db';
import { deductionConfigsTable } from '../db/schema';
import { type CreateDeductionConfigInput, type DeductionConfig } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createDeductionConfig = async (input: CreateDeductionConfigInput): Promise<DeductionConfig> => {
  try {
    // Check if deduction name already exists among active configurations
    const existingConfig = await db.select()
      .from(deductionConfigsTable)
      .where(and(
        eq(deductionConfigsTable.name, input.name),
        eq(deductionConfigsTable.is_active, true)
      ))
      .execute();

    if (existingConfig.length > 0) {
      throw new Error(`Deduction configuration with name "${input.name}" already exists`);
    }

    // Insert new deduction configuration
    const result = await db.insert(deductionConfigsTable)
      .values({
        name: input.name,
        type: input.type,
        value: input.value.toString(), // Convert number to string for numeric column
        description: input.description
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const deductionConfig = result[0];
    return {
      ...deductionConfig,
      value: parseFloat(deductionConfig.value) // Convert string back to number
    };
  } catch (error) {
    console.error('Deduction configuration creation failed:', error);
    throw error;
  }
};