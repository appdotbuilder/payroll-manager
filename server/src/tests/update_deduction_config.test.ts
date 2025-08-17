import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { deductionConfigsTable } from '../db/schema';
import { type UpdateDeductionConfigInput } from '../schema';
import { updateDeductionConfig } from '../handlers/update_deduction_config';
import { eq } from 'drizzle-orm';

describe('updateDeductionConfig', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a deduction config with all fields', async () => {
    // Create a test deduction config first
    const created = await db.insert(deductionConfigsTable)
      .values({
        name: 'Original Tax',
        type: 'percentage',
        value: '0.10',
        is_active: true,
        description: 'Original description'
      })
      .returning()
      .execute();

    const testInput: UpdateDeductionConfigInput = {
      id: created[0].id,
      name: 'Updated Income Tax',
      type: 'fixed',
      value: 500.75,
      is_active: false,
      description: 'Updated tax description'
    };

    const result = await updateDeductionConfig(testInput);

    // Basic field validation
    expect(result.id).toEqual(created[0].id);
    expect(result.name).toEqual('Updated Income Tax');
    expect(result.type).toEqual('fixed');
    expect(result.value).toEqual(500.75);
    expect(typeof result.value).toEqual('number');
    expect(result.is_active).toEqual(false);
    expect(result.description).toEqual('Updated tax description');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > created[0].updated_at).toBe(true);
  });

  it('should update deduction config in database', async () => {
    // Create a test deduction config first
    const created = await db.insert(deductionConfigsTable)
      .values({
        name: 'Social Security',
        type: 'percentage',
        value: '0.062',
        is_active: true,
        description: null
      })
      .returning()
      .execute();

    const testInput: UpdateDeductionConfigInput = {
      id: created[0].id,
      name: 'Updated Social Security',
      value: 0.065
    };

    const result = await updateDeductionConfig(testInput);

    // Query database to verify update
    const updated = await db.select()
      .from(deductionConfigsTable)
      .where(eq(deductionConfigsTable.id, result.id))
      .execute();

    expect(updated).toHaveLength(1);
    expect(updated[0].name).toEqual('Updated Social Security');
    expect(updated[0].type).toEqual('percentage'); // Should remain unchanged
    expect(parseFloat(updated[0].value)).toEqual(0.065);
    expect(updated[0].is_active).toEqual(true); // Should remain unchanged
    expect(updated[0].description).toBeNull(); // Should remain unchanged
    expect(updated[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    // Create a test deduction config first
    const created = await db.insert(deductionConfigsTable)
      .values({
        name: 'Health Insurance',
        type: 'fixed',
        value: '200.00',
        is_active: true,
        description: 'Monthly health insurance premium'
      })
      .returning()
      .execute();

    // Update only the name and is_active fields
    const testInput: UpdateDeductionConfigInput = {
      id: created[0].id,
      name: 'Premium Health Coverage',
      is_active: false
    };

    const result = await updateDeductionConfig(testInput);

    expect(result.name).toEqual('Premium Health Coverage');
    expect(result.type).toEqual('fixed'); // Should remain unchanged
    expect(result.value).toEqual(200.00); // Should remain unchanged
    expect(result.is_active).toEqual(false);
    expect(result.description).toEqual('Monthly health insurance premium'); // Should remain unchanged
  });

  it('should handle nullable description field', async () => {
    // Create a test deduction config with null description
    const created = await db.insert(deductionConfigsTable)
      .values({
        name: 'Test Deduction',
        type: 'percentage',
        value: '0.05',
        is_active: true,
        description: null
      })
      .returning()
      .execute();

    // Update description to a value
    const testInput1: UpdateDeductionConfigInput = {
      id: created[0].id,
      description: 'Added description'
    };

    const result1 = await updateDeductionConfig(testInput1);
    expect(result1.description).toEqual('Added description');

    // Update description back to null
    const testInput2: UpdateDeductionConfigInput = {
      id: created[0].id,
      description: null
    };

    const result2 = await updateDeductionConfig(testInput2);
    expect(result2.description).toBeNull();
  });

  it('should handle numeric value conversions correctly', async () => {
    // Create a test deduction config
    const created = await db.insert(deductionConfigsTable)
      .values({
        name: 'Test Tax',
        type: 'percentage',
        value: '0.1500',
        is_active: true,
        description: null
      })
      .returning()
      .execute();

    // Update with decimal value
    const testInput: UpdateDeductionConfigInput = {
      id: created[0].id,
      value: 0.1750
    };

    const result = await updateDeductionConfig(testInput);
    
    expect(typeof result.value).toEqual('number');
    expect(result.value).toEqual(0.1750);

    // Verify in database that it's stored as string
    const dbResult = await db.select()
      .from(deductionConfigsTable)
      .where(eq(deductionConfigsTable.id, result.id))
      .execute();
    
    expect(typeof dbResult[0].value).toEqual('string');
    expect(parseFloat(dbResult[0].value)).toEqual(0.1750);
  });

  it('should throw error for non-existent deduction config', async () => {
    const testInput: UpdateDeductionConfigInput = {
      id: 99999, // Non-existent ID
      name: 'Should fail'
    };

    expect(updateDeductionConfig(testInput)).rejects.toThrow(/not found/i);
  });

  it('should update deduction config type from percentage to fixed', async () => {
    // Create a percentage-based deduction
    const created = await db.insert(deductionConfigsTable)
      .values({
        name: 'Flexible Deduction',
        type: 'percentage',
        value: '0.08',
        is_active: true,
        description: 'Originally percentage-based'
      })
      .returning()
      .execute();

    // Update to fixed amount
    const testInput: UpdateDeductionConfigInput = {
      id: created[0].id,
      type: 'fixed',
      value: 300.00,
      description: 'Now fixed amount'
    };

    const result = await updateDeductionConfig(testInput);

    expect(result.type).toEqual('fixed');
    expect(result.value).toEqual(300.00);
    expect(result.description).toEqual('Now fixed amount');
    expect(result.name).toEqual('Flexible Deduction'); // Should remain unchanged
  });

  it('should preserve created_at timestamp while updating updated_at', async () => {
    // Create a test deduction config
    const created = await db.insert(deductionConfigsTable)
      .values({
        name: 'Time Test',
        type: 'percentage',
        value: '0.05',
        is_active: true,
        description: null
      })
      .returning()
      .execute();

    const originalCreatedAt = created[0].created_at;
    const originalUpdatedAt = created[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const testInput: UpdateDeductionConfigInput = {
      id: created[0].id,
      name: 'Updated Name'
    };

    const result = await updateDeductionConfig(testInput);

    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });
});