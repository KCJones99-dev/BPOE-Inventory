'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ljizxogaenpsvjwdfsht.supabase.co',
  'sb_publishable_ogNC4cEyQigxxuSZqs7hNg__8nm8_32'
);

export default function InventoryManagementPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [globalPasswordInput, setGlobalPasswordInput] = useState('');

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<any | null>(null);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Spirit');
  const [newSize, setNewSize] = useState(750);
  const [newCost, setNewCost] = useState('');
  const [newPar, setNewPar] = useState(5);

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

      const { data: movementsData } = await supabase
        .from('stock_movements')
        .select('item_id, quantity_change');

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

  // --- CLEAN, MINIMAL iOS-INSPIRED LOGIN GATE ---
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4 font-sans text-slate-900 antialiased">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Inventory Portal</h1>
            <p className="text-xs text-slate-500 mt-1">Enter your staff password to continue.</p>
          </div>
          <form onSubmit={handleRegularLogin} className="space-y-3">
            <input
              type="password"
              required
              value={globalPasswordInput}
              onChange={(e) => setGlobalPasswordInput(e.target.value)}
              placeholder="Staff Password"
              className="w-full bg-[#F2F2F7] border border-transparent rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-500 active:scale-[0.98] transition-all shadow-md shadow-blue-600/20 text-sm"
            >
              Sign In
            </button>
          </form>
        </div>
      </main>
    );
  }

  // --- POLISHED MAIN APP DASHBOARD ---
  return (
    <main className="min-h-screen bg-[#F2F2F7] text-slate-900 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation Bar / Header Card */}
        <div className="bg-white/90 backdrop-blur-xl p-5 rounded-3xl border border-white/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-blue-600 uppercase">Bar & Restaurant</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span> Admin Mode Unlocked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Staff View
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setIsAdmin(false);
              }}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium hover:bg-slate-200 active:scale-95 transition-all text-xs"
            >
              Log Out
            </button>

            {!isAdmin ? (
              <button
                onClick={() => setShowAdminLoginModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-purple-500 active:scale-95 transition-all text-xs shadow-md shadow-purple-600/15"
              >
                Admin Login
              </button>
            ) : (
              <button
                onClick={() => setIsAdmin(false)}
                className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl font-medium hover:bg-purple-200 active:scale-95 transition-all text-xs"
              >
                Exit Admin
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-500 active:scale-95 transition-all text-xs shadow-md shadow-emerald-600/15"
              >
                {showAddForm ? 'Cancel' : '+ Add Item'}
              </button>
            )}
          </div>
        </div>

        {/* Admin Login Modal */}
        {showAdminLoginModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-white/50 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Enter Admin PIN</h2>
              <p className="text-xs text-slate-500 mb-4">Required to add items, change costs, or delete entries.</p>
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <input
                  type="password"
                  required
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Admin PIN"
                  className="w-full bg-[#F2F2F7] border border-transparent rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-purple-500 transition-all"
                />
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdminLoginModal(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 transition-all shadow-md shadow-purple-600/20"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add New Item Form Card */}
        {isAdmin && showAddForm && (
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Add New Inventory Item</h2>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Jameson Irish Whiskey"
                  className="w-full bg-[#F2F2F7] border border-transparent rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#F2F2F7] border border-transparent rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 transition-all"
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
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Bottle Size (mL)</label>
                <input
                  type="number"
                  value={newSize}
                  onChange={(e) => setNewSize(Number(e.target.value))}
                  className="w-full bg-[#F2F2F7] border border-transparent rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="24.50"
                  className="w-full bg-[#F2F2F7] border border-transparent rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Reorder Level</label>
                <input
                  type="number"
                  value={newPar}
                  onChange={(e) => setNewPar(Number(e.target.value))}
                  className="w-full bg-[#F2F2F7] border border-transparent rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-500 transition-all text-sm shadow-md shadow-emerald-600/20"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {selectedItemForMovement && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/50 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-semibold text-slate-900">Manage Stock Level</h2>
              <p className="text-sm font-medium text-blue-600 mb-4">{selectedItemForMovement.name}</p>
              
              <form onSubmit={handleRecordMovement} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Movement Type</label>
                  <select
                    value={movementType}
                    onChange={(e: any) => setMovementType(e.target.value)}
                    className="w-full bg-[#F2F2F7] border border-transparent rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-blue-500 transition-all"
                  >
                    <option value="delivery">Delivery In (+)</option>
                    <option value="usage">Usage / Out (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={movementQty}
                    onChange={(e) => setMovementQty(Number(e.target.value))}
                    className="w-full bg-[#F2F2F7] border border-transparent rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={movementNotes}
                    onChange={(e) => setMovementNotes(e.target.value)}
                    placeholder="e.g. Weekly distributor delivery"
                    className="w-full bg-[#F2F2F7] border border-transparent rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItemForMovement(null)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 transition-all shadow-md shadow-blue-600/20"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Inventory List Container */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading inventory items...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No items added to the inventory yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F2F2F7]/50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="px-6 py-4">
                      <button 
                        onClick={toggleSort}
                        className="flex items-center space-x-1.5 font-bold text-slate-700 hover:text-slate-900 focus:outline-none"
                      >
                        <span>Item Name</span>
                        <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      </button>
                    </th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Current Stock</th>
                    <th className="px-6 py-4">Reorder Level</th>
                    <th className="px-6 py-4">Unit Cost</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {items.map((item) => {
                    const stock = item.current_stock ?? 0;
                    const par = item.par_level ?? 0;
                    const cost = item.unit_cost ?? 0;
                    const isLow = stock < par;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {item.bottle_size_ml} mL
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            isLow 
                              ? 'bg-rose-50 text-rose-600' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {stock} {isLow && '⚠️ Low'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {isAdmin ? (
                            <input
                              type="number"
                              defaultValue={par}
                              onBlur={(e) => handleUpdateField(item.id, 'par_level', Number(e.target.value))}
                              className="w-20 bg-[#F2F2F7] border border-transparent rounded-lg px-2.5 py-1.5 text-sm font-semibold text-purple-700 focus:bg-white focus:border-purple-500 transition-all"
                            />
                          ) : (
                            <span className="font-medium">{par}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {isAdmin ? (
                            <div className="inline-flex items-center bg-[#F2F2F7] border border-transparent rounded-lg px-2.5 py-1.5 focus-within:bg-white focus-within:border-purple-500 transition-all">
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
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedItemForMovement(item)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                          >
                            Adjust
                          </button>
                          
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
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
