import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Users,
  Activity,
  FileText,
  Clock,
  UserPlus,
  RefreshCw,
  Droplet,
  Download,
  Search,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
  BarChart3
} from 'lucide-react';

// Import components
import DialysisHeader from './components/DialysisHeader';
import SessionScheduler from './components/SessionScheduler';
import SessionDetailsModal from './components/SessionDetailsModal';
import ReportsModule from './components/ReportsModule';
import DialysisAnalytics from './components/DialysisAnalytics';
import { ToastContainer } from '../Clinic/nurs/components/Toast';

// Import custom hooks
import useDialysisSessions from './hooks/useDialysisSessions';

export default function DialysisDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailsFilter, setDetailsFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    sessionId: null,
    sessionStatus: null,
    patientName: ''
  });

  // Toast functions - memoized to prevent infinite loop
  const addToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Custom hooks for data management
  const {
    sessions,
    loading: _sessionsLoading,
    dialysisPatients,
    patientsLoading,
    wsConnected,
    wsError,
    wsNotifications,
    wsTransferredPatients,
    fetchDialysisPatients,
    createSession,
    getMachinesWithAvailability,
    addSessionDetails,
    requestDialysisUpdate,
    deleteSession
  } = useDialysisSessions(addToast);

  // Download report function
  const handleDownloadReport = async (sessionId) => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');

      const response = await fetch(
        `/api/dialysis/sessions/${sessionId}/report/pdf`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Accept': 'application/pdf'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Empty response');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Dialysis_Session_Report_${sessionId}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      addToast('success', 'Report Downloaded', 'Session report downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);

      if (error.message && !error.message.includes('Failed to fetch')) {
        addToast('error', 'Download Failed', 'Failed to download session report');
      }
    }
  };

  // Delete session function - only for SCHEDULED sessions
  const handleDeleteSession = async (sessionId, sessionStatus, patientName) => {
    // Only allow deletion of SCHEDULED sessions
    if (sessionStatus?.toUpperCase() !== 'SCHEDULED') {
      addToast('error', 'Cannot Delete', 'Only scheduled sessions can be deleted');
      return;
    }

    // Open delete confirmation modal
    setDeleteModal({
      isOpen: true,
      sessionId,
      sessionStatus,
      patientName
    });
  };

  // Confirm and execute deletion
  const confirmDeleteSession = async () => {
    try {
      // Use the hook's deleteSession which already handles toast notifications
      await deleteSession(deleteModal.sessionId);
      // Close modal
      setDeleteModal({ isOpen: false, sessionId: null, sessionStatus: null, patientName: '' });
    } catch (error) {
      console.error('Delete session error:', error);
      // Error toast is already handled by the deleteSession function
      // Close modal even on error
      setDeleteModal({ isOpen: false, sessionId: null, sessionStatus: null, patientName: '' });
    }
  };

  // Cancel deletion
  const cancelDeleteSession = () => {
    setDeleteModal({ isOpen: false, sessionId: null, sessionStatus: null, patientName: '' });
  };

  // Filter sessions based on all filter criteria
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => {
        const status = s.status?.toLowerCase();
        if (statusFilter === 'scheduled') return status === 'scheduled';
        if (statusFilter === 'in_progress') return status === 'in_progress';
        if (statusFilter === 'completed') return status === 'completed';
        return true;
      });
    }

    // Details filter
    if (detailsFilter !== 'all') {
      filtered = filtered.filter(s => {
        const hasDetails = s.actualStartTime || s.preWeight || s.postWeight;
        if (detailsFilter === 'has_details') return hasDetails;
        if (detailsFilter === 'no_details') return !hasDetails;
        return true;
      });
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(s => {
        const sessionDate = new Date(s.scheduledDate);

        if (dateFilter === 'today') {
          return sessionDate >= today && sessionDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        }
        if (dateFilter === 'this_week') {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          return sessionDate >= weekStart;
        }
        if (dateFilter === 'this_month') {
          return sessionDate.getMonth() === now.getMonth() && sessionDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.patientName?.toLowerCase().includes(query) ||
        s.patientNationalId?.toLowerCase().includes(query) ||
        s.sessionId?.toLowerCase().includes(query)
      );
    }

    // Sort sessions: Non-completed sessions first, then completed
    filtered = filtered.sort((a, b) => {
      // Define status priority (lower number = higher priority)
      const getStatusPriority = (status) => {
        const statusUpper = status?.toUpperCase();
        switch (statusUpper) {
          case 'IN_PROGRESS': return 1;
          case 'SCHEDULED': return 2;
          case 'NO_SHOW': return 3;
          case 'CANCELLED': return 4;
          case 'COMPLETED': return 5;
          default: return 6;
        }
      };

      const aPriority = getStatusPriority(a.status);
      const bPriority = getStatusPriority(b.status);

      // First sort by status priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // If same status, sort by scheduled date (newest first)
      const dateA = new Date(a.scheduledDate);
      const dateB = new Date(b.scheduledDate);
      return dateB - dateA;
    });

    return filtered;
  }, [sessions, statusFilter, detailsFilter, dateFilter, searchQuery]);

  // Calculate pagination
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSessions.slice(startIndex, endIndex);
  }, [filteredSessions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, detailsFilter, dateFilter, searchQuery]);

  // Calculate dashboard statistics
  const dialysisStats = useMemo(() => {
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(s =>
      new Date(s.scheduledDate).toDateString() === today
    );

    const totalPatients = new Set(sessions.map(s => s.patientId)).size;
    const presentToday = todaySessions.filter(s => s.attendance === 'present').length;

    const completedSessions = todaySessions.filter(s => s.status === 'completed').length;
    const inProgressSessions = todaySessions.filter(s => s.status === 'in_progress').length;

    return {
      totalPatients,
      todaySessions: todaySessions.length,
      presentToday,
      completedSessions,
      inProgressSessions,
      attendanceRate: todaySessions.length > 0 ?
        Math.round((presentToday / todaySessions.length) * 100) : 0
    };
  }, [sessions]);

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity, description: 'Dashboard & Stats' },
    { id: 'attendance', label: 'Schedule Session', icon: Users, description: 'Schedule & Manage Sessions' },
    { id: 'sessions', label: 'Session Details', icon: Activity, description: 'Add Session Data' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Data Visualization' },
    { id: 'reports', label: 'Reports', icon: FileText, description: 'Generate Reports' }
  ];

  // Handle session actions
  const handleSessionDetailsSubmit = async (sessionId, details) => {
    try {
      // addSessionDetails already shows toast notifications
      await addSessionDetails(sessionId, details);
      setShowSessionDetails(false);
      setSelectedSession(null);
    } catch {
      // Error toast is already handled by addSessionDetails
    }
  };

  const handleScheduleSession = async (sessionData) => {
    try {
      // Enhanced logging for conflict-free scheduling
      console.log('🏥 Scheduling dialysis session with conflict prevention:', sessionData);
      
      // createSession already shows toast notifications
      const newSession = await createSession(sessionData);
      
      // Enhanced success message with machine blocking info
      addToast(
        'success', 
        'Session Scheduled Successfully', 
        `${sessionData.patientName} scheduled on ${sessionData.machineId} from ${sessionData.startTime} to ${sessionData.endTime}. Machine is now blocked for this time period.`
      );
      
      console.log('✅ Session created successfully:', {
        sessionId: newSession?.sessionId,
        machine: sessionData.machineId,
        timeBlocked: `${sessionData.scheduledDate} ${sessionData.startTime} - ${sessionData.endTime}`,
        patient: sessionData.patientName,
        conflictPrevention: 'Active'
      });
      
      return newSession;
    } catch (error) {
      console.error('❌ Failed to schedule session:', error);
      
      // Enhanced error handling for conflicts
      if (error.response?.status === 409) { // Conflict status code
        addToast('error', 'Scheduling Conflict', 'Machine is no longer available for this time slot. Please refresh and try again.');
      } else {
        // Error toast is already handled by createSession
      }
      throw error;
    }
  };

  const handleRefreshPatients = async () => {
    try {
      addToast('info', 'Refreshing...', 'Loading latest patient data from Ward Management');
      
      // First try WebSocket real-time update
      if (wsConnected && requestDialysisUpdate) {
        requestDialysisUpdate();
        addToast('success', 'Real-time Update', 'Requested live data from WebSocket');
      }
      
      // Also fetch via API as backup
      await fetchDialysisPatients();
    } catch (error) {
      console.error('Failed to refresh patients:', error);
    }
  };



  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* API Integration Status */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Ward Transfer Integration
                    </h3>
                    <p className="text-sm text-gray-600">
                      Real-time connection with Ward Management system
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-green-700">
                  <div className={`w-2 h-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'} rounded-full`}></div>
                  <span className="text-sm font-medium">{wsConnected ? 'Live' : 'Disconnected'}</span>
                  {wsError && <span className="text-xs text-red-600">({wsError})</span>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Transferred Patients</p>
                      <p className="text-2xl font-bold text-gray-900">{dialysisPatients.length + (wsTransferredPatients?.length || 0)}</p>
                    </div>
                    <UserPlus className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">From Ward Management</p>
                  {wsNotifications?.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{wsNotifications.length} real-time updates</p>
                  )}
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">{sessions.filter(s => s.transferredFrom).length}</p>
                    </div>
                    <Droplet className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Generated from transfers</p>
                </div>
              </div>
              
              <button
                onClick={handleRefreshPatients}
                disabled={patientsLoading}
                className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {patientsLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {patientsLoading ? 'Syncing with Ward Management...' : 'Refresh Patient Data'}
              </button>
            </div>

            {/* Real-time Notifications Panel */}
            {wsNotifications && wsNotifications.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserPlus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Real-time Transfer Notifications
                      </h3>
                      <p className="text-sm text-gray-600">
                        Latest patient transfers and updates
                      </p>
                    </div>
                  </div>
                  <div className="text-blue-700 text-sm font-medium">
                    {wsNotifications.length} notification{wsNotifications.length !== 1 ? 's' : ''}
                  </div>
                </div>
                
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {wsNotifications.slice(0, 5).map((notification) => (
                    <div key={notification.id} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.message}
                          </p>
                          {notification.transfer && (
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.transfer.patientName} • Bed {notification.transfer.toBedNumber}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Patients</p>
                    <p className="text-2xl font-bold text-gray-900">{dialysisStats.totalPatients}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-green-600 text-sm font-medium">
                    +{dialysisPatients.length + (wsTransferredPatients?.length || 0)} from transfers
                  </span>
                  {wsConnected && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      Real-time
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">{dialysisStats.todaySessions}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-blue-600 text-sm font-medium">
                    {dialysisStats.inProgressSessions} in progress
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">{dialysisStats.completedSessions}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-full">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-green-600 text-sm font-medium">
                    Today
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{dialysisStats.attendanceRate}%</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-full">
                    <Droplet className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-gray-600 text-sm font-medium">
                    Today
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <div className="space-y-6">
            {/* Real-time Patient Transfer Status */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Schedule Dialysis Sessions
                    </h3>
                    <p className="text-sm text-gray-600">
                      Real-time integration with Ward Management - Manually schedule dialysis sessions for transferred patients
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'} rounded-full`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {wsConnected ? 'Live Connection' : 'Disconnected'}
                  </span>
                </div>
              </div>
              
              {dialysisPatients.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-purple-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dialysisPatients.length}</p>
                        <p className="text-xs text-gray-600">Patients Transferred</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-center">
                      <Activity className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {sessions.filter(s => s.status === 'scheduled').length}
                        </p>
                        <p className="text-xs text-gray-600">Manually Scheduled</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-orange-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {Math.max(0, dialysisPatients.length - sessions.filter(s => s.status === 'scheduled').length)}
                        </p>
                        <p className="text-xs text-gray-600">Awaiting Schedule</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <SessionScheduler
              dialysisPatients={dialysisPatients}
              existingSessions={sessions}
              loading={patientsLoading}
              onScheduleSession={handleScheduleSession}
              getMachinesWithAvailability={getMachinesWithAvailability}
            />
          </div>
        );
      case 'sessions':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Session Details Management</h3>
                  <p className="text-sm text-gray-600 mt-1">Add and manage detailed session information</p>
                  <p className="text-xs text-blue-600 mt-1 flex items-center">
                    <Activity className="w-3 h-3 mr-1" />
                    Non-completed sessions appear first
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {filteredSessions.length} of {sessions.length} sessions
                  </span>
                  {filteredSessions.length > 0 && (
                    <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      Page {currentPage} of {totalPages}
                    </span>
                  )}
                </div>
              </div>

              {/* Filters Section */}
              <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by patient name, ID, or session ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filter Row */}
                <div className="flex items-center space-x-3">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option key="all" value="all">All Status</option>
                    <option key="scheduled" value="scheduled">Scheduled</option>
                    <option key="in_progress" value="in_progress">In Progress</option>
                    <option key="completed" value="completed">Completed</option>
                  </select>

                  {/* Details Filter */}
                  <select
                    value={detailsFilter}
                    onChange={(e) => setDetailsFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option key="all-details" value="all">All Details</option>
                    <option key="has_details" value="has_details">Has Details</option>
                    <option key="no_details" value="no_details">No Details</option>
                  </select>

                  {/* Date Filter */}
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option key="all-time" value="all">All Time</option>
                    <option key="today" value="today">Today</option>
                    <option key="this_week" value="this_week">This Week</option>
                    <option key="this_month" value="this_month">This Month</option>
                  </select>

                  {/* Clear Filters Button */}
                  {(statusFilter !== 'all' || detailsFilter !== 'all' || dateFilter !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setDetailsFilter('all');
                        setDateFilter('all');
                        setSearchQuery('');
                      }}
                      className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Sessions List */}
              {paginatedSessions.length > 0 ? (
                <>
                  <div className="divide-y divide-gray-100">
                    {paginatedSessions.map((session) => {
                    const hasDetails = session.actualStartTime || session.preWeight || session.postWeight;
                    const isCompleted = session.status === 'COMPLETED' || session.status === 'completed';

                    return (
                      <div
                        key={session.sessionId}
                        className="py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {session.patientName?.split(' ').map(n => n[0]).join('') || 'P'}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{session.patientName}</h4>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span>ID: {session.patientNationalId}</span>
                                  <span>•</span>
                                  <span>{new Date(session.scheduledDate).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>{session.startTime} - {session.endTime}</span>
                                  <span>•</span>
                                  <span>Machine: {session.machineName || session.machineId}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {/* Status Badge */}
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isCompleted
                                ? 'bg-green-100 text-green-700'
                                : session.status === 'IN_PROGRESS' || session.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {session.status}
                            </span>

                            {/* Details Status */}
                            {hasDetails ? (
                              <span className="flex items-center text-xs text-green-600">
                                <Activity className="w-4 h-4 mr-1" />
                                Details Added
                              </span>
                            ) : (
                              <span className="flex items-center text-xs text-orange-600">
                                <Clock className="w-4 h-4 mr-1" />
                                No Details
                              </span>
                            )}

                            {/* Delete Button - Only for Scheduled Sessions */}
                            {session.status?.toUpperCase() === 'SCHEDULED' && (
                              <button
                                onClick={() => handleDeleteSession(session.sessionId, session.status, session.patientName)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                                title="Delete Scheduled Session"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            )}

                            {/* Download Report Button - Only for Completed Sessions */}
                            {isCompleted && (
                              <button
                                onClick={() => handleDownloadReport(session.sessionId)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                                title="Download Session Report"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download Report</span>
                              </button>
                            )}

                            {/* Action Button - Only for non-completed sessions */}
                            {!isCompleted && (
                              <button
                                onClick={() => {
                                  setSelectedSession(session);
                                  setShowSessionDetails(true);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                              >
                                <FileText className="w-4 h-4" />
                                <span>{hasDetails ? 'Edit Details' : 'Add Details'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Show summary if details exist */}
                        {hasDetails && (
                          <div className="mt-3 ml-13 bg-gray-50 rounded-lg p-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              {session.actualStartTime && (
                                <div>
                                  <span className="text-gray-600">Actual Time:</span>
                                  <span className="ml-1 font-medium">{session.actualStartTime} - {session.actualEndTime}</span>
                                </div>
                              )}
                              {session.preWeight && (
                                <div>
                                  <span className="text-gray-600">Pre Weight:</span>
                                  <span className="ml-1 font-medium">{session.preWeight} kg</span>
                                </div>
                              )}
                              {session.postWeight && (
                                <div>
                                  <span className="text-gray-600">Post Weight:</span>
                                  <span className="ml-1 font-medium">{session.postWeight} kg</span>
                                </div>
                              )}
                              {session.fluidRemoval && (
                                <div>
                                  <span className="text-gray-600">Fluid Removed:</span>
                                  <span className="ml-1 font-medium">{session.fluidRemoval} ml</span>
                                </div>
                              )}
                              {session.preBloodPressure && (
                                <div>
                                  <span className="text-gray-600">Pre BP:</span>
                                  <span className="ml-1 font-medium">{session.preBloodPressure}</span>
                                </div>
                              )}
                              {session.postBloodPressure && (
                                <div>
                                  <span className="text-gray-600">Post BP:</span>
                                  <span className="ml-1 font-medium">{session.postBloodPressure}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Pagination Controls */}
                  {filteredSessions.length > 0 && (
                    <div className="mt-6 flex items-center justify-between border-t pt-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">Show</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option key="5" value={5}>5</option>
                          <option key="10" value={10}>10</option>
                          <option key="20" value={20}>20</option>
                          <option key="50" value={50}>50</option>
                        </select>
                        <span className="text-sm text-gray-700">
                          of {filteredSessions.length} sessions
                        </span>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center space-x-2">
                          {/* Previous Button */}
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Previous</span>
                          </button>

                          {/* Page Numbers */}
                          <div className="flex items-center space-x-1">
                            {(() => {
                              const pages = [];
                              const maxVisiblePages = 5;
                              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                              
                              if (endPage - startPage + 1 < maxVisiblePages) {
                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                              }

                              // Add first page and ellipsis if needed
                              if (startPage > 1) {
                                pages.push(
                                  <button
                                    key={1}
                                    onClick={() => setCurrentPage(1)}
                                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                  >
                                    1
                                  </button>
                                );
                                if (startPage > 2) {
                                  pages.push(
                                    <span key="ellipsis1" className="px-2 text-gray-500">
                                      ...
                                    </span>
                                  );
                                }
                              }

                              // Add visible page numbers
                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <button
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    className={`px-3 py-2 text-sm font-medium rounded-lg ${
                                      currentPage === i
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {i}
                                  </button>
                                );
                              }

                              // Add last page and ellipsis if needed
                              if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                  pages.push(
                                    <span key="ellipsis2" className="px-2 text-gray-500">
                                      ...
                                    </span>
                                  );
                                }
                                pages.push(
                                  <button
                                    key={totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                  >
                                    {totalPages}
                                  </button>
                                );
                              }

                              return pages;
                            })()}
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Page Info */}
                      <div className="text-sm text-gray-700">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSessions.length)} of {filteredSessions.length} sessions
                      </div>
                    </div>
                  )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {sessions.length === 0 ? 'No Sessions Available' : 'No Sessions Match Filters'}
                  </h3>
                  <p className="text-gray-600">
                    {sessions.length === 0
                      ? 'Schedule sessions from the "Schedule Session" tab'
                      : 'Try adjusting your filters or search criteria'
                    }
                  </p>
                  {sessions.length > 0 && (
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setDetailsFilter('all');
                        setDateFilter('all');
                        setSearchQuery('');
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'analytics':
        return <DialysisAnalytics />;
      case 'reports':
        return (
          <ReportsModule
            sessions={sessions}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <DialysisHeader stats={dialysisStats} />

      {/* Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={18} />
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className={`text-xs ${
                    activeTab === tab.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {/* Modals */}
      <SessionDetailsModal
        isOpen={showSessionDetails}
        onClose={() => {
          setShowSessionDetails(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
        onSubmit={handleSessionDetailsSubmit}
      />

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={cancelDeleteSession}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete the scheduled dialysis session for:
                </p>
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-red-500">
                  <p className="font-semibold text-gray-900">{deleteModal.patientName}</p>
                  <p className="text-sm text-gray-600">Status: {deleteModal.sessionStatus}</p>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Warning</p>
                    <p className="text-sm text-amber-700">
                      This will permanently remove the session from the system. The patient will need to reschedule if dialysis is still required.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={cancelDeleteSession}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSession}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}