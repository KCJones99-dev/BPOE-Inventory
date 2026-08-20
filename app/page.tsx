'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ljizxogaenpsvjwdfsht.supabase.co',
  'sb_publishable_ogNC4cEyQigxxuSZqs7hNg__8nm8_32'
);

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const { data, error } = await supabase.from('items').select('*');
        if (error) {
          console.error('Error fetching inventory:', error);
        } else if (data) {
          setItems(data);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInventory();
  }, []);

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Bar & Restaurant Inventory</h1>
      
      {loading ? (
        <p className="text-gray-500">Loading inventory...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No inventory items found.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Bottle Size (mL)</th>
                <th className="p-3">Unit Cost</th>
                <th className="p-3">Par Level</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3">{item.bottle_size_ml} ml</td>
                  <td className="p-3">${item.unit_cost?.toFixed(2)}</td>
                  <td className="p-3">{item.par_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
