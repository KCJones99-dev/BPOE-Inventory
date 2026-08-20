export const dynamic = 'force-dynamic';

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (You'll plug in your project keys shortly)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Item {
  id: string;
  name: string;
  category: string;
  bottle_size_ml: number;
  unit_cost: number;
  par_level: number;
}

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'count' | 'receiving'>('dashboard');
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  // Fetch items from Supabase on load
  useEffect(() => {
    async function fetchItems() {
      const { data, error } = await supabase.from('items').select('*');
      if (error) {
        console.error('Error fetching items:', error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    }
    fetchItems();
  }, []);

  const handleCountChange = (itemId: string, val: number) => {
    setCounts({ ...counts, [itemId]: Math.max(0, val) });
  };

  const saveAudit = async () => {
    alert('Audit saved successfully! (Mock submission)');
    // In the next iteration, this loops through 'counts' and inserts into 'inventory_counts'
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading inventory system...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-gray-800">🍷 Bar Inventory Control</h1>
        <div className="text-sm font-medium text-gray-500">Restaurant Operations</div>
      </header>

      {/* Navigation Tabs */}
      <nav className="max-w-4xl mx-auto mt-6 px-4 flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setActiveTab('count')}
          className={`px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'count' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          📝 Quick Count
        </button>
        <button
          onClick={() => setActiveTab('receiving')}
          className={`px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'receiving' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          📦 Receiving Log
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto mt-6 px-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-sm font-medium text-gray-500">Total Catalog Items</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{items.length}</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-sm font-medium text-gray-500">Items Below Par</div>
                <div className="text-2xl font-bold text-amber-600 mt-1">0</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-sm font-medium text-gray-500">Active Location</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">Main Bar</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-800">Current Stock Reference</div>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.category} • {item.bottle_size_ml}ml</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-700">${item.unit_cost.toFixed(2)} / btl</div>
                      <div className="text-xs text-gray-400">Par: {item.par_level}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'count' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <span className="font-semibold text-gray-800">Shift Audit - Bottle Counts</span>
              <button 
                onClick={saveAudit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Save Audit
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.bottle_size_ml}ml</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleCountChange(item.id, (counts[item.id] || 0) - 1)}
                      className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-600 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-semibold text-gray-800">
                      {counts[item.id] || 0}
                    </span>
                    <button 
                      onClick={() => handleCountChange(item.id, (counts[item.id] || 0) + 1)}
                      className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-600 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'receiving' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Log Distributor Delivery</h2>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
                <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white">
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bottles Received</label>
                <input type="number" defaultValue="1" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Commit Delivery
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
