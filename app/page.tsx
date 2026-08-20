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
  const [debugLog, setDebugLog] = useState('Fetching...');

  useEffect(() => {
    async function fetchInventory() {
      try {
        console.log("Attempting to fetch from 'items'...");
        const response = await supabase.from('items').select('*');
        console.log("Full Supabase Response:", response);

        if (response.error) {
          setDebugLog(`Error: ${response.error.message}`);
          console.error('Supabase Error:', response.error);
        } else if (response.data) {
          setDebugLog(`Success! Found ${response.data.length} rows.`);
          setItems(response.data);
        }
      } catch (err: any) {
        setDebugLog(`Exception: ${err.message}`);
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
      
      {/* Debug status box */}
      <div className="mb-4 p-3 bg-gray-100 rounded text-sm font-mono">
        Status: {debugLog}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading inventory...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No inventory items found.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3">Item Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">
                    {JSON.stringify(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
