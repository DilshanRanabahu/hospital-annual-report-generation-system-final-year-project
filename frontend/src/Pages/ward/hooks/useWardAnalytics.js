import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useWardAnalytics = (showToast = null) => {
  const [activeAdmissions, setActiveAdmissions] = useState([]);
  const [allAdmissions, setAllAdmissions] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Get JWT token
  const getAuthHeaders = () => {
    const jwtToken = localStorage.getItem('jwtToken');
    if (!jwtToken) {
      throw new Error('Authentication required. Please log in again.');
    }
    return {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch active admissions
  const fetchActiveAdmissions = useCallback(async () => {
    try {
      const response = await axios.get('/api/admissions/active', {
        headers: getAuthHeaders()
      });
      setActiveAdmissions(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching active admissions:', error);
      
      let errorMessage = 'Failed to fetch active admissions.';
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view admission data.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      if (showToast) {
        showToast('error', 'Loading Failed', errorMessage);
      }
      
      setLastError({ message: errorMessage, type: 'activeAdmissions' });
      throw error;
    }
  }, [showToast]);

  // Fetch all admissions
  const fetchAllAdmissions = useCallback(async () => {
    try {
      const response = await axios.get('/api/admissions/getAll', {
        headers: getAuthHeaders()
      });
      setAllAdmissions(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching all admissions:', error);
      
      let errorMessage = 'Failed to fetch admission history.';
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view admission data.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      if (showToast) {
        showToast('error', 'Loading Failed', errorMessage);
      }
      
      setLastError({ message: errorMessage, type: 'allAdmissions' });
      throw error;
    }
  }, [showToast]);

  // Fetch wards
  const fetchWards = useCallback(async () => {
    try {
      const response = await axios.get('/api/wards/getAll', {
        headers: getAuthHeaders()
      });
      setWards(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching wards:', error);
      
      let errorMessage = 'Failed to fetch ward data.';
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
        showToast('error', 'Loading Failed', errorMessage);
      }
      
      setLastError({ message: errorMessage, type: 'wards' });
      throw error;
    }
  }, [showToast]);

  // Fetch patient details for age calculation
  const fetchPatientDetails = useCallback(async (nationalIds) => {
    try {
      const patientPromises = nationalIds.map(async (nationalId) => {
        try {
          const response = await axios.get(`/api/patients/${nationalId}`, {
            headers: getAuthHeaders()
          });
          return response.data;
        } catch (error) {
          console.warn(`Failed to fetch patient ${nationalId}:`, error);
          return null;
        }
      });
      
      const patients = await Promise.all(patientPromises);
      return patients.filter(patient => patient !== null);
    } catch (error) {
      console.error('Error fetching patient details:', error);
      return [];
    }
  }, []);

  // Fetch all analytics data
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setLastError(null);
    
    try {
      // Fetch all data in parallel
      const [activeAdmissionsData, allAdmissionsData, wardsData] = await Promise.all([
        fetchActiveAdmissions(),
        fetchAllAdmissions(),
        fetchWards()
      ]);

      console.log('Analytics data fetched successfully:', {
        activeAdmissions: activeAdmissionsData.length,
        allAdmissions: allAdmissionsData.length,
        wards: wardsData.length
      });

      return {
        activeAdmissions: activeAdmissionsData,
        allAdmissions: allAdmissionsData,
        wards: wardsData
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      
      if (showToast) {
        showToast('error', 'Analytics Loading Failed', 'Failed to load ward analytics data. Please try refreshing the page.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchActiveAdmissions, fetchAllAdmissions, fetchWards, showToast]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      await fetchAnalyticsData();
      
      if (showToast) {
        showToast('success', 'Data Refreshed', 'Ward analytics data has been updated successfully.');
      }
    } catch {
      // Error already handled in fetchAnalyticsData
    }
  }, [fetchAnalyticsData, showToast]);

  // Auto-fetch data when component mounts
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  return {
    // Data
    activeAdmissions,
    allAdmissions,
    wards,
    
    // Loading states
    loading,
    lastError,
    
    // Actions
    fetchAnalyticsData,
    fetchActiveAdmissions,
    fetchAllAdmissions,
    fetchWards,
    fetchPatientDetails, // Export the patient details function
    refreshData
  };
};

export default useWardAnalytics;