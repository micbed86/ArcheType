'use client';

import { useState, useEffect, use } from 'react'; // Import use
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '../../components/DashboardLayout';
import { TrashIcon, EditIcon, MoreIcon } from '@/lib/icons'; // Added EditIcon, MoreIcon
import './item.css'; // Ensure this CSS file contains necessary styles

export default function ItemPage({ params }) {
  const router = useRouter();
  // Correctly unwrap params using React.use()
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const [loading, setLoading] = useState(true);
  const [itemTitle, setItemTitle] = useState('Loading...');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // State for delete menu
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkUserAndFetchItem = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error or no user:', authError);
        router.push('/auth');
        return;
      }

      if (!id) {
        console.error('Item ID is missing');
        setError('Item ID is missing.');
        setLoading(false);
        return;
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        console.error('Invalid Item ID format');
        setError('Invalid Item ID format.');
        setLoading(false);
        return;
      }

      try {
        const { data: itemData, error: fetchError } = await supabase
          .from('items')
          .select('title')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            console.error('Item not found or access denied:', fetchError);
            setError(
              'Item not found or you do not have permission to view it.'
            );
          } else {
            throw fetchError;
          }
        }

        if (itemData) {
          setItemTitle(itemData.title || 'Untitled Item');
        } else if (!fetchError) {
          setError('Item not found.');
        }
      } catch (err) {
        console.error('Error loading item:', err);
        setError(`Failed to load item: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchItem();
  }, [id, router]);

  // --- Title Editing Handlers ---
  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    setIsEditingTitle(false);
    const trimmedTitle = itemTitle.trim();
    if (!trimmedTitle) {
      setItemTitle('Untitled Item'); // Reset if empty
      return; // Or save 'Untitled Item' if preferred
    }

    try {
      const { error } = await supabase
        .from('items')
        .update({ title: trimmedTitle })
        .eq('id', id);

      if (error) throw error;
      // Optionally show success message
    } catch (error) {
      console.error('Error updating item title:', error);
      alert(`Failed to update title: ${error.message}`);
      // Optionally revert title state
    }
  };

  const handleTitleChange = (e) => {
    setItemTitle(e.target.value);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      // Optionally refetch title to revert changes if needed
    }
  };
  // --- End Title Editing Handlers ---

  // --- Delete Menu Handlers ---
  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const handleDeleteItem = async () => {
    setShowMenu(false); // Close menu
    if (
      confirm(
        'Are you sure you want to delete this item? This action cannot be undone.'
      )
    ) {
      try {
        const { error: deleteError } = await supabase
          .from('items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        router.push('/items');
      } catch (error) {
        console.error('Error deleting item:', error);
        alert(`Failed to delete item: ${error.message}`);
      }
    }
  };
  // --- End Delete Menu Handlers ---

  if (loading) {
    return (
      <DashboardLayout pageTitle="Loading Item...">
        <div className="dashboard-content item-detail-content">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="Error">
        <div className="dashboard-content item-detail-content error-message">
          <p>Error: {error}</p>
          <button
            onClick={() => router.push('/items')}
            className="standard-button"
          >
            Back to Items
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    // Pass the potentially edited title to the layout
    <DashboardLayout pageTitle={isEditingTitle ? 'Editing Item...' : itemTitle}>
      <div className="dashboard-content item-detail-content">
        {/* Apply structure from titleUI.md */}
        {/* Structure based on titleUI.md and previous implementation */}
        <div className="item-header">
          {/* Title Section */}
          <div className="project-title">
            {' '}
            {/* Apply class from snippet */}
            {isEditingTitle ? (
              <input
                type="text"
                value={itemTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="project-title-input" /* Use class from snippet */
                autoFocus
              />
            ) : (
              <h1>
                {' '}
                {/* Keep h1 for semantics */}
                {itemTitle}
                <button
                  onClick={handleTitleEdit}
                  className="edit-title-button"
                  title="Edit Title"
                  style={{
                    marginLeft: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <EditIcon />
                </button>
              </h1>
            )}
          </div>

          {/* Actions Menu (Dropdown) */}
          <div className="item-actions-menu" style={{ position: 'relative' }}>
            {' '}
            {/* Added relative positioning */}
            <button
              onClick={toggleMenu}
              className="menu-toggle-button"
              title="More actions"
            >
              <MoreIcon /> {/* Use MoreIcon as trigger */}
            </button>
            {showMenu && (
              // Apply dropdown styles from snippet
              <div
                className="dropdown-menu"
                style={{ display: 'block', right: 0, top: '100%' }}
              >
                {' '}
                {/* Added inline styles for position/display */}
                <button
                  onClick={handleDeleteItem}
                  // Combine dropdown item class with danger styling
                  className="dropdown-item button-danger"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }} // Basic button reset and flex
                >
                  <TrashIcon /> Delete Item
                </button>
                {/* Add other menu items here if needed */}
              </div>
            )}
          </div>
        </div>
        {/* <hr /> Removed horizontal rule */}
        <div className="item-content-area empty-board">
          <p>This item is currently empty.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
