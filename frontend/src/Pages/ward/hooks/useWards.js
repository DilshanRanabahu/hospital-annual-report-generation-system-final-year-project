import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useWards = (showToast = null) => {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  const fetchWards = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        
        console.warn('No JWT token found');
        return;
      }

      const response = await axios.get('/api/wards/getAll', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      setWards(response.data);
    } catch (error) {
      console.error('Error fetching wards:', error);
      
      let errorMessage = 'Failed to load ward data. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view ward data.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      if (showToast) {
        if (error.response?.status === 401) {
          showToast('error', 'Session Expired', errorMessage);
        } else if (error.response?.status === 403) {
          showToast('error', 'Access Denied', errorMessage);
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Loading Failed', errorMessage);
        }
      } else {
        console.error(errorMessage);
      }
      
      setLastError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchWards();
  }, [fetchWards]);

  return {
    wards,
    loading,
    lastError,
    fetchWards
  };
};

export default useWards;