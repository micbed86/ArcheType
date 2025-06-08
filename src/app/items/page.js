'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { AddProjectIcon } from '@/lib/icons'; // Keep AddProjectIcon, it's generic enough
import './items.css';
import Image from 'next/image';

// Helper function to format date and time as DD/MM/YYYY - HH:mm
const formatDateTime = (dateString) => {
  const date = new Date(dateString);

  // Format date as DD/MM/YYYY
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  // Format time as HH:mm
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year} - ${hours}:${minutes}`;
};

export default function ItemsPage() {
  // Renamed function
  const router = useRouter();
  const [items, setItems] = useState([]); // Renamed state
  const [filteredItems, setFilteredItems] = useState([]); // Renamed state
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      // Fetch items for the current user
      try {
        const { data, error } = await supabase
          .from('items') // Changed table name
          .select('*')
          .eq('userId', user.id)
          .order('createdAt', { ascending: false }); // Sort by creation date, newest first

        if (error) throw error;
        setItems(data || []); // Updated state setter
        setFilteredItems(data || []); // Updated state setter
      } catch (error) {
        console.error('Error loading items:', error); // Updated error message
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  // Listen for search events from the DashboardLayout
  useEffect(() => {
    const handleSearch = (event) => {
      setSearchTerm(event.detail);
    };

    window.addEventListener('itemSearch', handleSearch); // Changed event name

    return () => {
      window.removeEventListener('itemSearch', handleSearch); // Changed event name
    };
  }, []);

  // Filter items based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items); // Updated state setter and variable
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = items.filter((item) => {
      // Updated variable
      const title = (item.title || 'Untitled Item').toLowerCase(); // Updated variable and default text
      const date = formatDateTime(item.created_at).toLowerCase(); // Updated variable

      return title.includes(term) || date.includes(term);
    });

    setFilteredItems(filtered); // Updated state setter
  }, [searchTerm, items]); // Updated dependency

  const handleAddItem = async () => {
    // Renamed function
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // --- Check Credits ---
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (!profile || profile.credits <= 0) {
        alert(
          'You have no item credits remaining. Please claim a voucher code on the Account page to add more items.'
        ); // Updated alert text
        return; // Stop item creation
      }
      // --- End Credit Check ---

      // Removed table existence check - README will ensure table exists.

      // Define minimal data for the new item
      const itemData = {
        title: 'Untitled Item', // Default title
        user_id: user.id,
        created_at: new Date().toISOString(),
        // No other fields needed for the basic item
      };

      const { data, error } = await supabase
        .from('items')
        .insert([
          {
            title: newItemTitle,
            userId: user.id,
            createdAt: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        router.push(`/items/${data[0].id}`); // Updated route
      }
    } catch (error) {
      console.error('Error creating item:', error); // Updated error message
      alert('Failed to create item. Please try again later.'); // Updated alert text
    }
  };

  return (
    <DashboardLayout pageTitle="Items">
      <div className="dashboard-content">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2>Your Items</h2>
          <button
            onClick={handleAddItem} // Updated handler
            className="standard-button button-secondary"
          >
            <AddProjectIcon /> Add Item
          </button>
        </div>
        {loading ? (
          <div>Loading items...</div> // Updated loading text
        ) : items.length === 0 ? ( // Updated variable
          <div className="empty-board">
            <h1>no items yet</h1>
          </div>
        ) : filteredItems.length === 0 ? ( // Updated variable
          <div className="empty-board">
            <h1>no matching items</h1>
          </div>
        ) : (
          <div className="items-list">
            {/* Item list */}
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="package"
                onClick={() => router.push(`/items/${item.id}`)}
              >
                <div className="package2">
                  <div className="tile-icon">
                    <Image
                      src="/logo_white.svg"
                      alt="Item Icon"
                      className="item-icon"
                      width={100}
                      height={100}
                    />
                  </div>
                  <div className="lower-third">
                    <p className="text">{item.title || 'Untitled Item'}</p>
                    <p className="item-date">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
