import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Pill,
  FileText,
  Shield,
  Calendar,
  Download,
  Building
} from 'lucide-react';

export default function PrescriptionProcessing({ 
  prescriptions, 
  loading, 
  onUpdateStatus,
  onCheckInteractions,
  onDispenseMedication,
  onCancelPrescription,
  stats 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all'); // New filter for ward/clinic
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [interactionResults, setInteractionResults] = useState(null);

  // Utility function to safely format dates
  const formatDate = (dateString, fallback = 'Date not available') => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return fallback;
      return date.toLocaleDateString();
    } catch {
      return fallback;
    }
  };

  const formatDateTime = (dateString, fallback = 'Date not available') => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return fallback;
      return date.toLocaleString();
    } catch {
      return fallback;
    }
  };

  // Filter prescriptions based on search, status, and source
  const filteredPrescriptions = useMemo(() => {
    return (prescriptions || []).filter(prescription => {
      const matchesSearch = !searchTerm ||
        prescription.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.prescriptionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.prescribedBy?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || 
        prescription.status?.toUpperCase() === filterStatus.toUpperCase();
      
      const matchesSource = filterSource === 'all' ||
        (filterSource === 'clinic' && prescription.isClinicPrescription) ||
        (filterSource === 'ward' && !prescription.isClinicPrescription);
      
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [prescriptions, searchTerm, filterStatus, filterSource]);

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'RECEIVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS':
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'READY':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED':
      case 'DISPENSED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'DISCONTINUED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXPIRED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'RECEIVED':
        return <ClipboardList className="w-4 h-4" />;
      case 'IN_PROGRESS':
      case 'PROCESSING':
        return <Clock className="w-4 h-4" />;
      case 'READY':
        return <CheckCircle className="w-4 h-4" />;
      case 'COMPLETED':
      case 'DISPENSED':
        return <Shield className="w-4 h-4" />;
      case 'DISCONTINUED':
      case 'CANCELLED':
      case 'EXPIRED':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleViewPrescription = async (prescription) => {
    console.log('🔍 Viewing prescription:', prescription);
    console.log('📊 Prescription data structure:', {
      prescriptionId: prescription?.prescriptionId,
      totalMedications: prescription?.totalMedications,
      prescriptionItems: prescription?.prescriptionItems?.length,
      medications: prescription?.medications?.length,
      prescriptionItemsData: prescription?.prescriptionItems,
      medicationsData: prescription?.medications
    });
    
    setSelectedPrescription(prescription);
    setShowDetails(true);
    
    // Check for drug interactions
    try {
      const interactions = await onCheckInteractions(prescription.prescriptionId);
      setInteractionResults(interactions);
    } catch (error) {
      console.error('Failed to check interactions:', error);
    }
  };

  const handleStatusUpdate = async (prescriptionId, newStatus) => {
    try {
      await onUpdateStatus(prescriptionId, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleCancelPrescription = async (prescriptionId, reason = '') => {
    try {
      await onCancelPrescription(prescriptionId, reason);
    } catch (error) {
      console.error('Failed to cancel prescription:', error);
    }
  };

  const handleDispenseMedication = async (prescription) => {
    try {
      await onDispenseMedication(prescription.prescriptionId, {
        pharmacistName: 'Current Pharmacist', // This would come from user context
        dispensedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to dispense medication:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-600">Loading prescriptions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-3xl font-bold text-blue-600">{stats?.totalPrescriptions || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Received</p>
              <p className="text-3xl font-bold text-yellow-600">{stats?.receivedPrescriptions || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ready</p>
              <p className="text-3xl font-bold text-green-600">{stats?.readyPrescriptions || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispensed Today</p>
              <p className="text-3xl font-bold text-purple-600">{stats?.dispensedToday || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              🏨
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Ward Prescriptions</p>
              <p className="text-2xl font-bold text-blue-600">
                {prescriptions.filter(p => !p.isClinicPrescription).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              🏥
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Clinic Prescriptions</p>
              <p className="text-2xl font-bold text-purple-600">
                {prescriptions.filter(p => p.isClinicPrescription).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search prescriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
                <option value="DISCONTINUED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            {/* Source Filter (Ward/Clinic) */}
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-gray-600" />
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Sources</option>
                <option value="ward">🏨 Ward Prescriptions</option>
                <option value="clinic">🏥 Clinic Prescriptions</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {(filterStatus !== 'all' || filterSource !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterSource('all');
                  setSearchTerm('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
            {(filterStatus !== 'all' || filterSource !== 'all' || searchTerm) && (
              <span className="ml-2">
                (Filtered by:
                {filterStatus !== 'all' && <span className="ml-1 font-medium">{filterStatus}</span>}
                {filterSource !== 'all' && <span className="ml-1 font-medium">{filterSource}</span>}
                {searchTerm && <span className="ml-1 font-medium">"{searchTerm}"</span>}
                )
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prescription List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Prescription Dispensing</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredPrescriptions.length > 0 ? (
            filteredPrescriptions.filter(prescription => prescription != null).map((prescription, index) => (
              <div key={prescription?.prescriptionId || `prescription-${index}`} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Prescription Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Pill className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {prescription?.prescriptionId || 'N/A'}
                          </h4>
                          <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(prescription?.status)}`}>
                            {getStatusIcon(prescription?.status)}
                            <span className="capitalize">{(prescription?.status || 'active').toLowerCase().replace('_', ' ')}</span>
                          </span>
                          {/* Location Badge - Ward vs Clinic */}
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${
                            prescription?.isClinicPrescription 
                              ? 'bg-purple-100 text-purple-800 border-purple-200' 
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            {prescription?.isClinicPrescription ? 'CLINIC' : 'WARD'}
                          </span>
                          {prescription?.urgency && prescription.urgency !== 'normal' && (
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(prescription.urgency)}`}>
                              {prescription.urgency.toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>Patient: {prescription?.patientName || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4" />
                            <span>Doctor: {prescription?.prescribedBy || prescription?.doctorName || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>Received: {formatDate(prescription?.receivedAt || prescription?.prescribedDate)}</span>
                          </div>
                        </div>
                        
                        {/* Location Information */}
                        <div className="mt-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <span className="w-4 h-4 flex items-center justify-center">
                              {prescription?.isClinicPrescription ? '🏥' : '🏨'}
                            </span>
                            <span>
                              Location: {
                                prescription?.isClinicPrescription 
                                  ? (prescription?.clinicName || prescription?.wardName || 'Outpatient Clinic')
                                  : (prescription?.wardName || 'Ward')
                              }
                              {prescription?.bedNumber && ` - Bed ${prescription.bedNumber}`}
                            </span>
                          </div>
                        </div>

                        {/* Medications Preview */}
                        <div className="mt-3">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            Medications ({prescription?.totalMedications || prescription?.prescriptionItems?.length || prescription?.medications?.length || 0}):
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(prescription?.prescriptionItems || prescription?.medications || []).slice(0, 3).map((med, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {med.drugName} - {med.dose || med.dosage}
                              </span>
                            ))}
                            {(prescription?.totalMedications || prescription?.prescriptionItems?.length || prescription?.medications?.length || 0) > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{(prescription?.totalMedications || prescription?.prescriptionItems?.length || prescription?.medications?.length || 0) - 3} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Warnings */}
                        {prescription.warnings && prescription.warnings.length > 0 && (
                          <div className="mt-3 flex items-center space-x-2 text-sm text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span>{prescription.warnings.length} warning(s) detected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    {/* Debug: Show prescription status in development */}
                    {import.meta.env.DEV && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        Status: {prescription?.status}
                      </span>
                    )}
                    
                    {/* View Button - Always visible */}
                    <button
                      onClick={() => handleViewPrescription(prescription)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>

                    {/* Dispense Button - For active prescriptions */}
                    {(prescription?.status === 'PENDING' ||
                      prescription?.status === 'ACTIVE' || 
                      prescription?.status === 'received' || 
                      prescription?.status === 'ready' || 
                      prescription?.status === 'IN_PROGRESS') && (
                      <button
                        onClick={() => handleDispenseMedication(prescription)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <Pill className="w-4 h-4" />
                        <span>Dispense</span>
                      </button>
                    )}

                    {/* Mark Ready Button - For processing prescriptions */}
                    {prescription?.status === 'processing' && (
                      <button
                        onClick={() => handleStatusUpdate(prescription?.prescriptionId, 'ready')}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark Ready</span>
                      </button>
                    )}

                    {/* Cancel Button - For active prescriptions that can be cancelled */}
                    {(prescription?.status === 'PENDING' ||
                      prescription?.status === 'ACTIVE' || 
                      prescription?.status === 'received' || 
                      prescription?.status === 'processing' || 
                      prescription?.status === 'IN_PROGRESS' ||
                      prescription?.status === 'ready') && (
                      <button
                        onClick={() => handleCancelPrescription(prescription?.prescriptionId, 'Cancelled by pharmacist')}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Prescriptions Found
              </h3>
              <p className="text-gray-600">
                {prescriptions.length === 0 
                  ? "No prescriptions have been received yet." 
                  : "No prescriptions match your current search criteria."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Prescription Details Modal */}
      {showDetails && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Prescription Details</h2>
                <p className="text-green-100 text-sm">ID: {selectedPrescription.prescriptionId}</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="w-5 h-5 text-blue-600 mr-2" />
                    Patient Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedPrescription.patientName}</p>
                    <p><span className="font-medium">National ID:</span> {selectedPrescription.patientNationalId}</p>
                    <p><span className="font-medium">Patient ID:</span> {selectedPrescription.patientId}</p>
                    
                    {/* Location Information - Ward or Clinic */}
                    {selectedPrescription.isClinicPrescription ? (
                      <>
                        <p><span className="font-medium">Location:</span> {selectedPrescription.wardName || selectedPrescription.clinicName || 'Outpatient Clinic'}</p>
                        <p><span className="font-medium">Visit Type:</span> {selectedPrescription.visitType || 'Outpatient'}</p>
                      </>
                    ) : (
                      <>
                        {selectedPrescription.wardName && (
                          <p><span className="font-medium">Ward:</span> {selectedPrescription.wardName}</p>
                        )}
                        {selectedPrescription.bedNumber && (
                          <p><span className="font-medium">Bed:</span> {selectedPrescription.bedNumber}</p>
                        )}
                        {selectedPrescription.admissionId && (
                          <p><span className="font-medium">Admission ID:</span> {selectedPrescription.admissionId}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText className="w-5 h-5 text-green-600 mr-2" />
                    Prescription Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Prescribed By:</span> {selectedPrescription.prescribedBy}</p>
                    <p><span className="font-medium">Prescribed Date:</span> {formatDateTime(selectedPrescription.prescribedDate)}</p>
                    <p><span className="font-medium">Received:</span> {formatDate(selectedPrescription.receivedAt || selectedPrescription.createdAt || selectedPrescription.prescribedDate)}</p>
                    <p><span className="font-medium">Start Date:</span> {formatDate(selectedPrescription.startDate)}</p>
                    <p><span className="font-medium">End Date:</span> {formatDate(selectedPrescription.endDate)}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedPrescription.status?.toLowerCase() || 'active')}`}>
                        {selectedPrescription.status || 'ACTIVE'}
                      </span>
                    </p>
                    <p><span className="font-medium">Total Medications:</span> {selectedPrescription.totalMedications}</p>
                  </div>
                </div>
              </div>

              {/* Prescription Notes */}
              {selectedPrescription.prescriptionNotes && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <FileText className="w-5 h-5 text-yellow-600 mr-2" />
                    Prescription Notes
                  </h3>
                  <p className="text-sm text-gray-700">{selectedPrescription.prescriptionNotes}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Pill className="w-5 h-5 text-green-600 mr-2" />
                  Medicines Requested ({selectedPrescription?.totalMedications || (selectedPrescription?.prescriptionItems || selectedPrescription?.medications || []).length})
                </h3>
                
                {/* Debug Info in Development */}
                {import.meta.env.DEV && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Debug Info:</strong>
                    <br />
                    Prescription Items: {(selectedPrescription?.prescriptionItems || []).length}
                    <br />
                    Medications: {(selectedPrescription?.medications || []).length}
                    <br />
                    Total Medications: {selectedPrescription?.totalMedications}
                    <br />
                    Is Clinic: {selectedPrescription?.isClinicPrescription ? 'Yes' : 'No'}
                  </div>
                )}
                
                <div className="space-y-3">
                  {(selectedPrescription.prescriptionItems || selectedPrescription.medications || []).length > 0 ? (
                    (selectedPrescription.prescriptionItems || selectedPrescription.medications || []).map((medication, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="font-medium text-gray-900">{medication.drugName}</p>
                            {medication.genericName && (
                              <p className="text-sm text-gray-600">{medication.genericName}</p>
                            )}
                            {medication.dosageForm && (
                              <p className="text-xs text-gray-500">{medication.dosageForm}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Dosage</p>
                            <p className="font-medium">{medication.dose || medication.dosage}</p>
                            {medication.route && (
                              <p className="text-xs text-gray-500">Route: {medication.route}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Frequency</p>
                            <p className="font-medium">{medication.frequency}</p>
                            {medication.isUrgent && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                                Urgent
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Quantity</p>
                            <p className="font-medium">
                              {medication.quantity} {medication.quantityUnit || medication.duration || 'units'}
                            </p>
                            {medication.manufacturer && (
                              <p className="text-xs text-gray-500">Mfg: {medication.manufacturer}</p>
                            )}
                          </div>
                        </div>
                        {medication.instructions && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm">
                              <span className="font-medium text-gray-700">Instructions:</span>{' '}
                              <span className="text-gray-600">{medication.instructions}</span>
                            </p>
                          </div>
                        )}
                        {medication.notes && (
                          <div className="mt-2">
                            <p className="text-sm">
                              <span className="font-medium text-gray-700">Notes:</span>{' '}
                              <span className="text-gray-600">{medication.notes}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Pill className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No medications found for this prescription</p>
                      <p className="text-sm mt-1">This might be a data loading issue - please refresh or contact support</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Drug Interactions */}
              {interactionResults && interactionResults.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    Drug Interactions Detected
                  </h3>
                  <div className="space-y-2">
                    {interactionResults.map((interaction, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="font-medium text-red-900">{interaction.severity} Interaction</p>
                        <p className="text-sm text-red-800">{interaction.description}</p>
                        <p className="text-xs text-red-700 mt-1">Drugs: {interaction.drugs.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>

                <div className="flex space-x-3">
                  {/* Download PDF Button */}
                  <a
                    href={selectedPrescription.isClinicPrescription 
                      ? `/api/clinic/prescriptions/${selectedPrescription.prescriptionId}/pdf`
                      : `/api/prescriptions/${selectedPrescription.prescriptionId}/pdf`
                    }
                    download={`Prescription_${selectedPrescription.prescriptionId}.pdf`}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </a>

                  {(selectedPrescription?.status === 'PENDING' || 
                    selectedPrescription?.status === 'ACTIVE') && (
                    <button
                      onClick={() => {
                        handleDispenseMedication(selectedPrescription);
                        setShowDetails(false);
                      }}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Pill className="w-4 h-4" />
                      <span>Dispense Medications</span>
                    </button>
                  )}
                  
                  {selectedPrescription?.status === 'COMPLETED' && (
                    <span className="flex items-center space-x-2 px-6 py-2 bg-gray-100 text-gray-600 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      <span>Already Dispensed</span>
                    </span>
                  )}
                  
                  {(selectedPrescription?.status === 'PENDING' ||
                    selectedPrescription?.status === 'ACTIVE' || 
                    selectedPrescription?.status === 'IN_PROGRESS') && (
                    <button
                      onClick={() => {
                        handleCancelPrescription(selectedPrescription?.prescriptionId, 'Cancelled by pharmacist');
                        setShowDetails(false);
                      }}
                      className="flex items-center space-x-2 px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}