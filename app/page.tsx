'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ljizxogaenpsvjwdfsht.supabase.co',
  'sb_publishable_ogNC4cEyQigxxuSZqs7hNg__8nm8_32'
);

export default function InventoryManagementPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sorting State
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Admin Mode State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);

  // UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<any | null>(null);

  // New Item Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Spirit');
  const [newSize, setNewSize] = useState(750);
  const [newCost, setNewCost] = useState('');
  const [newPar, setNewPar] = useState(5);

  // Movement Modal State
  const [movementType, setMovementType] = useState<'delivery' | 'usage'>('delivery');
  const [movementQty, setMovementQty] = useState(1);
  const [movementNotes, setMovementNotes] = useState('');

  useEffect(() => {
    fetchInventoryData(sortOrder);
  }, [sortOrder]);

  async function fetchInventoryData(order: 'asc' | 'desc') {
    try {
      setLoading(true);
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: order === 'asc' });

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        setLoading(false);
        return;
      }

      const { data: movementsData, error: movementsError } = await supabase
        .from('stock_movements')
        .select('item_id, quantity_change');

      if (movementsError) {
        console.warn('Movements table check warning:', movementsError);
      }

      const processedItems = (itemsData || []).map((item: any) => {
        const itemMovements = (movementsData || []).filter((m: any) => m.item_id === item.id);
        const totalStock = itemMovements.reduce(
          (acc: number, curr: any) => acc + (curr.quantity_change || 0), 
          0
        );
        return { ...item, current_stock: totalStock };
      });

      setItems(processedItems);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleSort() {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (adminPasswordInput === 'admin123') { 
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminPasswordInput('');
    } else {
      alert('Incorrect admin password.');
    }
  }

  async function handleUpdateField(id: string, field: string, value: any) {
    try {
      const { error } = await supabase
        .from('items')
        .update({ [field]: value })
        .eq('id', id);

      if (error) {
        alert(`Failed to update ${field}: ` + error.message);
      } else {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
      }
    } catch (err) {
      console.error(`Unexpected error updating ${field}:`, err);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return;

    try {
      const { error } = await supabase.from('items').insert([
        {
          name: newName,
          category: newCategory,
          bottle_size_ml: Number(newSize),
          unit_cost: Number(newCost) || 0,
          par_level: Number(newPar)
        }
      ]);

      if (error) {
        alert('Failed to add item: ' + error.message);
      } else {
        setNewName('');
        setNewCost('');
        setShowAddForm(false);
        fetchInventoryData(sortOrder);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }

  async function handleRecordMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemForMovement) return;

    const multiplier = movementType === 'delivery' ? 1 : -1;
    const finalChange = Number(movementQty) * multiplier;
    const finalChangeMl = finalChange * (selectedItemForMovement.bottle_size_ml || 0);

    try {
      const { error } = await supabase.from('stock_movements').insert([
        {
          item_id: selectedItemForMovement.id,
          quantity_change: finalChange,
          quantity_ml: finalChangeMl,
          movement_type: movementType,
          notes: movementNotes || (movementType === 'delivery' ? 'Delivery In' : 'Usage Out')
        }
      ]);

      if (error) {
        alert('Failed to record stock movement: ' + error.message);
      } else {
        setSelectedItemForMovement(null);
        setMovementQty(1);
        setMovementNotes('');
        fetchInventoryData(sortOrder);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await supabase.from('stock_movements').delete().eq('item_id', id);
      const { error } = await supabase.from('items').delete().eq('id', id);
      
      if (error) {
        alert('Error deleting item: ' + error.message);
      } else {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }

  return (
    <main className="p-8 max-w-6xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bar & Restaurant Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mode: <span className={`font-semibold ${isAdmin ? 'text-purple-600' : 'text-blue-600'}`}>{isAdmin ? '🔒 Admin Mode' : 'Standard Staff View'}</span>
          </p>
        </div>
        
        <div className="space-x-3">
          {isAdmin ? (
            <button
              onClick={() => setIsAdmin(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition text-sm"
            >
              Lock Admin
            </button>
          ) : (
            <button
              onClick={() => setShowAdminModal(true)}
              className="bg-purple-100 text-purple-700 border border-purple-300 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 transition text-sm"
            >
              Admin Login
            </button>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            {showAddForm ? 'Cancel' : '+ Add New Item'}
          </button>
        </div>
      </div>

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
            <h2 className="text-lg font-bold mb-2">Enter Admin PIN</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Admin Password"
                className="w-full border rounded p-2 text-sm bg-white"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Item Form */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="bg-gray-50 border p-6 rounded-lg mb-8 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Jameson Irish Whiskey"
              className="w-full border rounded p-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full border rounded p-2 text-sm bg-white"
            >
              <option value="Spirit">Spirit</option>
              <option value="Wine">Wine</option>
              <option value="Beer">Beer</option>
              <option value="Syrup">Syrup</option>
              <option value="Mixer">Mixer</option>
              <option value="Supply">Supply</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bottle Size (mL)</label>
            <input
              type="number"
              value={newSize}
              onChange={(e) => setNewSize(Number(e.target.value))}
              className="w-full border rounded p-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
            <input
              type="number"
              step="0.01"
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
              placeholder="24.50"
              className="w-full border rounded p-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Par Level</label>
            <input
              type="number"
              value={newPar}
              onChange={(e) => setNewPar(Number(e.target.value))}
              className="w-full border rounded p-2 text-sm bg-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition"
            >
              Save Item
            </button>
          </div>
        </form>
      )}

      {/* Stock Adjustment Modal */}
      {selectedItemForMovement && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
            <h2 className="text-xl font-bold mb-1">Manage Stock</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedItemForMovement.name}</p>
            
            <form onSubmit={handleRecordMovement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
                <select
                  value={movementType}
                  onChange={(e: any) => setMovementType(e.target.value)}
                  className="w-full border rounded p-2 bg-white text-sm"
                >
                  <option value="delivery">Delivery In (+)</option>
                  <option value="usage">Usage / Out (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movementQty}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                  className="w-full border rounded p-2 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  placeholder="e.g. Weekly distributor delivery"
                  className="w-full border rounded p-2 bg-white text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemForMovement(null)}
                  className="px-4 py-2 border rounded text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                >
                  Save Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Inventory Table */}
      {loading ? (
        <p className="text-gray-500">Loading inventory dashboard...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No inventory items found.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-4">
                  <button 
                    onClick={toggleSort}
                    className="flex items-center space-x-1 font-bold text-gray-700 hover:text-black focus:outline-none"
                  >
                    <span>Item Name</span>
                    <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  </button>
                </th>
                <th className="px-6 py-4 font-bold text-gray-700">Category</th>
                <th className="px-6 py-4 font-bold text-gray-700">Size</th>
                <th className="px-6 py-4 font-bold text-gray-700">Current Stock</th>
                <th className="px-6 py-4 font-bold text-gray-700">Par Level</th>
                <th className="px-6 py-4 font-bold text-gray-700">Unit Cost</th>
                <th className="px-6 py-4 font-bold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const stock = item.current_stock ?? 0;
                const par = item.par_level ?? 0;
                const cost = item.unit_cost ?? 0;
                const isLow = stock < par;

                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.bottle_size_ml} ml
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm font-bold ${isLow ? 'bg-red-100 text-red-700' : 'text-gray-800'}`}>
                        {stock} {isLow && '⚠️ Low'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {isAdmin ? (
                        <input
                          type="number"
                          defaultValue={par}
                          onBlur={(e) => handleUpdateField(item.id, 'par_level', Number(e.target.value))}
                          className="w-16 border rounded p-1 text-sm bg-white font-medium text-purple-700"
                        />
                      ) : (
                        par
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {isAdmin ? (
                        <div className="flex items-center space-x-1">
                          <span>$</span>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={cost}
                            onBlur={(e) => handleUpdateField(item.id, 'unit_cost', Number(e.target.value))}
                            className="w-20 border rounded p-1 text-sm bg-white font-medium text-purple-700"
                          />
                        </div>
                      ) : (
                        `$${cost.toFixed(2)}`
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedItemForMovement(item)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs font-semibold border"
                      >
                        Adjust Stock
                      </button>
                      
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-2.5 py-1 rounded text-xs font-semibold transition"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
