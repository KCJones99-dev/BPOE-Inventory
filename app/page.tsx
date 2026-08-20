'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'httpsljizxogaenpsvjwdfsht.supabase.co', // Keep your clean URL
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqaXp4b2dhZW5wc3Zqd2Rmc2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg0MjcsImV4cCI6MjA1NjgxNDQyN30.YOUR_ACTUAL_ANON_KEY_HERE'
);

export default function InventoryManagementPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state for adding a new item
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Spirit');
  const [newSize, setNewSize] = useState(750);
  const [newCost, setNewCost] = useState('');
  const [newPar, setNewPar] = useState(5);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('items').select('*').order('name', { ascending: true });
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
        console.error('Error adding item:', error);
        alert('Failed to add item.');
      } else {
        // Reset form and refresh list
        setNewName('');
        setNewCost('');
        setShowAddForm(false);
        fetchInventory();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) {
        console.error('Error deleting item:', error);
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
        <h1 className="text-3xl font-bold">Bar & Restaurant Inventory</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          {showAddForm ? 'Cancel' : '+ Add New Item'}
        </button>
      </div>

      {/* Add Item Modal / Collapsible Form */}
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
              Save Item to Database
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading inventory dashboard...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No inventory items found.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Bottle Size</th>
                <th className="p-3">Unit Cost</th>
                <th className="p-3">Par Level</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{item.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{item.bottle_size_ml} ml</td>
                  <td className="p-3 text-gray-600">${item.unit_cost?.toFixed(2)}</td>
                  <td className="p-3 text-gray-600">{item.par_level}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
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
