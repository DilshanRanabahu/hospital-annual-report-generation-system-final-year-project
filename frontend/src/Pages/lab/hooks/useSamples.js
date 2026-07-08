import { useState, useCallback, useEffect, useMemo } from 'react';

const useSamples = (showToast = null) => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Mock data for demonstration
  const mockSamples = useMemo(() => [
    {
      sampleId: 'SAMP-001',
      patientId: 'PAT-12345',
      patientName: 'John Doe',
      type: 'blood',
      status: 'collected',
      collectionDate: new Date().toISOString(),
      collectedBy: 'Tech A',
      tests: ['Complete Blood Count']
    },
    {
      sampleId: 'SAMP-002',
      patientId: 'PAT-67890',
      patientName: 'Jane Smith',
      type: 'urine',
      status: 'processing',
      collectionDate: new Date(Date.now() - 1800000).toISOString(),
      collectedBy: 'Tech B',
      tests: ['Urine Analysis']
    },
    {
      sampleId: 'SAMP-003',
      patientId: 'PAT-11111',
      patientName: 'Bob Wilson',
      type: 'serum',
      status: 'rejected',
      collectionDate: new Date(Date.now() - 3600000).toISOString(),
      collectedBy: 'Tech C',
      tests: ['Lipid Profile'],
      rejectionReason: 'Hemolyzed sample'
    }
  ], []);

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        console.warn('No JWT token found');
        setSamples(mockSamples);
        return;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.get('/api/lab/samples', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      setSamples(response.data);
      */

      // Using mock data for now
      setSamples(mockSamples);

    } catch (error) {
      console.error('Error fetching samples:', error);

      let errorMessage = 'Failed to load samples. ';

      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view samples.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }

      if (showToast) {
        showToast('error', 'Loading Failed', errorMessage);
      }

      setLastError(errorMessage);
      setSamples(mockSamples);
    } finally {
      setLoading(false);
    }
  }, [showToast, mockSamples]);

  const collectSample = useCallback(async (sampleData) => {
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
      const response = await axios.post('/api/lab/samples', sampleData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.data && response.data.isSuccess === false) {
        setLastError(response.data.message || 'Failed to collect sample.');
        return false;
      }
      */

      // Mock collection for now
      const newSample = {
        ...sampleData,
        sampleId: `SAMP-${Date.now()}`,
        collectionDate: new Date().toISOString(),
        status: 'collected'
      };

      setSamples(prev => [newSample, ...prev]);

      if (showToast) {
        showToast('success', 'Sample Collected', 'Sample collected successfully.');
      }

      setLastError(null);
      return true;

    } catch (error) {
      console.error('Error collecting sample:', error);

      if (error.response && error.response.data && error.response.data.message) {
        setLastError(error.response.data.message);
      } else {
        setLastError('An error occurred while collecting the sample.');
      }

      if (showToast) {
        showToast('error', 'Collection Failed', 'Failed to collect sample.');
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const updateSampleStatus = useCallback(async (sampleId, newStatus, additionalData = {}) => {
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
      const response = await axios.patch(`/api/lab/samples/${sampleId}/status`,
        { status: newStatus, ...additionalData }, {
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
      setSamples(prev =>
        prev.map(sample =>
          sample.sampleId === sampleId
            ? { ...sample, status: newStatus, ...additionalData }
            : sample
        )
      );

      if (showToast) {
        showToast('success', 'Status Updated', `Sample status updated to ${newStatus}.`);
      }

      return true;

    } catch (error) {
      console.error('Error updating sample status:', error);

      if (showToast) {
        showToast('error', 'Update Failed', 'Failed to update sample status.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const searchSamples = useCallback(async (searchCriteria) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return [];
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.post('/api/lab/samples/search', searchCriteria, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      return response.data;
      */

      // Mock search for now
      const filtered = samples.filter(sample => {
        if (searchCriteria.patientId && !sample.patientId.includes(searchCriteria.patientId)) {
          return false;
        }
        if (searchCriteria.sampleType && sample.type !== searchCriteria.sampleType) {
          return false;
        }
        if (searchCriteria.status && sample.status !== searchCriteria.status) {
          return false;
        }
        return true;
      });

      return filtered;

    } catch (error) {
      console.error('Error searching samples:', error);

      if (showToast) {
        showToast('error', 'Search Failed', 'Failed to search samples.');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [samples, showToast]);

  const getStats = useCallback(() => {
    const totalSamples = samples.length;
    const collectedSamples = samples.filter(s => s.status === 'collected').length;
    const processingSamples = samples.filter(s => s.status === 'processing').length;
    const rejectedSamples = samples.filter(s => s.status === 'rejected').length;

    const today = new Date().toDateString();
    const todayCollections = samples.filter(s =>
      s.collectionDate && new Date(s.collectionDate).toDateString() === today
    ).length;

    return {
      totalSamples,
      collectedSamples,
      processingSamples,
      rejectedSamples,
      todayCollections
    };
  }, [samples]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  return {
    samples,
    loading,
    lastError,
    fetchSamples,
    collectSample,
    updateSampleStatus,
    searchSamples,
    getStats
  };
};

export default useSamples;