import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { deductionConfigsTable } from '../db/schema';
import { getDeductionConfigs } from '../handlers/get_deduction_configs';

describe('getDeductionConfigs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no deduction configurations exist', async () => {
    const result = await getDeductionConfigs();
    expect(result).toEqual([]);
  });

  it('should return all active deduction configurations', async () => {
    // Create test deduction configurations
    await db.insert(deductionConfigsTable).values([
      {
        name: 'Income Tax',
        type: 'percentage',
        value: '0.15',
        is_active: true,
        description: 'Federal income tax'
      },
      {
        name: 'Health Insurance',
        type: 'fixed',
        value: '200.00',
        is_active: true,
        description: 'Monthly health insurance premium'
      }
    ]).execute();

    const result = await getDeductionConfigs();

    expect(result).toHaveLength(2);
    
    // Verify first configuration
    const incomeTax = result.find(config => config.name === 'Income Tax');
    expect(incomeTax).toBeDefined();
    expect(incomeTax!.type).toEqual('percentage');
    expect(incomeTax!.value).toEqual(0.15);
    expect(typeof incomeTax!.value).toBe('number');
    expect(incomeTax!.is_active).toBe(true);
    expect(incomeTax!.description).toEqual('Federal income tax');

    // Verify second configuration
    const healthInsurance = result.find(config => config.name === 'Health Insurance');
    expect(healthInsurance).toBeDefined();
    expect(healthInsurance!.type).toEqual('fixed');
    expect(healthInsurance!.value).toEqual(200.00);
    expect(typeof healthInsurance!.value).toBe('number');
    expect(healthInsurance!.is_active).toBe(true);
    expect(healthInsurance!.description).toEqual('Monthly health insurance premium');
  });

  it('should only return active deduction configurations', async () => {
    // Create both active and inactive configurations
    await db.insert(deductionConfigsTable).values([
      {
        name: 'Active Tax',
        type: 'percentage',
        value: '0.10',
        is_active: true,
        description: 'Active tax deduction'
      },
      {
        name: 'Inactive Tax',
        type: 'percentage',
        value: '0.05',
        is_active: false,
        description: 'Inactive tax deduction'
      },
      {
        name: 'Active Insurance',
        type: 'fixed',
        value: '150.00',
        is_active: true,
        description: 'Active insurance deduction'
      }
    ]).execute();

    const result = await getDeductionConfigs();

    expect(result).toHaveLength(2);
    
    // Verify only active configurations are returned
    const configNames = result.map(config => config.name);
    expect(configNames).toContain('Active Tax');
    expect(configNames).toContain('Active Insurance');
    expect(configNames).not.toContain('Inactive Tax');
  });

  it('should handle both percentage and fixed deduction types', async () => {
    await db.insert(deductionConfigsTable).values([
      {
        name: 'Social Security',
        type: 'percentage',
        value: '0.062',
        is_active: true,
        description: 'Social security tax'
      },
      {
        name: 'Union Dues',
        type: 'fixed',
        value: '50.00',
        is_active: true,
        description: 'Monthly union dues'
      }
    ]).execute();

    const result = await getDeductionConfigs();

    expect(result).toHaveLength(2);

    const percentageConfig = result.find(config => config.type === 'percentage');
    expect(percentageConfig).toBeDefined();
    expect(percentageConfig!.name).toEqual('Social Security');
    expect(percentageConfig!.value).toEqual(0.062);

    const fixedConfig = result.find(config => config.type === 'fixed');
    expect(fixedConfig).toBeDefined();
    expect(fixedConfig!.name).toEqual('Union Dues');
    expect(fixedConfig!.value).toEqual(50.00);
  });

  it('should return configurations with all required fields', async () => {
    await db.insert(deductionConfigsTable).values({
      name: 'Test Deduction',
      type: 'percentage',
      value: '0.08',
      is_active: true,
      description: 'Test description'
    }).execute();

    const result = await getDeductionConfigs();

    expect(result).toHaveLength(1);
    const config = result[0];
    
    expect(config.id).toBeDefined();
    expect(config.name).toEqual('Test Deduction');
    expect(config.type).toEqual('percentage');
    expect(config.value).toEqual(0.08);
    expect(config.is_active).toBe(true);
    expect(config.description).toEqual('Test description');
    expect(config.created_at).toBeInstanceOf(Date);
    expect(config.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    await db.insert(deductionConfigsTable).values({
      name: 'No Description Tax',
      type: 'fixed',
      value: '100.00',
      is_active: true,
      description: null
    }).execute();

    const result = await getDeductionConfigs();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
  });
});