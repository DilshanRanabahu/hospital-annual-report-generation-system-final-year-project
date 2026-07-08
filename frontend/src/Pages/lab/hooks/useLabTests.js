import { useState, useCallback, useEffect, useMemo } from 'react';

const useLabTests = (showToast = null) => {
  const [testOrders, setTestOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Mock data for demonstration
  const mockTestOrders = useMemo(() => [
    {
      orderId: 'LAB-001',
      patientId: 'PAT-12345',
      patientName: 'John Doe',
      tests: ['Complete Blood Count', 'Blood Chemistry'],
      priority: 'normal',
      status: 'pending',
      orderDate: new Date().toISOString(),
      requestingPhysician: 'Dr. Smith'
    },
    {
      orderId: 'LAB-002',
      patientId: 'PAT-67890',
      patientName: 'Jane Smith',
      tests: ['Urine Analysis'],
      priority: 'urgent',
      status: 'in_progress',
      orderDate: new Date(Date.now() - 3600000).toISOString(),
      requestingPhysician: 'Dr. Johnson'
    },
    {
      orderId: 'LAB-003',
      patientId: 'PAT-11111',
      patientName: 'Bob Wilson',
      tests: ['Lipid Profile'],
      priority: 'high',
      status: 'completed',
      orderDate: new Date(Date.now() - 7200000).toISOString(),
      requestingPhysician: 'Dr. Brown'
    }
  ], []);

  const fetchTestOrders = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        console.warn('No JWT token found');
        // Use mock data for now
        setTestOrders(mockTestOrders);
        return;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.get('/api/lab/test-orders', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      setTestOrders(response.data);
      */

      // Using mock data for now
      setTestOrders(mockTestOrders);

    } catch (error) {
      console.error('Error fetching test orders:', error);

      let errorMessage = 'Failed to load test orders. ';

      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view test orders.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }

      if (showToast) {
        showToast('error', 'Loading Failed', errorMessage);
      }

      setLastError(errorMessage);
      // Use mock data as fallback
      setTestOrders(mockTestOrders);
    } finally {
      setLoading(false);
    }
  }, [showToast, mockTestOrders]);

  const createTestOrder = useCallback(async (orderData) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.post('/api/lab/test-orders', orderData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.data && response.data.isSuccess === false) {
        setLastError(response.data.message || 'Failed to create test order.');
        return false;
      }
      */

      // Mock creation for now
      const newOrder = {
        ...orderData,
        orderId: `LAB-${Date.now()}`,
        orderDate: new Date().toISOString(),
        status: 'pending'
      };

      setTestOrders(prev => [newOrder, ...prev]);

      if (showToast) {
        showToast('success', 'Order Created', 'Test order created successfully.');
      }

      setLastError(null);
      return true;

    } catch (error) {
      console.error('Error creating test order:', error);

      if (error.response && error.response.data && error.response.data.message) {
        setLastError(error.response.data.message);
      } else {
        setLastError('An error occurred while creating the test order.');
      }

      if (showToast) {
        showToast('error', 'Creation Failed', 'Failed to create test order.');
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const updateTestOrder = useCallback(async (orderId, updateData) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.put(`/api/lab/test-orders/${orderId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.data && response.data.isSuccess === false) {
        return false;
      }
      */

      // Mock update for now
      setTestOrders(prev =>
        prev.map(order =>
          order.orderId === orderId
            ? { ...order, ...updateData }
            : order
        )
      );

      if (showToast) {
        showToast('success', 'Order Updated', 'Test order updated successfully.');
      }

      return true;

    } catch (error) {
      console.error('Error updating test order:', error);

      if (showToast) {
        showToast('error', 'Update Failed', 'Failed to update test order.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const processTest = useCallback(async (orderId, processData = {}) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.patch(`/api/lab/test-orders/${orderId}/process`, processData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.data && response.data.isSuccess === false) {
        return false;
      }
      */

      // Mock process for now
      setTestOrders(prev =>
        prev.map(order =>
          order.orderId === orderId
            ? { ...order, status: 'in_progress', ...processData }
            : order
        )
      );

      if (showToast) {
        showToast('success', 'Test Processing', 'Test processing started successfully.');
      }

      return true;

    } catch (error) {
      console.error('Error processing test:', error);

      if (showToast) {
        showToast('error', 'Process Failed', 'Failed to start test processing.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const getTestOrdersByStatus = useCallback((status) => {
    return testOrders.filter(order => order.status === status);
  }, [testOrders]);

  const getStats = useCallback(() => {
    const totalTests = testOrders.length;
    const pendingTests = testOrders.filter(t => t.status === 'pending').length;
    const inProgressTests = testOrders.filter(t => t.status === 'in_progress').length;
    const completedTests = testOrders.filter(t => t.status === 'completed').length;
    const urgentTests = testOrders.filter(t => t.priority === 'urgent').length;

    const today = new Date().toDateString();
    const todayTests = testOrders.filter(t =>
      new Date(t.orderDate).toDateString() === today
    ).length;

    return {
      totalTests,
      pendingTests,
      inProgressTests,
      completedTests,
      urgentTests,
      todayTests
    };
  }, [testOrders]);

  useEffect(() => {
    fetchTestOrders();
  }, [fetchTestOrders]);

  return {
    testOrders,
    loading,
    lastError,
    fetchTestOrders,
    createTestOrder,
    updateTestOrder,
    processTest,
    getTestOrdersByStatus,
    getStats
  };
};

export default useLabTests;