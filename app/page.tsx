'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ljizxogaenpsvjwdfsht.supabase.co',
  'sb_publishable_ogNC4cEyQigxxuSZqs7hNg__8nm8_32'
);

export default function InventoryManagementPage() {
  // Global Access Gate State (Regular User)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [globalPasswordInput, setGlobalPasswordInput] = useState('');

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sorting State
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Admin Mode State (Unlocked with admin PIN)
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

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
    if (isAuthenticated) {
      fetchInventoryData(sortOrder);
    }
  }, [isAuthenticated, sortOrder]);

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

  function handleRegularLogin(e: React.FormEvent) {
    e.preventDefault();
    if (globalPasswordInput === 'BPOE2257') {
      setIsAuthenticated(true);
      setGlobalPasswordInput('');
    } else {
      alert('Incorrect staff password.');
    }
  }

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (adminPasswordInput === '2257MGMT') {
      setIsAdmin(true);
      setShowAdminLoginModal(false);
      setAdminPasswordInput('');
    } else {
      alert('Incorrect Admin PIN.');
    }
  }

  function toggleSort() {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }

  async function handleUpdateField(id: string, field: string, value: any) {
    if (!isAdmin) return;
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
    if (!isAdmin || !newName) return;

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
    if (!isAdmin) return;
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

  // If not authenticated as regular user, show gate
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-800">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Inventory Portal</h1>
            <p className="text-xs text-slate-400 mt-1">Please enter your staff password to continue.</p>
          </div>
          <form onSubmit={handleRegularLogin} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={globalPasswordInput}
                onChange={(e) => setGlobalPasswordInput(e.target.value)}
                placeholder="Staff Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 text-sm"
            >
              Sign In
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Inventory Management</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Access:</span>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span> Admin Mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span> Staff View
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setIsAdmin(false);
              }}
              className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl font-medium hover:bg-slate-50 transition text-sm shadow-xs"
            >
              Log Out
            </button>

            {!isAdmin ? (
              <button
                onClick={() => setShowAdminLoginModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-purple-500 transition text-sm shadow-xs"
              >
                Admin Login
              </button>
            ) : (
              <button
                onClick={() => setIsAdmin(false)}
                className="bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-xl font-medium hover:bg-purple-100 transition text-sm"
              >
                Exit Admin
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-500 transition text-sm shadow-xs"
              >
                {showAddForm ? 'Cancel' : '+ Add Item'}
              </button>
            )}
          </div>
        </div>

        {/* Admin Login Modal */}
        {showAdminLoginModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Enter Admin PIN</h2>
              <p className="text-xs text-slate-500 mb-4">Required to add items, change costs, or delete entries.</p>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input
                  type="password"
                  required
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Admin PIN"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdminLoginModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 transition"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add New Item Form (Admin Only) */}
        {isAdmin && showAddForm && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Add New Inventory Item</h2>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Jameson Irish Whiskey"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Bottle Size (mL)</label>
                <input
                  type="number"
                  value={newSize}
                  onChange={(e) => setNewSize(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="24.50"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Reorder Level</label>
                <input
                  type="number"
                  value={newPar}
                  onChange={(e) => setNewPar(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-500 transition text-sm shadow-xs"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {selectedItemForMovement && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-0.5">Manage Stock</h2>
              <p className="text-sm font-medium text-indigo-600 mb-4">{selectedItemForMovement.name}</p>
              
              <form onSubmit={handleRecordMovement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Movement Type</label>
                  <select
                    value={movementType}
                    onChange={(e: any) => setMovementType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    <option value="delivery">Delivery In (+)</option>
                    <option value="usage">Usage / Out (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={movementQty}
                    onChange={(e) => setMovementQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={movementNotes}
                    onChange={(e) => setMovementNotes(e.target.value)}
                    placeholder="e.g. Weekly distributor delivery"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItemForMovement(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition"
                  >
                    Save Movement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Main Inventory Table Container */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading inventory data...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No inventory items found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="px-6 py-3.5">
                      <button 
                        onClick={toggleSort}
                        className="flex items-center space-x-1.5 font-bold text-slate-700 hover:text-slate-900 focus:outline-none"
                      >
                        <span>Item Name</span>
                        <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      </button>
                    </th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Size</th>
                    <th className="px-6 py-3.5">Current Stock</th>
                    <th className="px-6 py-3.5">Reorder Level</th>
                    <th className="px-6 py-3.5">Unit Cost</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {items.map((item) => {
                    const stock = item.current_stock ?? 0;
                    const par = item.par_level ?? 0;
                    const cost = item.unit_cost ?? 0;
                    const isLow = stock < par;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-100">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 font-medium">
                          {item.bottle_size_ml} mL
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isLow 
                              ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {stock} {isLow && '⚠️ Low'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">
                          {isAdmin ? (
                            <input
                              type="number"
                              defaultValue={par}
                              onBlur={(e) => handleUpdateField(item.id, 'par_level', Number(e.target.value))}
                              className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-semibold text-purple-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            />
                          ) : (
                            <span className="font-medium">{par}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">
                          {isAdmin ? (
                            <div className="inline-flex items-center bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500 transition">
                              <span className="text-slate-400 mr-1">$</span>
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={cost}
                                onBlur={(e) => handleUpdateField(item.id, 'unit_cost', Number(e.target.value))}
                                className="w-20 bg-transparent text-sm font-semibold text-purple-700 focus:outline-none"
                              />
                            </div>
                          ) : (
                            <span className="font-medium">${Number(cost).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedItemForMovement(item)}
                            className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 shadow-xs transition"
                          >
                            Adjust
                          </button>
                          
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs"
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
        </div>

      </div>
    </main>
  );
}
