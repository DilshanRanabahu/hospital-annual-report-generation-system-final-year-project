import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useWebSocket from '../../../hooks/useWebSocket';

export default function useInventory(options = {}) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Extract options
  const { onToast } = options;

  // Fetch inventory from API
  const fetchInventoryFromAPI = async () => {
    try {
      const response = await axios.get('/api/pharmacy/medications/inventory');
      
      if (response.data.success) {
        return response.data.data || [];
      } else {
        console.error('API returned unsuccessful response:', response.data.message);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch inventory from API:', error);
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
      }
      return [];
    }
  };

  // Refresh inventory data
  const refreshInventory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchInventoryFromAPI();
      setInventory(data);
      setError(null);
    } catch (err) {
      setError('Failed to refresh inventory');
      console.error('Error refreshing inventory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle real-time inventory WebSocket updates
  const handleInventoryWebSocketUpdate = useCallback((data) => {
    console.log('Real-time inventory update received:', data);

    switch (data.type) {
      case 'STOCK_UPDATED': {
        // Handle stock updates (from add stock functionality)
        console.log('WebSocket stock update received:', data);
        
        setInventory(prev => {
          const updated = prev.map(item => {
            if (item.id === data.medicationId) {
              console.log('WebSocket updating item:', item.id, 'from', item.currentStock, 'to', data.currentStock);
              return {
                ...item,
                currentStock: data.currentStock,
                lastUpdated: data.lastUpdated || new Date().toISOString(),
                isLowStock: data.isLowStock
              };
            }
            return item;
          });
          return updated;
        });
        
        // No toast notifications for stock updates - silent real-time sync only
        console.log(`Silent update: ${data.drugName} stock changed (${data.previousStock} → ${data.currentStock})`);
        break;
      }

      case 'MEDICATION_ADDED': {
        // Handle new medication additions
        console.log('New medication added:', data.drugName);
        if (onToast) {
          onToast(`New medication added: ${data.drugName}`, 'success');
        }
        // Refresh inventory to include the new medication
        refreshInventory();
        break;
      }

      case 'LOW_STOCK_ALERT': {
        // Handle low stock alerts
        console.warn(`Low stock alert: ${data.drugName} (${data.currentStock}/${data.minimumStock})`);
        if (onToast) {
          onToast(`⚠️ Low stock: ${data.drugName} (${data.currentStock} units remaining)`, 'warning');
        }
        break;
      }

      case 'INVENTORY_UPDATED': {
        // Legacy handler for other inventory updates
        setInventory(prev => prev.map(item => {
          if (item.drugName === data.drugName) {
            return {
              ...item,
              currentStock: data.remainingStock,
              lastUpdated: new Date().toISOString()
            };
          }
          return item;
        }));
        break;
      }

      default:
        console.log('Unknown inventory notification type:', data.type);
    }
  }, [refreshInventory, onToast]);

  // WebSocket connection for real-time inventory updates
  const { isConnected: wsConnected } = useWebSocket(
    '/ws',
    { 
      '/topic/inventory': handleInventoryWebSocketUpdate,
      '/topic/inventory/alerts': handleInventoryWebSocketUpdate
    },
    { debug: true, reconnectDelay: 5000 }
  );

  // Initialize inventory
  useEffect(() => {
    const initializeInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchInventoryFromAPI();
        setInventory(data);
      } catch (err) {
        setError('Failed to load inventory');
        console.error('Error loading inventory:', err);
        setInventory([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    initializeInventory();
  }, []);

  // Update stock
  const updateStock = useCallback(async (medicationId, updateData) => {
    try {
      setError(null);
      
      const response = await axios.put(`/api/pharmacy/medications/${medicationId}/stock`, {
        newStock: updateData.newStock,
        batchNumber: updateData.batchNumber
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = response.data;
      console.log('Update stock API response:', result);

      if (result.success) {
        console.log('Stock update successful, updating local state...', result.data);
        
        // Update local state with the response data
        setInventory(prev => {
          const updated = prev.map(item => 
            item.id === medicationId 
              ? { 
                  ...item, 
                  currentStock: result.data.currentStock,
                  lastUpdated: result.data.lastUpdated,
                  isLowStock: result.data.isLowStock,
                  batchNumber: result.data.batchNumber
                }
              : item
          );
          console.log('Updated inventory state:', updated.find(item => item.id === medicationId));
          return updated;
        });
        
        return { 
          success: true, 
          message: result.message,
          data: result.data 
        };
      } else {
        throw new Error(result.message || 'Failed to update stock');
      }
    } catch (err) {
      let errorMessage = 'Failed to update stock';

      // Handle axios errors
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        switch (status) {
          case 400:
            errorMessage = data.message || 'Invalid stock update data';
            break;
          case 404:
            errorMessage = 'Medication not found';
            break;
          case 409:
            errorMessage = data.message || 'Batch number conflict';
            break;
          case 422:
            errorMessage = data.message || 'Validation failed';
            break;
          default:
            errorMessage = data.message || `Server error (${status})`;
        }
      } else if (err.request) {
        errorMessage = 'Network error - please check your connection';
      } else {
        errorMessage = err.message || 'An unexpected error occurred';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Add inventory item
  const addInventoryItem = useCallback(async (itemData) => {
    try {
      setError(null);
      
      const response = await axios.post('/api/pharmacy/medications/add', itemData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = response.data;

      if (result.success) {
        // Refresh the inventory data from the API to get the latest state
        await refreshInventory();
        
        return { 
          success: true, 
          message: result.message,
          data: result.data 
        };
      } else {
        throw new Error(result.message || 'Failed to add medication');
      }
    } catch (err) {
      let errorMessage = 'Failed to add inventory item';

      // Handle axios errors
      if (err.response) {
        // Server responded with error status code
        const status = err.response.status;
        const data = err.response.data;
        
        switch (status) {
          case 409:
            errorMessage = `Batch number already exists: ${itemData.batchNumber}`;
            break;
          case 422:
            errorMessage = data.data || 'Validation failed';
            break;
          case 400:
            errorMessage = 'Invalid data provided';
            break;
          case 500:
            errorMessage = 'Server error occurred';
            break;
          default:
            errorMessage = data.message || `Server error (${status})`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'Network error - Could not connect to server';
      } else {
        // Something else happened
        errorMessage = err.message || 'Failed to add medication';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshInventory]);

  // Get low stock items
  const getLowStockItems = useCallback(() => {
    return inventory.filter(item => 
      item.currentStock <= item.minimumStock && item.currentStock > 0
    );
  }, [inventory]);

  // Get out of stock items
  const getOutOfStockItems = useCallback(() => {
    return inventory.filter(item => item.currentStock === 0);
  }, [inventory]);

  // Get expiring items (within 60 days)
  const getExpiringItems = useCallback((days = 60) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    
    return inventory.filter(item => {
      const expiryDate = new Date(item.expiryDate);
      return expiryDate <= cutoffDate;
    });
  }, [inventory]);

  // Search inventory
  const searchInventory = useCallback((searchTerm, category = 'all') => {
    return inventory.filter(item => {
      const matchesSearch = !searchTerm || 
        item.drugName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = category === 'all' || item.category === category;
      
      return matchesSearch && matchesCategory;
    });
  }, [inventory]);

  // Get inventory statistics
  const getStats = useCallback(() => {
    const totalItems = inventory.length;
    const lowStockCount = getLowStockItems().length;
    const outOfStockCount = getOutOfStockItems().length;
    const expiringCount = getExpiringItems(30).length; // Items expiring in 30 days
    
    const totalValue = inventory.reduce((total, item) => {
      return total + (item.currentStock * item.unitCost);
    }, 0);

    const categories = [...new Set(inventory.map(item => item.category))];
    
    return {
      totalItems,
      lowStockAlerts: lowStockCount,
      outOfStockAlerts: outOfStockCount,
      expiryAlerts: expiringCount,
      totalValue: Math.round(totalValue),
      categories,
      averageStockLevel: totalItems > 0 ? Math.round(
        inventory.reduce((sum, item) => sum + (item.currentStock / item.maximumStock * 100), 0) / totalItems
      ) : 0
    };
  }, [inventory, getLowStockItems, getOutOfStockItems, getExpiringItems]);

  // Reorder suggestions
  const getReorderSuggestions = useCallback(() => {
    return inventory.filter(item => {
      const stockPercent = (item.currentStock / item.maximumStock) * 100;
      return stockPercent <= 30; // Items with less than 30% stock
    }).map(item => ({
      ...item,
      suggestedOrder: item.maximumStock - item.currentStock,
      urgency: item.currentStock <= item.minimumStock ? 'high' : 'medium'
    }));
  }, [inventory]);

  // Batch operations
  const updateMultipleStock = useCallback(async (updates) => {
    try {
      setInventory(prev => prev.map(item => {
        const update = updates.find(u => u.drugId === item.drugId);
        return update ? {
          ...item,
          currentStock: update.newStock,
          lastUpdated: new Date().toISOString()
        } : item;
      }));
      
      return { success: true };
    } catch (err) {
      setError('Failed to update multiple stock items');
      throw err;
    }
  }, []);

  return {
    inventory,
    loading,
    error,
    updateStock,
    addInventoryItem,
    refreshInventory,
    getLowStockItems,
    getOutOfStockItems,
    getExpiringItems,
    searchInventory,
    getStats,
    getReorderSuggestions,
    updateMultipleStock,
    wsConnected
  };
}