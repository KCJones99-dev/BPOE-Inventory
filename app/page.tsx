'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
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
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<any | null>(null);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Spirit');
  const [newSize, setNewSize] = useState('750 mL');
  const [newCost, setNewCost] = useState('');
  const [newPar, setNewPar] = useState(5);

  const [movementType, setMovementType] = useState<'delivery' | 'usage'>('delivery');
  const [movementQty, setMovementQty] = useState(1);
  const [movementNotes, setMovementNotes] = useState('');

  // Activity Report States
  const [showActivityReport, setShowActivityReport] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reorder Report State
  const [showReorderReport, setShowReorderReport] = useState(false);

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

  async function fetchActivityLogs() {
    if (!isAdmin) return;
    try {
      setLogLoading(true);
      let query = supabase
        .from('stock_movements')
        .select(`
          id,
          created_at,
          quantity_change,
          movement_type,
          notes,
          total_cost,
          items (
            name,
            category,
            bottle_size_ml,
            unit_cost
          )
        `)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activity report:', error);
        alert('Failed to fetch activity report: ' + error.message);
      } else {
        setActivityLogs(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching logs:', err);
    } finally {
      setLogLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin && showActivityReport) {
      fetchActivityLogs();
    }
  }, [isAdmin, showActivityReport, startDate, endDate]);

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

  // Filter items live based on what's typed in the search bar
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const query = searchQuery.toLowerCase();
      const nameMatch = item.name?.toLowerCase().includes(query);
      const categoryMatch = item.category?.toLowerCase().includes(query);
      return nameMatch || categoryMatch;
    });
  }, [items, searchQuery]);

  function getCategoryBadgeClass(category: string) {
    switch (category?.toLowerCase()) {
      case 'beer':
        return 'bg-amber-500 text-white';
      case 'wine':
        return 'bg-rose-600 text-white';
      case 'spirit':
      case 'spirits':
        return 'bg-blue-600 text-white';
      case 'syrup':
        return 'bg-lime-500 text-white';
      case 'mixer':
        return 'bg-teal-600 text-white';
      case 'supply':
      case 'supplies':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
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
          bottle_size_ml: newSize,
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
    
    const parsedMl = parseInt(selectedItemForMovement.bottle_size_ml) || 0;
    const finalChangeMl = finalChange * parsedMl;
    
    const unitCost = Number(selectedItemForMovement.unit_cost) || 0;
    const transactionTotal = movementType === 'delivery' ? Number(movementQty) * unitCost : 0;

    try {
      const { error } = await supabase.from('stock_movements').insert([
        {
          item_id: selectedItemForMovement.id,
          quantity_change: finalChange,
          quantity_ml: finalChangeMl,
          movement_type: movementType,
          total_cost: transactionTotal,
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

  // Filter low stock items for the Reorder Report (Excluding discontinued items where par_level is 0)
  const lowStockItems = items.filter(item => {
    const stock = item.current_stock ?? 0;
    const par = item.par_level ?? 0;
    return par > 0 && stock < par;
  });

  const estimatedReorderCost = lowStockItems.reduce((acc, item) => {
    const deficit = (item.par_level ?? 0) - (item.current_stock ?? 0);
    const cost = Number(item.unit_cost) || 0;
    return acc + (deficit * cost);
  }, 0);

  return (
    <main className="min-h-screen bg-[#F2F2F7] text-slate-900 p-4 md:p-8 font-sans antialiased">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          /* Hide everything except the main inventory list container */
          main > div > *:not(#inventory-list-container) {
            display: none !important;
          }
          #inventory-list-container {
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          input, select {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

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
                setShowActivityReport(false);
                setShowReorderReport(false);
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
              <>
                <button
                  onClick={() => setIsAdmin(false)}
                  className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl font-medium hover:bg-purple-200 active:scale-95 transition-all text-xs"
                >
                  Exit Admin
                </button>
                <button
                  onClick={() => {
                    setShowActivityReport(!showActivityReport);
                    if (!showActivityReport) setShowReorderReport(false);
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-500 active:scale-95 transition-all text-xs shadow-md shadow-indigo-600/15"
                >
                  {showActivityReport ? 'Hide Activity Report' : 'Activity Report'}
                </button>
                <button
                  onClick={() => {
                    setShowReorderReport(!showReorderReport);
                    if (!showReorderReport) setShowActivityReport(false);
                  }}
                  className="bg-amber-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-amber-500 active:scale-95 transition-all text-xs shadow-md shadow-amber-600/15"
                >
                  {showReorderReport ? 'Hide Reorder Report' : `Reorder Report (${lowStockItems.length})`}
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-500 active:scale-95 transition-all text-xs shadow-md shadow-emerald-600/15"
                >
                  {showAddForm ? 'Cancel' : '+ Add Item'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Admin Login Modal */}
        {showAdminLoginModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-white/50 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Enter Admin PIN</h2>
              <p className="text-xs text-slate-500 mb-4">Required to view reports, add items, change costs, or delete entries.</p>
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

        {/* --- ACTIVITY REPORT PANEL (Admin Only) --- */}
        {isAdmin && showActivityReport && (
          <div className="bg-white/95 backdrop-blur-xl border border-indigo-100 p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Inventory Activity Report</h2>
                <p className="text-xs text-slate-500">Filter stock movements, deliveries, and usage logs by date range.</p>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[#F2F2F7] border border-transparent rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-[#F2F2F7] border border-transparent rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="self-end mb-0.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
              {logLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading activity report...</div>
              ) : activityLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No activity found for the selected date range.</div>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Change</th>
                        <th className="px-4 py-3">Transaction Amount</th>
                        <th className="px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activityLogs.map((log) => {
                        const isDelivery = log.movement_type === 'delivery';
                        const costVal = Number(log.total_cost) || 0;
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900">
                              {log.items?.name || 'Unknown Item'}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                                isDelivery ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {log.movement_type}
                              </span>
                            </td>
                            <td className={`px-4 py-2.5 font-bold whitespace-nowrap ${
                              log.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                              {isDelivery && costVal > 0 ? `$${costVal.toFixed(2)}` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {log.notes || '—'}
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
        )}

        {/* --- REORDER REPORT PANEL (Admin Only) --- */}
        {isAdmin && showReorderReport && (
          <div id="reorder-report-container" className="bg-white/95 backdrop-blur-xl border border-amber-100 p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Reorder Report</h2>
                <p className="text-xs text-slate-500">Items currently below their reorder level requiring replenishment.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-amber-50 border border-amber-200/60 px-4 py-2 rounded-2xl flex items-center gap-3">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-amber-600">Estimated Restock Cost</span>
                    <span className="text-sm font-bold text-amber-900">${estimatedReorderCost.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="no-print bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-slate-800 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>🖨️</span> Print Report
                </button>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
              {lowStockItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">All inventory levels are healthy! No items need reordering.</div>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Size / Format</th>
                        <th className="px-4 py-3">Current Stock</th>
                        <th className="px-4 py-3">Par Level</th>
                        <th className="px-4 py-3">Deficit (Needed)</th>
                        <th className="px-4 py-3">Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {lowStockItems.map((item) => {
                        const stock = item.current_stock ?? 0;
                        const par = item.par_level ?? 0;
                        const deficit = par - stock;
                        const unitCost = Number(item.unit_cost) || 0;
                        const totalDeficitCost = deficit * unitCost;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-slate-900">
                              {item.name}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${getCategoryBadgeClass(item.category)}`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 font-medium">
                              {item.bottle_size_ml || '—'}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-rose-600">
                              {stock} ⚠️
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 font-semibold">
                              {par}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-amber-600">
                              +{deficit}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-700">
                              {unitCost > 0 ? `$${totalDeficitCost.toFixed(2)}` : '—'}
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
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Size / Format</label>
                <input
                  type="text"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="e.g. 750 mL, 1 Keg, 1 Case"
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
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Reorder Level (0 = Discontinued)</label>
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

        {/* Live Search Bar Card */}
        <div className="no-print bg-white/90 backdrop-blur-xl border border-white/80 p-4 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items or categories..."
              className="w-full bg-[#F2F2F7] border border-transparent rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 font-medium px-2">
              Showing {filteredItems.length} of {items.length} items
            </div>
            <button
              onClick={() => window.print()}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-slate-800 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>🖨️</span> Print List
            </button>
          </div>
        </div>

        {/* Inventory List Container */}
        <div id="inventory-list-container" className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading inventory items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              {items.length === 0 ? 'No items added to the inventory yet.' : `No matching items found for "${searchQuery}"`}
            </div>
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
                    <th className="px-6 py-4">Size / Format</th>
                    <th className="px-6 py-4">Current Stock</th>
                    <th className="px-6 py-4">Reorder Level</th>
                    <th className="px-6 py-4">Unit Cost</th>
                    <th className="px-6 py-4 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredItems.map((item) => {
                    const stock = item.current_stock ?? 0;
                    const par = item.par_level ?? 0;
                    const cost = item.unit_cost ?? 0;
                    
                    const isDiscontinued = par === 0;
                    const isLow = !isDiscontinued && stock < par;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm ${getCategoryBadgeClass(item.category)}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {isAdmin ? (
                            <input
                              type="text"
                              defaultValue={item.bottle_size_ml || ''}
                              onBlur={(e) => handleUpdateField(item.id, 'bottle_size_ml', e.target.value)}
                              className="w-28 bg-[#F2F2F7] border border-transparent rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 focus:bg-white focus:border-purple-500 transition-all"
                            />
                          ) : (
                            <span>{item.bottle_size_ml || '—'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            isDiscontinued
                              ? 'bg-slate-200 text-slate-600'
                              : isLow 
                              ? 'bg-rose-50 text-rose-600' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {stock} {isDiscontinued ? '🚫 Discontinued' : isLow && '⚠️ Low'}
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
                        <td className="px-6 py-4 text-right space-x-2 no-print">
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
