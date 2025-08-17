import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { deductionConfigsTable } from '../db/schema';
import { type CreateDeductionConfigInput } from '../schema';
import { createDeductionConfig } from '../handlers/create_deduction_config';
import { eq } from 'drizzle-orm';

// Test inputs for different deduction types
const percentageDeductionInput: CreateDeductionConfigInput = {
  name: 'Income Tax',
  type: 'percentage',
  value: 0.15, // 15%
  description: 'Federal income tax deduction'
};

const fixedDeductionInput: CreateDeductionConfigInput = {
  name: 'Health Insurance',
  type: 'fixed',
  value: 200.50,
  description: 'Monthly health insurance premium'
};

const minimalInput: CreateDeductionConfigInput = {
  name: 'Social Security',
  type: 'percentage',
  value: 0.062,
  description: null
};

describe('createDeductionConfig', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a percentage-based deduction config', async () => {
    const result = await createDeductionConfig(percentageDeductionInput);

    // Basic field validation
    expect(result.name).toEqual('Income Tax');
    expect(result.type).toEqual('percentage');
    expect(result.value).toEqual(0.15);
    expect(typeof result.value).toBe('number');
    expect(result.description).toEqual('Federal income tax deduction');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a fixed amount deduction config', async () => {
    const result = await createDeductionConfig(fixedDeductionInput);

    expect(result.name).toEqual('Health Insurance');
    expect(result.type).toEqual('fixed');
    expect(result.value).toEqual(200.50);
    expect(typeof result.value).toBe('number');
    expect(result.description).toEqual('Monthly health insurance premium');
    expect(result.is_active).toBe(true);
  });

  it('should create deduction config with null description', async () => {
    const result = await createDeductionConfig(minimalInput);

    expect(result.name).toEqual('Social Security');
    expect(result.type).toEqual('percentage');
    expect(result.value).toEqual(0.062);
    expect(result.description).toBeNull();
    expect(result.is_active).toBe(true);
  });

  it('should save deduction config to database', async () => {
    const result = await createDeductionConfig(percentageDeductionInput);

    // Query database to verify insertion
    const configs = await db.select()
      .from(deductionConfigsTable)
      .where(eq(deductionConfigsTable.id, result.id))
      .execute();

    expect(configs).toHaveLength(1);
    expect(configs[0].name).toEqual('Income Tax');
    expect(configs[0].type).toEqual('percentage');
    expect(parseFloat(configs[0].value)).toEqual(0.15);
    expect(configs[0].description).toEqual('Federal income tax deduction');
    expect(configs[0].is_active).toBe(true);
    expect(configs[0].created_at).toBeInstanceOf(Date);
    expect(configs[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate deduction config names for active configs', async () => {
    // Create first deduction config
    await createDeductionConfig(percentageDeductionInput);

    // Try to create another with same name
    const duplicateInput: CreateDeductionConfigInput = {
      name: 'Income Tax', // Same name
      type: 'fixed',
      value: 100,
      description: 'Different description'
    };

    await expect(createDeductionConfig(duplicateInput))
      .rejects.toThrow(/already exists/i);
  });

  it('should allow same name if existing config is inactive', async () => {
    // Create first deduction config
    const firstResult = await createDeductionConfig(percentageDeductionInput);

    // Deactivate the first config
    await db.update(deductionConfigsTable)
      .set({ is_active: false })
      .where(eq(deductionConfigsTable.id, firstResult.id))
      .execute();

    // Should now allow creating config with same name
    const sameNameInput: CreateDeductionConfigInput = {
      name: 'Income Tax', // Same name as inactive config
      type: 'fixed',
      value: 100,
      description: 'New active config'
    };

    const result = await createDeductionConfig(sameNameInput);

    expect(result.name).toEqual('Income Tax');
    expect(result.type).toEqual('fixed');
    expect(result.value).toEqual(100);
    expect(result.is_active).toBe(true);
  });

  it('should handle high precision values correctly', async () => {
    const precisionInput: CreateDeductionConfigInput = {
      name: 'Retirement Fund',
      type: 'percentage',
      value: 0.0625, // 6.25%
      description: 'Employee retirement contribution'
    };

    const result = await createDeductionConfig(precisionInput);

    expect(result.value).toEqual(0.0625);
    expect(typeof result.value).toBe('number');

    // Verify in database
    const configs = await db.select()
      .from(deductionConfigsTable)
      .where(eq(deductionConfigsTable.id, result.id))
      .execute();

    expect(parseFloat(configs[0].value)).toEqual(0.0625);
  });

  it('should create multiple different deduction configs successfully', async () => {
    // Create multiple configs with different names
    const result1 = await createDeductionConfig(percentageDeductionInput);
    const result2 = await createDeductionConfig(fixedDeductionInput);
    const result3 = await createDeductionConfig(minimalInput);

    // Verify all have different IDs and correct data
    expect(result1.id).not.toEqual(result2.id);
    expect(result2.id).not.toEqual(result3.id);
    
    expect(result1.name).toEqual('Income Tax');
    expect(result2.name).toEqual('Health Insurance');
    expect(result3.name).toEqual('Social Security');

    // Verify all are in database
    const allConfigs = await db.select()
      .from(deductionConfigsTable)
      .execute();

    expect(allConfigs).toHaveLength(3);
    expect(allConfigs.every(config => config.is_active)).toBe(true);
  });
});