import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Plus, Edit, Percent, DollarSign } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { DeductionConfig, CreateDeductionConfigInput, UpdateDeductionConfigInput } from '../../../server/src/schema';

export function DeductionManagement() {
  const [deductions, setDeductions] = useState<DeductionConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<DeductionConfig | null>(null);

  // Form state for creating deductions
  const [createFormData, setCreateFormData] = useState<CreateDeductionConfigInput>({
    name: '',
    type: 'percentage',
    value: 0,
    description: null
  });

  // Form state for editing deductions
  const [editFormData, setEditFormData] = useState<UpdateDeductionConfigInput>({
    id: 0
  });

  const loadDeductions = useCallback(async () => {
    try {
      const result = await trpc.getDeductionConfigs.query();
      setDeductions(result);
    } catch (error) {
      console.error('Failed to load deduction configurations:', error);
      // Stub data since backend handlers are placeholders
      const stubDeductions: DeductionConfig[] = [
        {
          id: 1,
          name: 'Income Tax',
          type: 'percentage',
          value: 0.15,
          is_active: true,
          description: 'Federal income tax deduction',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01')
        },
        {
          id: 2,
          name: 'Social Security',
          type: 'percentage',
          value: 0.062,
          is_active: true,
          description: 'Social Security contribution',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01')
        },
        {
          id: 3,
          name: 'Health Insurance',
          type: 'fixed',
          value: 150,
          is_active: true,
          description: 'Monthly health insurance premium',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01')
        },
        {
          id: 4,
          name: 'Retirement Plan',
          type: 'percentage',
          value: 0.05,
          is_active: true,
          description: '401(k) retirement plan contribution',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01')
        },
        {
          id: 5,
          name: 'Life Insurance',
          type: 'fixed',
          value: 25,
          is_active: false,
          description: 'Optional life insurance premium',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01')
        }
      ];
      setDeductions(stubDeductions);
    }
  }, []);

  useEffect(() => {
    loadDeductions();
  }, [loadDeductions]);

  const handleCreateDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createDeductionConfig.mutate(createFormData);
      setDeductions((prev: DeductionConfig[]) => [...prev, response]);
      setCreateFormData({
        name: '',
        type: 'percentage',
        value: 0,
        description: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create deduction configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeduction) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.updateDeductionConfig.mutate(editFormData);
      setDeductions((prev: DeductionConfig[]) => 
        prev.map((deduction: DeductionConfig) => deduction.id === editingDeduction.id ? response : deduction)
      );
      setIsEditDialogOpen(false);
      setEditingDeduction(null);
    } catch (error) {
      console.error('Failed to update deduction configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (deduction: DeductionConfig) => {
    setEditingDeduction(deduction);
    setEditFormData({
      id: deduction.id,
      name: deduction.name,
      type: deduction.type,
      value: deduction.value,
      is_active: deduction.is_active,
      description: deduction.description
    });
    setIsEditDialogOpen(true);
  };

  const toggleDeductionStatus = async (deduction: DeductionConfig) => {
    try {
      const updatedDeduction = await trpc.updateDeductionConfig.mutate({
        id: deduction.id,
        is_active: !deduction.is_active
      });
      setDeductions((prev: DeductionConfig[]) => 
        prev.map((d: DeductionConfig) => d.id === deduction.id ? updatedDeduction : d)
      );
    } catch (error) {
      console.error('Failed to toggle deduction status:', error);
      // For stub implementation, update locally
      setDeductions((prev: DeductionConfig[]) => 
        prev.map((d: DeductionConfig) => d.id === deduction.id ? { ...d, is_active: !d.is_active } : d)
      );
    }
  };

  const activeDeductions = deductions.filter((deduction: DeductionConfig) => deduction.is_active);
  const inactiveDeductions = deductions.filter((deduction: DeductionConfig) => !deduction.is_active);
  const percentageDeductions = activeDeductions.filter((deduction: DeductionConfig) => deduction.type === 'percentage');
  const fixedDeductions = activeDeductions.filter((deduction: DeductionConfig) => deduction.type === 'fixed');

  const getTotalPercentageDeductions = (): number => {
    return percentageDeductions.reduce((total: number, deduction: DeductionConfig) => total + deduction.value, 0);
  };

  const getTotalFixedDeductions = (): number => {
    return fixedDeductions.reduce((total: number, deduction: DeductionConfig) => total + deduction.value, 0);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deductions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Settings className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeDeductions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Percentage</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{(getTotalPercentageDeductions() * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fixed</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${getTotalFixedDeductions().toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Deduction Configurations</h3>
          <p className="text-sm text-gray-600">Configure tax percentages and other salary deductions</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Deduction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Deduction</DialogTitle>
              <DialogDescription>
                Create a new deduction configuration for payroll calculations.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDeduction}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Deduction Name</Label>
                  <Input
                    id="name"
                    value={createFormData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateDeductionConfigInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Income Tax, Health Insurance"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Deduction Type</Label>
                  <Select
                    value={createFormData.type}
                    onValueChange={(value: 'percentage' | 'fixed') =>
                      setCreateFormData((prev: CreateDeductionConfigInput) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage of Salary</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">
                    {createFormData.type === 'percentage' ? 'Percentage (0.0 - 1.0)' : 'Fixed Amount ($)'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    value={createFormData.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateDeductionConfigInput) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))
                    }
                    min="0"
                    step={createFormData.type === 'percentage' ? '0.01' : '0.01'}
                    max={createFormData.type === 'percentage' ? '1' : undefined}
                    placeholder={createFormData.type === 'percentage' ? '0.15 for 15%' : '150.00'}
                    required
                  />
                  {createFormData.type === 'percentage' && (
                    <p className="text-xs text-gray-500">
                      Enter as decimal (e.g., 0.15 for 15%, 0.05 for 5%)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={createFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateFormData((prev: CreateDeductionConfigInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    placeholder="Brief description of this deduction..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Deduction'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Deductions Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deductions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                  No deduction configurations found. Add your first deduction to get started! ⚙️
                </TableCell>
              </TableRow>
            ) : (
              deductions.map((deduction: DeductionConfig) => (
                <TableRow key={deduction.id}>
                  <TableCell className="font-medium">{deduction.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {deduction.type === 'percentage' ? (
                        <><Percent className="h-3 w-3 mr-1" />Percentage</>
                      ) : (
                        <><DollarSign className="h-3 w-3 mr-1" />Fixed</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {deduction.type === 'percentage' ? (
                      <span className="text-blue-600">{(deduction.value * 100).toFixed(2)}%</span>
                    ) : (
                      <span className="text-green-600">${deduction.value.toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {deduction.description ? (
                      <span className="text-sm text-gray-600">{deduction.description}</span>
                    ) : (
                      <span className="text-sm text-gray-400">No description</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={deduction.is_active}
                        onCheckedChange={() => toggleDeductionStatus(deduction)}
                      />
                      <Badge variant={deduction.is_active ? "default" : "secondary"}>
                        {deduction.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{deduction.created_at.toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(deduction)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Information */}
      {activeDeductions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Deductions Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <Percent className="h-4 w-4 mr-2 text-blue-600" />
                  Percentage Deductions ({percentageDeductions.length})
                </h4>
                {percentageDeductions.length === 0 ? (
                  <p className="text-sm text-gray-500">No percentage deductions configured</p>
                ) : (
                  <div className="space-y-2">
                    {percentageDeductions.map((deduction: DeductionConfig) => (
                      <div key={deduction.id} className="flex justify-between text-sm">
                        <span>{deduction.name}:</span>
                        <span className="font-medium text-blue-600">{(deduction.value * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between font-medium">
                        <span>Total Percentage Deductions:</span>
                        <span className="text-blue-600">{(getTotalPercentageDeductions() * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-orange-600" />
                  Fixed Deductions ({fixedDeductions.length})
                </h4>
                {fixedDeductions.length === 0 ? (
                  <p className="text-sm text-gray-500">No fixed deductions configured</p>
                ) : (
                  <div className="space-y-2">
                    {fixedDeductions.map((deduction: DeductionConfig) => (
                      <div key={deduction.id} className="flex justify-between text-sm">
                        <span>{deduction.name}:</span>
                        <span className="font-medium text-orange-600">${deduction.value.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between font-medium">
                        <span>Total Fixed Deductions:</span>
                        <span className="text-orange-600">${getTotalFixedDeductions().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> These deductions will be automatically applied when generating payslips. 
                Percentage deductions are calculated based on the employee's gross pay, while fixed deductions 
                are subtracted as flat amounts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Deduction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Deduction</DialogTitle>
            <DialogDescription>
              Update deduction configuration settings.
            </DialogDescription>
          </DialogHeader>
          {editingDeduction && (
            <form onSubmit={handleEditDeduction}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Deduction Name</Label>
                  <Input
                    id="edit_name"
                    value={editFormData.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateDeductionConfigInput) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_type">Deduction Type</Label>
                  <Select
                    value={editFormData.type || 'percentage'}
                    onValueChange={(value: 'percentage' | 'fixed') =>
                      setEditFormData((prev: UpdateDeductionConfigInput) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage of Salary</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_value">
                    {editFormData.type === 'percentage' ? 'Percentage (0.0 - 1.0)' : 'Fixed Amount ($)'}
                  </Label>
                  <Input
                    id="edit_value"
                    type="number"
                    value={editFormData.value || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateDeductionConfigInput) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))
                    }
                    min="0"
                    step={editFormData.type === 'percentage' ? '0.01' : '0.01'}
                    max={editFormData.type === 'percentage' ? '1' : undefined}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_active"
                    checked={editFormData.is_active || false}
                    onCheckedChange={(checked) =>
                      setEditFormData((prev: UpdateDeductionConfigInput) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="edit_is_active">Active</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_description">Description</Label>
                  <Textarea
                    id="edit_description"
                    value={editFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditFormData((prev: UpdateDeductionConfigInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Deduction'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}