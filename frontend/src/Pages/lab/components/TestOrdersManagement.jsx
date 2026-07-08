import React, { useState, useEffect, useCallback } from 'react';
import { Search, TestTube, RefreshCw, Clock, AlertTriangle, Eye, XCircle, CheckCircle, User, FileText } from 'lucide-react';
import useLabRequestWebSocket from '../hooks/useLabRequestWebSocket';
import TestResultsModal from './TestResultsModal';
import axios from 'axios';

export default function TestOrdersManagement({ showToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [updatingRequests, setUpdatingRequests] = useState(new Set());

  const {
    labRequests,
    stats,
    connected,
    error,
    refreshLabRequests
  } = useLabRequestWebSocket(showToast);

  const fetchLabRequests = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        console.warn('No JWT token found');
        return;
      }

      const response = await axios.get('/api/lab-requests/all', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      refreshLabRequests(response.data);
    } catch (error) {
      console.error('Error fetching lab requests:', error);
      if (showToast) {
        showToast('error', 'Error', 'Failed to fetch lab requests');
      }
    } finally {
      setLoading(false);
    }
  }, [refreshLabRequests, showToast]);

  useEffect(() => {
    fetchLabRequests();
  }, [fetchLabRequests]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      // Add request to updating set for loading state
      setUpdatingRequests(prev => new Set([...prev, requestId]));
      
      // Optimistically update the UI immediately for instant feedback
      const updateRequest = (prev) => 
        prev.map(req => 
          req.requestId === requestId 
            ? { ...req, status: newStatus }
            : req
        );
      
      // Update local state through the WebSocket hook's refreshLabRequests
      const currentRequests = labRequests;
      const updatedRequests = updateRequest(currentRequests);
      refreshLabRequests(updatedRequests);

      const jwtToken = localStorage.getItem('jwtToken');
      
      console.log('🔄 Updating lab request status:', {
        requestId,
        newStatus,
        hasToken: !!jwtToken
      });
      
      // Send update to backend
      await axios.put(`/api/lab-requests/${requestId}/status`, 
        null,
        {
          params: {
            status: newStatus
          },
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (showToast) {
        showToast('success', 'Status Updated', `Lab request status changed to ${newStatus}`);
      }
    } catch (error) {
      console.error('Error updating status:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        requestId,
        newStatus
      });
      
      // Revert the optimistic update on error
      fetchLabRequests();
      
      if (showToast) {
        const errorMessage = error.response?.data || error.message || 'Failed to update status';
        showToast('error', 'Error', `Failed to update status: ${errorMessage}`);
      }
    } finally {
      // Remove request from updating set
      setUpdatingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleEnterResults = (request) => {
    setSelectedRequest(request);
    setShowResultsModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Lab Test Orders</h2>
            <p className="text-gray-600">Real-time lab request management from ward staff</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {connected ? 'Live Updates' : 'Disconnected'}
              </span>
            </div>
            
            <button
              onClick={fetchLabRequests}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800 font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.pending}</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <TestTube className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800 font-medium">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.inProgress}</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <TestTube className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">{stats.completed}</p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">Urgent</span>
            </div>
            <p className="text-2xl font-bold text-red-900 mt-1">{stats.urgent}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by patient, request ID, or ward..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lab Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading && labRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lab requests...</p>
          </div>
        ) : labRequests.length === 0 ? (
          <div className="text-center py-8">
            <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No lab requests received yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Lab requests from ward staff will appear here automatically
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {labRequests
              .filter(request => 
                !searchTerm ||
                request.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                request.requestId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                request.wardName?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((request, index) => (
                <div key={request.requestId || index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="font-medium text-gray-900">{request.requestId}</h3>
                        <span className="text-sm text-gray-500">
                          {new Date(request.requestDate).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Patient:</span> {request.patientName}
                        </div>
                        <div>
                          <span className="font-medium">Ward:</span> {request.wardName} - Bed {request.bedNumber}
                        </div>
                      </div>
                      
                      {request.tests && request.tests.length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700">Tests: </span>
                          <span className="text-sm text-gray-600">
                            {request.tests.map(test => test.testName).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="flex items-center space-x-1 px-3 py-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                      
                      {request.status === 'PENDING' && (
                        <button
                          onClick={() => handleStatusUpdate(request.requestId, 'IN_PROGRESS')}
                          disabled={updatingRequests.has(request.requestId)}
                          className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updatingRequests.has(request.requestId) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
                              <TestTube className="h-4 w-4" />
                              <span>Start</span>
                            </>
                          )}
                        </button>
                      )}
                      
                      {request.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            onClick={() => handleEnterResults(request)}
                            className="flex items-center space-x-1 px-3 py-2 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Enter Results</span>
                          </button>
                          
                          <button
                            onClick={() => handleStatusUpdate(request.requestId, 'COMPLETED')}
                            disabled={updatingRequests.has(request.requestId)}
                            className="flex items-center space-x-1 px-3 py-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingRequests.has(request.requestId) ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                <span>Completing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                <span>Complete</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Lab Request Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Request ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.requestId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedRequest.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    selectedRequest.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    selectedRequest.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border border-green-200' :
                    'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.patientName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.patientNationalId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ward</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.wardName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bed Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.bedNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Requested By</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.requestedBy}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Request Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedRequest.requestDate).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Requested Tests</label>
                <div className="space-y-2">
                  {selectedRequest.tests?.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <TestTube className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">{test.testName}</p>
                          <p className="text-sm text-gray-600">Category: {test.category}</p>
                        </div>
                      </div>
                      {test.urgent && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Urgent
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRequest.additionalNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRequest.additionalNotes}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              
              {selectedRequest.status === 'PENDING' && (
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedRequest.requestId, 'IN_PROGRESS');
                    setShowDetailsModal(false);
                  }}
                  disabled={updatingRequests.has(selectedRequest.requestId)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingRequests.has(selectedRequest.requestId) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Starting...</span>
                    </>
                  ) : (
                    <span>Start Processing</span>
                  )}
                </button>
              )}
              
              {selectedRequest.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedRequest.requestId, 'COMPLETED');
                    setShowDetailsModal(false);
                  }}
                  disabled={updatingRequests.has(selectedRequest.requestId)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingRequests.has(selectedRequest.requestId) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Completing...</span>
                    </>
                  ) : (
                    <span>Mark Complete</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">WebSocket Connection Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <p className="text-red-600 text-xs mt-1">Real-time updates may not work properly. Click refresh to reload data.</p>
        </div>
      )}

      {/* Test Results Modal */}
      <TestResultsModal
        isOpen={showResultsModal}
        onClose={() => {
          setShowResultsModal(false);
          setSelectedRequest(null);
          // Refresh lab requests after closing modal
          fetchLabRequests();
        }}
        labRequest={selectedRequest}
        showToast={showToast}
      />
    </div>
  );
}
