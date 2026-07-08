import { useState, useCallback } from 'react';
import axios from 'axios';
import useWebSocket from '../../../hooks/useWebSocket';

export default function useDrugDatabase() {
  const [_DRUG_DATABASE, _SET_DRUG_DATABASE] = useState([]);
  const [_LOADING, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pagination, setPagination] = useState({
    pageNumber: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true
  });

  // Get JWT token for authentication
  const getAuthHeaders = () => {
    const jwtToken = localStorage.getItem('jwtToken');
    return {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch all drugs using new /getAll endpoint
  const fetchAllDrugs = useCallback(async (page = 0, size = 20, sort = 'id,desc') => {
    try {
      setSearchLoading(true);
      setError(null);

      // Build query parameters for getAll endpoint
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('size', size);
      params.append('sort', sort);

      const response = await axios.get(
        `/api/pharmacy/medications/getAll?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      const data = response.data;

      // Update search results with comprehensive drug data
      setSearchResults(data.content || []);

      // Update pagination info
      setPagination({
        pageNumber: data.number || 0,
        pageSize: data.size || 20,
        totalElements: data.totalElements || 0,
        totalPages: data.totalPages || 0,
        first: data.first || true,
        last: data.last || true
      });

      return {
        results: data.content || [],
        pagination: {
          pageNumber: data.number || 0,
          pageSize: data.size || 20,
          totalElements: data.totalElements || 0,
          totalPages: data.totalPages || 0,
          first: data.first || true,
          last: data.last || true
        }
      };
    } catch (err) {
      console.error('Error fetching medications:', err);

      let errorMessage = 'Failed to fetch medications';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to access medications.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!err.response) {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Search drugs with hybrid server-side pagination and client-side filtering
  const searchDrug = useCallback(async (searchTerm = '', category = 'all', page = 0, size = 20, sort = 'drugName,asc') => {
    try {
      setSearchLoading(true);
      setError(null);

      // If no search term and category is 'all', use direct API pagination
      if ((!searchTerm || !searchTerm.trim()) && category === 'all') {
        return await fetchAllDrugs(page, size, sort);
      }

      // For search/filtering, get larger dataset for client-side filtering
      // Calculate how many pages we might need
      const estimatedTotalSize = Math.max(500, (page + 1) * size * 2);
      const allDrugsResponse = await fetchAllDrugs(0, estimatedTotalSize, sort);
      let filteredResults = allDrugsResponse.results;

      // Apply client-side filtering
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filteredResults = filteredResults.filter(drug =>
          drug.drugName?.toLowerCase().includes(term) ||
          drug.genericName?.toLowerCase().includes(term) ||
          drug.manufacturer?.toLowerCase().includes(term) ||
          drug.batchNumber?.toLowerCase().includes(term)
        );
      }

      if (category && category !== 'all') {
        filteredResults = filteredResults.filter(drug =>
          drug.category?.toLowerCase() === category.toLowerCase()
        );
      }

      // Apply client-side pagination
      const startIndex = page * size;
      const endIndex = startIndex + size;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);
      const totalPages = Math.ceil(filteredResults.length / size);

      // Update state
      setSearchResults(paginatedResults);
      setPagination({
        pageNumber: page,
        pageSize: size,
        totalElements: filteredResults.length,
        totalPages: totalPages,
        first: page === 0,
        last: page >= totalPages - 1
      });

      return {
        results: paginatedResults,
        pagination: {
          pageNumber: page,
          pageSize: size,
          totalElements: filteredResults.length,
          totalPages: totalPages,
          first: page === 0,
          last: page >= totalPages - 1
        }
      };
    } catch (err) {
      console.error('Error searching medications:', err);
      setError('Failed to search medications');
      throw err;
    } finally {
      setSearchLoading(false);
    }
  }, [fetchAllDrugs]);

  // Get detailed drug information by ID
  const getDrugInfo = useCallback(async (drugId) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all drugs and find the specific one
      const allDrugsResponse = await fetchAllDrugs(0, 100);
      const drug = allDrugsResponse.results.find(d => d.id === drugId);

      if (!drug) {
        throw new Error('Drug not found');
      }

      // The new API provides comprehensive drug information, so we can use it directly
      // Enhanced with clinical information for the modal
      return {
        ...drug,
        // Additional clinical data (could be from another API endpoint in the future)
        pharmacokinetics: {
          absorption: 'Well absorbed orally',
          distribution: 'Widely distributed in body tissues',
          metabolism: 'Hepatic metabolism',
          elimination: 'Primarily renal elimination'
        },
        indications: [
          'Pain management',
          'Fever reduction',
          'Anti-inflammatory treatment'
        ],
        contraindications: [
          'Known hypersensitivity to drug',
          'Severe hepatic impairment',
          'Active GI bleeding'
        ],
        sideEffects: {
          common: ['Nausea', 'Headache', 'Dizziness', 'Drowsiness'],
          serious: ['Allergic reaction', 'Liver toxicity', 'GI bleeding'],
          rare: ['Blood disorders', 'Severe skin reactions', 'Renal dysfunction']
        },
        warnings: [
          'Monitor liver function regularly',
          'Avoid alcohol consumption',
          'Check for drug interactions',
          'Use lowest effective dose'
        ],
        dosage: 'Take as directed by healthcare provider. Do not exceed recommended dose.',
        route: drug.dosageForm === 'Injection' ? 'Intravenous/Intramuscular' : 'Oral',
        // Stock status indicators
        stockStatus: drug.currentStock <= drug.minimumStock ? 'LOW_STOCK' :
                    drug.currentStock === 0 ? 'OUT_OF_STOCK' :
                    drug.currentStock >= drug.maximumStock ? 'OVERSTOCK' : 'NORMAL',
        daysUntilExpiry: Math.ceil((new Date(drug.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
        totalValue: drug.currentStock * drug.unitCost
      };
    } catch (err) {
      console.error('Error getting drug info:', err);
      setError('Failed to get drug information');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAllDrugs]);

  // Check drug interactions
  const checkInteractions = useCallback(async (drugNames) => {
    try {
      if (drugNames.length < 2) {
        return [];
      }

      // TODO: Replace with actual API endpoint for checking drug interactions
      // For now, return mock interaction data
      const mockInteractions = [
        {
          drugs: drugNames.slice(0, 2),
          severity: 'Moderate',
          description: 'May increase risk of side effects. Monitor patient closely.',
          recommendation: 'Consider alternative medication or adjust dosage.'
        }
      ];

      return drugNames.length > 1 ? mockInteractions : [];
    } catch (err) {
      setError('Failed to check drug interactions');
      throw err;
    }
  }, []);

  // Get available categories (mock data for now)
  const getCategories = useCallback(() => {
    return [
      'Antibiotic',
      'Analgesic',
      'Cardiovascular',
      'Diabetes',
      'Respiratory',
      'Neurological',
      'Gastrointestinal',
      'Hormonal',
      'Other'
    ];
  }, []);

  // Handle real-time inventory WebSocket updates for drug database
  const handleDrugDatabaseWebSocketUpdate = useCallback((data) => {
    if (data.type === 'INVENTORY_UPDATED') {
      console.log('Real-time drug database update received:', data);

      // Update search results if the drug is in the current view
      setSearchResults(prev => prev.map(drug => {
        if (drug.drugName === data.drugName) {
          return {
            ...drug,
            currentStock: data.remainingStock,
            updatedAt: new Date().toISOString()
          };
        }
        return drug;
      }));
    }
  }, []);

  // WebSocket connection for real-time drug database updates
  const { isConnected: wsConnected } = useWebSocket(
    '/ws',
    { '/topic/inventory': handleDrugDatabaseWebSocketUpdate },
    { debug: true, reconnectDelay: 5000 }
  );

  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setPagination({
      pageNumber: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true
    });
    setError(null);
  }, []);

  return {
    // State
    drugDatabase: searchResults, // Use search results as main data
    searchResults,
    loading: searchLoading,
    error,
    pagination,

    // Functions
    searchDrug,
    fetchAllDrugs,
    getDrugInfo,
    checkInteractions,
    getCategories,
    clearSearch,

    // WebSocket
    wsConnected
  };
}