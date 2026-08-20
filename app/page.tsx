'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ljizxogaenpsvjwdfsht.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqaXp4b2dhZW5wc3Zqd2Rmc2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg0MjcsImV4cCI6MjA1NjgxNDQyN30.YOUR_ACTUAL_ANON_KEY_HERE'
);

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*');

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
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Bar & Restaurant Inventory</h1>
      
      {loading ? (
        <p className="text-gray-500">Loading inventory...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No inventory items found.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3">Category</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index} className="border-b hover:bg-gray-50">
                  <td className="p-3">{item.name || item.item_name || 'Unnamed'}</td>
                  <td className="p-3">{item.category || 'General'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
