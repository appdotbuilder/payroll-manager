import { db } from '../db';
import { deductionConfigsTable } from '../db/schema';
import { type UpdateDeductionConfigInput, type DeductionConfig } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateDeductionConfig(input: UpdateDeductionConfigInput): Promise<DeductionConfig> {
  try {
    // First, verify the deduction config exists
    const existing = await db.select()
      .from(deductionConfigsTable)
      .where(eq(deductionConfigsTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Deduction config with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    if (input.value !== undefined) {
      updateData.value = input.value.toString(); // Convert number to string for numeric column
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Update the deduction config
    const result = await db.update(deductionConfigsTable)
      .set(updateData)
      .where(eq(deductionConfigsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const deductionConfig = result[0];
    return {
      ...deductionConfig,
      value: parseFloat(deductionConfig.value) // Convert string back to number
    };
  } catch (error) {
    console.error('Deduction config update failed:', error);
    throw error;
  }
}