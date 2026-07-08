import { useState, useCallback, useEffect, useMemo } from 'react';

const useLabEquipment = (showToast = null) => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Mock data for demonstration
  const mockEquipment = useMemo(() => [
    {
      equipmentId: 'EQ-001',
      name: 'Hematology Analyzer',
      type: 'Analyzer',
      status: 'operational',
      lastMaintenance: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      nextMaintenance: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Lab Room 1',
      utilization: 85
    },
    {
      equipmentId: 'EQ-002',
      name: 'Chemistry Analyzer',
      type: 'Analyzer',
      status: 'operational',
      lastMaintenance: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      nextMaintenance: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Lab Room 2',
      utilization: 92
    },
    {
      equipmentId: 'EQ-003',
      name: 'Microscope A',
      type: 'Microscope',
      status: 'maintenance',
      lastMaintenance: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      nextMaintenance: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Lab Room 3',
      utilization: 0
    },
    {
      equipmentId: 'EQ-004',
      name: 'Centrifuge',
      type: 'Centrifuge',
      status: 'offline',
      lastMaintenance: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      nextMaintenance: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Lab Room 1',
      utilization: 0
    }
  ], []);

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        console.warn('No JWT token found');
        setEquipment(mockEquipment);
        return;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.get('/api/lab/equipment', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      setEquipment(response.data);
      */

      // Using mock data for now
      setEquipment(mockEquipment);

    } catch (error) {
      console.error('Error fetching equipment:', error);

      let errorMessage = 'Failed to load equipment data. ';

      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view equipment data.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }

      if (showToast) {
        showToast('error', 'Loading Failed', errorMessage);
      }

      setLastError(errorMessage);
      setEquipment(mockEquipment);
    } finally {
      setLoading(false);
    }
  }, [showToast, mockEquipment]);

  const updateEquipment = useCallback(async (equipmentId, updateData) => {
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
      const response = await axios.put(`/api/lab/equipment/${equipmentId}`, updateData, {
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
      setEquipment(prev =>
        prev.map(eq =>
          eq.equipmentId === equipmentId
            ? { ...eq, ...updateData }
            : eq
        )
      );

      if (showToast) {
        showToast('success', 'Equipment Updated', 'Equipment status updated successfully.');
      }

      return true;

    } catch (error) {
      console.error('Error updating equipment:', error);

      if (showToast) {
        showToast('error', 'Update Failed', 'Failed to update equipment.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const scheduleMaintenanceEquipment = useCallback(async (equipmentId, maintenanceData) => {
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
      const response = await axios.post(`/api/lab/equipment/${equipmentId}/maintenance`, maintenanceData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.data && response.data.isSuccess === false) {
        return false;
      }
      */

      // Mock maintenance scheduling for now
      setEquipment(prev =>
        prev.map(eq =>
          eq.equipmentId === equipmentId
            ? {
                ...eq,
                status: 'maintenance',
                nextMaintenance: maintenanceData.scheduledDate,
                ...maintenanceData
              }
            : eq
        )
      );

      if (showToast) {
        showToast('success', 'Maintenance Scheduled', 'Equipment maintenance scheduled successfully.');
      }

      return true;

    } catch (error) {
      console.error('Error scheduling maintenance:', error);

      if (showToast) {
        showToast('error', 'Schedule Failed', 'Failed to schedule maintenance.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const getEquipmentByStatus = useCallback((status) => {
    return equipment.filter(eq => eq.status === status);
  }, [equipment]);

  const getStats = useCallback(() => {
    const totalEquipment = equipment.length;
    const operationalEquipment = equipment.filter(eq => eq.status === 'operational').length;
    const maintenanceEquipment = equipment.filter(eq => eq.status === 'maintenance').length;
    const offlineEquipment = equipment.filter(eq => eq.status === 'offline').length;

    const totalUtilization = equipment.reduce((sum, eq) => sum + (eq.utilization || 0), 0);
    const averageUtilization = totalEquipment > 0 ? Math.round(totalUtilization / totalEquipment) : 0;

    return {
      totalEquipment,
      operationalEquipment,
      maintenanceEquipment,
      offlineEquipment,
      averageUtilization
    };
  }, [equipment]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  return {
    equipment,
    loading,
    lastError,
    fetchEquipment,
    updateEquipment,
    scheduleMaintenanceEquipment,
    getEquipmentByStatus,
    getStats
  };
};

export default useLabEquipment;