'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ljizxogaenpsvjwdfsht.supabase.co',
  'sb_publishable_ogNC4cEyQigxxuSZqs7hNg__8nm8_32'
);

export default function InventoryDashboard() {
  const [authed, setAuthed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [modalType, setModalType] = useState<'delivery' | 'adjust' | null>(null)
  const [qtyChange, setQtyChange] = useState('')
  const [note, setNote] = useState('')

  // New item states
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newCost, setNewCost] = useState('')
  const [newPar, setNewPar] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'BPOE2257') {
      setAuthed(true)
    } else {
      alert('Incorrect Password')
    }
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPin === '2257MGMT') {
      setIsAdmin(true)
    } else {
      alert('Incorrect Admin PIN')
    }
  }

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const { data: itemsData, error: itemsError } = await supabase.from('items').select('*')
      if (itemsError) throw itemsError

      const { data: movementsData, error: movementsError } = await supabase.from('stock_movements').select('*')
      if (movementsError) throw movementsError

      const combined = itemsData.map(item => {
        const itemMovements = movementsData.filter(m => m.item_id === item.id)
        const current_stock = itemMovements.reduce((acc, m) => acc + (m.quantity_change || 0), 0)
        return { ...item, current_stock }
      })

      setItems(combined)
    } catch (err) {
      console.error('Error fetching inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authed) {
      fetchInventory()
    }
  }, [authed])

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !qtyChange) return

    const change = parseInt(qtyChange)
    if (isNaN(change)) return

    try {
      const { error } = await supabase.from('stock_movements').insert([
        {
          item_id: selectedItem.id,
          quantity_change: modalType === 'delivery' ? Math.abs(change) : change,
          movement_type: modalType === 'delivery' ? 'delivery' : 'adjustment',
          notes: note || null
        }
      ])

      if (error) throw error

      setSelectedItem(null)
      setModalType(null)
      setQtyChange('')
      setNote('')
      fetchInventory()
    } catch (err) {
      console.error('Error updating stock:', err)
      alert('Failed to update stock')
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName) return

    try {
      const { error } = await supabase.from('items').insert([
        {
          name: newName,
          category: newCategory || 'General',
          unit_cost: parseFloat(newCost) || 0,
          par_level: parseInt(newPar) || 0
        }
      ])

      if (error) throw error

      setNewName('')
      setNewCategory('')
      setNewCost('')
      setNewPar('')
      fetchInventory()
    } catch (err) {
      console.error('Error adding item:', err)
      alert('Failed to add item')
    }
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Bar Inventory Access</h1>
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Staff Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Enter password..."
              required
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold p-3 rounded-lg transition">
            Enter Dashboard
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-2xl font-bold">Bar Inventory Control</h1>
            <p className="text-slate-400 text-sm">Live Stock & Activity Management</p>
          </div>
          <div>
            {!isAdmin ? (
              <form onSubmit={handleAdminLogin} className="flex gap-2">
                <input 
                  type="password" 
                  placeholder="Admin PIN" 
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 w-32"
                  required
                />
                <button type="submit" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition">
                  Unlock Admin
                </button>
              </form>
            ) : (
              <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg">
                Admin Unlocked
              </span>
            )}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-bold">Current Stock Levels</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Par Level</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400">Loading inventory...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400">No items found.</td></tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4 text-slate-400">{item.category}</td>
                      <td className={`p-4 font-bold ${item.current_stock <= item.par_level ? 'text-amber-400' : 'text-slate-100'}`}>
                        {item.current_stock}
                      </td>
                      <td className="p-4 text-slate-400">{item.par_level}</td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => { setSelectedItem(item); setModalType('delivery'); }}
                          className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 px-3 py-1 rounded text-xs font-medium transition"
                        >
                          + Delivery
                        </button>
                        <button 
                          onClick={() => { setSelectedItem(item); setModalType('adjust'); }}
                          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1 rounded text-xs font-medium transition"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADMIN ONLY SECTION: Add Item & Activity Log */}
        {isAdmin && (
          <div className="space-y-8">
            {/* Add Item Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-bold mb-4">Add New Inventory Item</h2>
              <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <input 
                  type="text" 
                  placeholder="Item Name" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                  required
                />
                <input 
                  type="text" 
                  placeholder="Category" 
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                />
                <input 
                  type="number" 
                  placeholder="Par Level" 
                  value={newPar} 
                  onChange={(e) => setNewPar(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg p-2.5 text-sm transition">
                  Add Item
                </button>
              </form>
            </div>

            {/* Transaction Activity Log Component */}
            <ActivityLogSection supabase={supabase} />
          </div>
        )}

        {/* Adjustment Modal */}
        {selectedItem && modalType && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form onSubmit={handleStockUpdate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold capitalize">
                {modalType === 'delivery' ? 'Log Delivery' : 'Adjust Stock'}: {selectedItem.name}
              </h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {modalType === 'delivery' ? 'Quantity Received (+)' : 'Quantity Change (e.g. -2 or 5)'}
                </label>
                <input 
                  type="number" 
                  value={qtyChange} 
                  onChange={(e) => setQtyChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes / Reason</label>
                <input 
                  type="text" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100"
                  placeholder="e.g. Broken bottle, weekly delivery..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setSelectedItem(null); setModalType(null); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold p-3 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold p-3 rounded-lg transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </main>
  )
}

// Built-in Activity Log Sub-Component with Date Filtering
function ActivityLogSection({ supabase }: { supabase: any }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          id,
          created_at,
          quantity_change,
          movement_type,
          notes,
          items (name)
        `)
        .order('created_at', { ascending: false })

      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`)
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`)

      const { data, error } = await query
      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [startDate, endDate])

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg text-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-lg font-bold">Transaction Activity Log</h2>
        <div className="flex items-center gap-2 text-sm">
          <div>
            <label className="block text-slate-400 text-xs mb-1">From</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">To</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Item</th>
              <th className="p-3">Type</th>
              <th className="p-3">Change</th>
              <th className="p-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center text-slate-400">Loading history...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-slate-400">No activity recorded for this date range.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50">
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span className="block text-xs text-slate-500">{new Date(log.created_at).toLocaleDateString()}</span>
                  </td>
                  <td className="p-3 font-medium">{log.items?.name || 'Unknown Item'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      log.movement_type === 'delivery' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}>
                      {log.movement_type}
                    </span>
                  </td>
                  <td className={`p-3 font-bold ${log.quantity_change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                  </td>
                  <td className="p-3 text-slate-300 italic">{log.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
