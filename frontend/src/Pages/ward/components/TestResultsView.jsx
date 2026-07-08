import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Calendar, User, Clock, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import axios from 'axios';

const TestResultsView = ({ patientNationalId, showToast }) => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);

  const fetchTestResults = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching test results for patient:', patientNationalId);
      
      // First try with JWT token
      const jwtToken = localStorage.getItem('jwtToken');
      let response;
      
      if (jwtToken) {
        try {
          response = await axios.get(
            `/api/test-results/patient/${patientNationalId}/recent`,
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
            // Try without JWT since some endpoints might be public
            response = await axios.get(
              `/api/test-results/patient/${patientNationalId}/recent`,
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
        // No JWT token, try direct API call
        response = await axios.get(
          `/api/test-results/patient/${patientNationalId}/recent`,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      console.log('✅ Test results fetched:', response.data);
      setTestResults(response.data || []);
      
      if (showToast && response.data?.length === 0) {
        showToast('No recent test results found for this patient', 'info');
      }
      
    } catch (error) {
      console.error('❌ Error fetching test results:', error);
      
      if (error.response?.status === 404) {
        showToast && showToast('No test results found for this patient', 'info');
        setTestResults([]);
      } else if (error.response?.status === 401) {
        showToast && showToast('Authentication required to view test results', 'error');
      } else if (error.response?.status === 500) {
        showToast && showToast('Server error while fetching test results', 'error');
      } else {
        showToast && showToast(`Failed to fetch test results: ${error.message}`, 'error');
      }
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  }, [patientNationalId, showToast]);

  const fetchAllTestResults = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching ALL test results for patient:', patientNationalId);
      
      const jwtToken = localStorage.getItem('jwtToken');
      let response;
      
      if (jwtToken) {
        try {
          response = await axios.get(
            `/api/test-results/patient/${patientNationalId}`,
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
              `/api/test-results/patient/${patientNationalId}`,
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
          `/api/test-results/patient/${patientNationalId}`,
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
        showToast('No test results found for this patient', 'info');
      }
      
    } catch (error) {
      console.error('❌ Error fetching all test results:', error);
      
      if (error.response?.status === 404) {
        showToast && showToast('No test results found for this patient', 'info');
        setTestResults([]);
      } else {
        showToast && showToast(`Failed to fetch test results: ${error.message}`, 'error');
        setTestResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [patientNationalId, showToast]);

  useEffect(() => {
    if (patientNationalId) {
      fetchTestResults();
    }
  }, [patientNationalId, fetchTestResults]);

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
          // For any other test type, show key-value pairs
          const resultKeys = Object.keys(results).slice(0, 3); // Show first 3 values
          return resultKeys.map(key => `${key}: ${results[key]}`).join(', ') || 'View details for results';
        }
      }
    } catch (error) {
      console.error('Error formatting result summary:', error);
      return 'Error displaying results';
    }
  };

  const renderDetailedResults = (testName, results) => {
    if (!results || Object.keys(results).length === 0) {
      return <p className="text-gray-500 italic">No detailed results available</p>;
    }

    try {
      switch (testName) {
        case 'Blood Glucose':
          return (
            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Glucose Level:</span>
                <span className="font-semibold text-blue-600">{results.glucoseLevel || 'N/A'} mg/dL</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Test Type:</span>
                <span className="capitalize text-gray-800">{results.testType || 'Standard'}</span>
              </div>
              {results.glucoseLevel && (
                <div className="mt-2 p-2 rounded bg-blue-50">
                  <span className="text-sm text-blue-700">
                    Reference Range: 70-140 mg/dL (fasting: 70-100 mg/dL)
                  </span>
                </div>
              )}
            </div>
          );

      case 'Complete Blood Count':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">White Blood Cells:</span>
              <span>{results.wbc} × 10³/μL</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Red Blood Cells:</span>
              <span>{results.rbc} × 10⁶/μL</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Hemoglobin:</span>
              <span>{results.hemoglobin} g/dL</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Platelets:</span>
              <span>{results.platelets} × 10³/μL</span>
            </div>
          </div>
        );

      case 'Urine Analysis':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Protein:</span>
              <span className="capitalize">{results.protein}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Glucose:</span>
              <span className="capitalize">{results.urineGlucose}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Specific Gravity:</span>
              <span>{results.specificGravity}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">pH:</span>
              <span>{results.ph}</span>
            </div>
          </div>
        );

      case 'Cholesterol Level':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Total Cholesterol:</span>
              <span>{results.totalCholesterol} mg/dL</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">HDL Cholesterol:</span>
              <span>{results.hdlCholesterol} mg/dL</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">LDL Cholesterol:</span>
              <span>{results.ldlCholesterol} mg/dL</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Triglycerides:</span>
              <span>{results.triglycerides} mg/dL</span>
            </div>
          </div>
        );

      default: {
        // For unknown test types, display all available data
        const resultEntries = Object.entries(results);
        return (
          <div className="space-y-2">
            {resultEntries.map(([key, value], index) => (
              <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-800">{value || 'N/A'}</span>
              </div>
            ))}
          </div>
        );
      }
      }
    } catch (error) {
      console.error('Error rendering detailed results:', error);
      return <p className="text-red-500">Error displaying detailed results</p>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading test results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {showAllResults ? 'All Test Results' : 'Recent Test Results (30 days)'}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setShowAllResults(!showAllResults);
              if (!showAllResults) {
                fetchAllTestResults();
              } else {
                fetchTestResults();
              }
            }}
            className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
          >
            {showAllResults ? 'Show Recent' : 'Show All'}
          </button>
          <button
            onClick={showAllResults ? fetchAllTestResults : fetchTestResults}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {testResults.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No test results found for this patient</p>
          <p className="text-sm text-gray-500 mt-2">Test results from the last 30 days will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {testResults.map((result) => (
            <div
              key={result.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getTestIcon(result.testName)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{result.testName}</h4>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Completed
                      </span>
                    </div>
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedResult.testName} Results
                  </h3>
                  <p className="text-sm text-gray-600">
                    Completed on {new Date(selectedResult.completedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Test Results</h4>
                {renderDetailedResults(selectedResult.testName, selectedResult.results)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Request ID:</span>
                  <span className="ml-2 text-gray-900">{selectedResult.requestId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Completed By:</span>
                  <span className="ml-2 text-gray-900">{selectedResult.completedBy || 'Lab Staff'}</span>
                </div>
              </div>

              {selectedResult.notes && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Additional Notes</h4>
                  <p className="text-gray-700 text-sm">{selectedResult.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestResultsView;