import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Calendar, User, Clock, AlertCircle, TrendingUp, Activity, RefreshCw, Search } from 'lucide-react';
import axios from 'axios';

const AllTestResultsView = ({ showToast }) => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, today, week, month

  const fetchAllTestResults = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching ALL test results from system...');
      
      // Try with JWT first, then fallback to public access
      const jwtToken = localStorage.getItem('jwtToken');
      let response;
      
      if (jwtToken) {
        try {
          response = await axios.get(
            '/api/test-results/all',
            {
              headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (authError) {
          if (authError.response?.status === 401 || authError.response?.status === 403) {
            console.log('🔓 JWT failed, trying without authentication...');
            response = await axios.get(
              '/api/test-results/all',
              {
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
          } else {
            throw authError;
          }
        }
      } else {
        response = await axios.get(
          '/api/test-results/all',
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      console.log('✅ All test results fetched:', response.data);
      setTestResults(response.data || []);
      
      if (showToast && response.data?.length === 0) {
        showToast('No test results found in the system', 'info');
      } else if (showToast && response.data?.length > 0) {
        showToast(`Found ${response.data.length} test results`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Error fetching all test results:', error);
      
      if (error.response?.status === 404) {
        showToast && showToast('No test results found in the system', 'info');
        setTestResults([]);
      } else if (error.response?.status === 500) {
        showToast && showToast('Server error while fetching test results', 'error');
      } else {
        showToast && showToast(`Failed to fetch test results: ${error.message}`, 'error');
      }
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllTestResults();
  }, [fetchAllTestResults]);

  const handleViewDetails = (result) => {
    setSelectedResult(result);
    setShowDetailsModal(true);
  };

  const getTestIcon = (testName) => {
    switch (testName) {
      case 'Complete Blood Count':
        return <Activity className="h-5 w-5 text-red-500" />;
      case 'Blood Glucose':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'Urine Analysis':
        return <FileText className="h-5 w-5 text-yellow-500" />;
      case 'Cholesterol Level':
        return <Activity className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatResultSummary = (testName, results) => {
    if (!results || Object.keys(results).length === 0) return 'No data available';

    try {
      switch (testName) {
        case 'Blood Glucose':
          return `${results.glucoseLevel || 'N/A'} mg/dL (${results.testType || 'Standard'})`;
        case 'Complete Blood Count':
          return `WBC: ${results.wbc || 'N/A'}, RBC: ${results.rbc || 'N/A'}, Hgb: ${results.hemoglobin || 'N/A'}`;
        case 'Urine Analysis':
          return `Protein: ${results.protein || 'N/A'}, Glucose: ${results.urineGlucose || 'N/A'}`;
        case 'Cholesterol Level':
          return `Total: ${results.totalCholesterol || 'N/A'}, HDL: ${results.hdlCholesterol || 'N/A'}, LDL: ${results.ldlCholesterol || 'N/A'}`;
        default: {
          const resultKeys = Object.keys(results).slice(0, 3);
          return resultKeys.map(key => `${key}: ${results[key]}`).join(', ') || 'View details for results';
        }
      }
    } catch (error) {
      console.error('Error formatting result summary:', error);
      return 'Error displaying results';
    }
  };

  const filterResults = (results) => {
    let filtered = results;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.patientNationalId.includes(searchTerm) ||
        result.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.wardName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by time period
    const now = new Date();
    if (filterBy === 'today') {
      filtered = filtered.filter(result => {
        const resultDate = new Date(result.completedAt);
        return resultDate.toDateString() === now.toDateString();
      });
    } else if (filterBy === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(result => new Date(result.completedAt) >= weekAgo);
    } else if (filterBy === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(result => new Date(result.completedAt) >= monthAgo);
    }

    return filtered;
  };

  const filteredResults = filterResults(testResults);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading all test results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900">
          All Test Results ({filteredResults.length})
        </h3>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient, test, or request ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          {/* Create Sample Data (for testing) */}
          <button
            onClick={async () => {
              try {
                const response = await axios.post('/api/test-results/create-sample-data');
                if (response.data.success) {
                  showToast && showToast(`Created ${response.data.createdTests} sample test results`, 'success');
                  fetchAllTestResults(); // Refresh to show new data
                } else {
                  showToast && showToast('Failed to create sample data', 'error');
                }
              } catch (error) {
                console.error('Error creating sample data:', error);
                showToast && showToast('Failed to create sample data', 'error');
              }
            }}
            className="flex items-center space-x-1 px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
          >
            <span>Create Sample Data</span>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchAllTestResults}
            className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {filteredResults.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {testResults.length === 0 ? 'No test results found in the system' : 'No test results match your search criteria'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {testResults.length === 0 
              ? 'Test results will appear here once lab staff complete and submit test results'
              : 'Try adjusting your search terms or time filter'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result) => (
            <div
              key={result.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getTestIcon(result.testName)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h4 className="font-medium text-gray-900">{result.testName}</h4>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Completed
                      </span>
                    </div>
                    
                    {/* Patient Info */}
                    <div className="flex items-center space-x-4 mt-1 text-sm">
                      <span className="font-medium text-blue-600">{result.patientName}</span>
                      <span className="text-gray-500">ID: {result.patientNationalId}</span>
                    </div>

                    {/* Result Summary */}
                    <p className="text-sm text-gray-600 mt-1">
                      {formatResultSummary(result.testName, result.results)}
                    </p>
                    
                    {/* Request ID and Ward Info */}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      <span className="font-medium">Request: {result.requestId}</span>
                      {result.wardName && (
                        <span>Ward: {result.wardName}</span>
                      )}
                    </div>

                    {/* Completion Info */}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(result.completedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(result.completedAt).toLocaleTimeString()}</span>
                      </div>
                      {result.completedBy && (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>By: {result.completedBy}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes if available */}
                    {result.notes && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                        <span className="font-medium text-yellow-800">Notes: </span>
                        <span className="text-yellow-700">{result.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleViewDetails(result)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {getTestIcon(selectedResult.testName)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedResult.testName}</h3>
                  <p className="text-sm text-gray-600">{selectedResult.patientName} - {selectedResult.patientNationalId}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Test Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Request ID:</span>
                      <span className="font-medium">{selectedResult.requestId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ward:</span>
                      <span>{selectedResult.wardName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed By:</span>
                      <span>{selectedResult.completedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed At:</span>
                      <span>{new Date(selectedResult.completedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Test Results</h4>
                  {selectedResult.results && Object.keys(selectedResult.results).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(selectedResult.results).map(([key, value], index) => (
                        <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="text-gray-800">{value || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No detailed results available</p>
                  )}
                </div>
              </div>
              
              {selectedResult.notes && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedResult.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllTestResultsView;