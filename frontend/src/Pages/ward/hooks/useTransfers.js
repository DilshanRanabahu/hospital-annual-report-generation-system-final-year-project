import { useState, useCallback } from 'react';
import axios from 'axios';

const useTransfers = (showToast = null) => {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [transferHistory, setTransferHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [allTransfers, setAllTransfers] = useState([]);
  const [allTransfersLoading, setAllTransfersLoading] = useState(false);

  const instantTransfer = useCallback(async (transferData) => {
    try {
      setLoading(true);
      setLastError(null);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.post('/api/transfers/instant', transferData, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (showToast) {
        showToast('success', 'Transfer Successful', 
          `Patient ${response.data.patientName} transferred from ${response.data.fromWardName} to ${response.data.toWardName}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error processing transfer:', error);
      
      let errorMessage = 'Failed to process transfer. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to transfer patients.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid transfer request. Please check the details.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Patient admission or ward not found.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Transfer conflict - bed may be occupied or patient already transferred.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (showToast) {
        if (error.response?.status === 401) {
          showToast('error', 'Session Expired', errorMessage);
        } else if (error.response?.status === 403) {
          showToast('error', 'Access Denied', errorMessage);
        } else if (error.response?.status === 400) {
          showToast('error', 'Invalid Request', errorMessage);
        } else if (error.response?.status === 404) {
          showToast('error', 'Not Found', errorMessage);
        } else if (error.response?.status === 409) {
          showToast('error', 'Transfer Conflict', errorMessage);
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Transfer Failed', errorMessage);
        }
      }
      
      setLastError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchTransferHistory = useCallback(async (patientNationalId) => {
    try {
      setHistoryLoading(true);
      setLastError(null);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.get(`/api/transfers/patient/${patientNationalId}/history`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      setTransferHistory(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      
      let errorMessage = 'Failed to fetch transfer history. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view transfer history.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Patient not found or no transfer history available.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (showToast) {
        if (error.response?.status === 401) {
          showToast('error', 'Session Expired', errorMessage);
        } else if (error.response?.status === 403) {
          showToast('error', 'Access Denied', errorMessage);
        } else if (error.response?.status === 404) {
          showToast('error', 'Not Found', errorMessage);
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Fetch Failed', errorMessage);
        }
      }
      
      setLastError(errorMessage);
      setTransferHistory([]);
      throw error;
    } finally {
      setHistoryLoading(false);
    }
  }, [showToast]);

  const fetchAllTransfers = useCallback(async () => {
    try {
      setAllTransfersLoading(true);
      setLastError(null);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.get('/api/transfers/all', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      setAllTransfers(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching all transfers:', error);
      
      let errorMessage = 'Failed to fetch all transfers. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view all transfers.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (showToast) {
        if (error.response?.status === 401) {
          showToast('error', 'Session Expired', errorMessage);
        } else if (error.response?.status === 403) {
          showToast('error', 'Access Denied', errorMessage);
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Fetch Failed', errorMessage);
        }
      }
      
      setLastError(errorMessage);
      setAllTransfers([]);
      throw error;
    } finally {
      setAllTransfersLoading(false);
    }
  }, [showToast]);

  return {
    loading,
    lastError,
    instantTransfer,
    setLastError,
    transferHistory,
    historyLoading,
    fetchTransferHistory,
    setTransferHistory,
    allTransfers,
    allTransfersLoading,
    fetchAllTransfers,
    setAllTransfers
  };
};

export default useTransfers;