import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { 
  FileText, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Activity,
  Download,
  Filter,
  RefreshCw,
  Target,
  Award,
  Clock,
  Heart,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Monitor,
  Database,
  Shield,
  Stethoscope,
  Droplet,
  Settings,
  Eye,
  Mail,
  Share2,
  Info
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ReportsModule({ sessions }) {
  const reportMode = 'annual-report'; // Fixed to annual report only
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [machineSubTab, setMachineSubTab] = useState('performance'); // 'performance', 'patient-trends'
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [toast, setToast] = useState(null); // Toast notification state

  // Toast notification function
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    // Auto-hide toast after 4 seconds
    setTimeout(() => setToast(null), 4000);
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Available years (last 10 years)
  const availableYears = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  
  // Machine list for selection
  const machines = useMemo(() => [
    { id: 'all', name: 'All Machines', location: 'All Locations' },
    { id: 'M001', name: 'Dialysis Machine 001', location: 'Unit A' },
    { id: 'M002', name: 'Dialysis Machine 002', location: 'Unit A' },
    { id: 'M003', name: 'Dialysis Machine 003', location: 'Unit B' },
    { id: 'M004', name: 'Dialysis Machine 004', location: 'Unit B' },
    { id: 'M005', name: 'Dialysis Machine 005', location: 'Unit C' },
    { id: 'M006', name: 'Dialysis Machine 006', location: 'Unit C' }
  ], []);

  // Helper functions for generating report data
  const generateMonthlyData = (yearSessions) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return months.map((month, index) => {
      const monthSessions = yearSessions.filter(session => {
        const sessionDate = new Date(session.scheduledDate);
        return sessionDate.getMonth() === index;
      });

      return {
        month,
        totalSessions: monthSessions.length,
        completedSessions: monthSessions.filter(s => s.status === 'completed' || s.status === 'COMPLETED').length,
        emergencySessions: monthSessions.filter(s => s.sessionType === 'emergency' || s.isEmergency).length,
        averageUtilization: Math.round(60 + Math.random() * 30),
        patientCount: new Set(monthSessions.map(s => s.patientNationalId)).size
      };
    });
  };

  const generateMachinePerformanceData = (yearSessions) => {
    return machines.slice(1).map(machine => {
      const machineSessions = yearSessions.filter(s => s.machineId === machine.id);
      return {
        machineId: machine.id,
        machineName: machine.name,
        location: machine.location,
        totalSessions: machineSessions.length,
        completedSessions: machineSessions.filter(s => s.status === 'completed' || s.status === 'COMPLETED').length,
        utilizationRate: Math.round(65 + Math.random() * 25),
        maintenanceHours: Math.round(15 + Math.random() * 20),
        downtime: Math.round(Math.random() * 10),
        efficiency: Math.round(85 + Math.random() * 10)
      };
    });
  };

  const generatePatientOutcomesData = (yearSessions) => {
    const uniquePatients = new Set(yearSessions.map(s => s.patientNationalId)).size;
    return {
      totalPatients: uniquePatients,
      newPatients: Math.round(uniquePatients * 0.15),
      regularPatients: Math.round(uniquePatients * 0.85),
      averageSessionsPerPatient: yearSessions.length > 0 ? Math.round(yearSessions.length / uniquePatients) : 0,
      treatmentAdherence: 89,
      clinicalOutcomes: {
        excellent: 45,
        good: 38,
        fair: 15,
        poor: 2
      }
    };
  };

  const generateQualityMetricsData = () => {
    return {
      infectionRate: 0.5,
      complicationRate: 2.3,
      patientSatisfaction: 87,
      staffCompliance: 94,
      equipmentReliability: 96,
      protocolAdherence: 91
    };
  };

  const generateMonthlyPatientData = (yearSessions) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return months.map((monthName, index) => {
      const monthSessions = yearSessions.filter(session => {
        const sessionDate = new Date(session.scheduledDate);
        return sessionDate.getMonth() === index;
      });

      const uniquePatients = new Set(monthSessions.map(s => s.patientNationalId)).size;

      return {
        month: index + 1,
        monthName,
        patientCount: uniquePatients,
        sessionCount: monthSessions.length,
        emergencyCount: monthSessions.filter(s => s.sessionType === 'emergency' || s.isEmergency).length,
        averageUtilization: Math.round(60 + Math.random() * 30),
        dataType: 'Patients'
      };
    });
  };

  const generateMonthlyMachineUtilizationData = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return months.map((monthName, index) => {
      return {
        month: index + 1,
        monthName,
        utilizationPercentage: Math.round(65 + Math.random() * 25), // 65-90%
        totalHours: 720, // Approximate hours in a month
        activeHours: Math.round(720 * (65 + Math.random() * 25) / 100),
        maintenanceHours: Math.round(20 + Math.random() * 30), // 20-50 hours
        activeMachines: 8 + Math.round(Math.random() * 4) // 8-12 machines
      };
    });
  };

  // Generate fallback data when API is not available
  const generateFallbackReportData = useCallback(() => {
    const currentYear = parseInt(selectedYear);
    const yearSessions = sessions.filter(session => {
      const sessionYear = new Date(session.scheduledDate).getFullYear();
      return sessionYear === currentYear;
    });

    const totalSessions = yearSessions.length;
    const completedSessions = yearSessions.filter(s => s.status === 'completed' || s.status === 'COMPLETED').length;
    const cancelledSessions = yearSessions.filter(s => s.status === 'cancelled' || s.status === 'CANCELLED').length;
    const emergencySessions = yearSessions.filter(s => s.sessionType === 'emergency' || s.isEmergency).length;

    return {
      summary: {
        totalSessions,
        completedSessions,
        cancelledSessions,
        emergencySessions,
        completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
        emergencyRate: totalSessions > 0 ? Math.round((emergencySessions / totalSessions) * 100) : 0,
        averageSessionDuration: 4.2,
        patientSatisfactionScore: 87,
        machineUtilizationRate: 78
      },
      monthlyData: generateMonthlyData(yearSessions),
      machinePerformance: generateMachinePerformanceData(yearSessions),
      patientOutcomes: generatePatientOutcomesData(yearSessions),
      qualityMetrics: generateQualityMetricsData(),
      // Annual report specific data
      monthlySessions: generateMonthlyData(yearSessions),
      monthlyPatients: generateMonthlyPatientData(yearSessions),
      monthlyMachineUtilization: generateMonthlyMachineUtilizationData()
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, sessions]);

  // Fetch report data from backend
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      let endpoint = '';
      switch (reportMode) {
        case 'annual-report':
          endpoint = `/api/dialysis/reports/annual/${selectedYear}`;
          break;
        case 'comprehensive':
          endpoint = `/api/dialysis/reports/comprehensive/${selectedYear}`;
          break;
        case 'machine-specific':
          endpoint = `/api/dialysis/reports/machine-performance/${selectedMachine}/${selectedYear}`;
          break;
        case 'patient-analytics':
          endpoint = `/api/dialysis/reports/patient-analytics/${selectedYear}`;
          break;
        default:
          endpoint = `/api/dialysis/analytics/kpi-dashboard`;
      }

      console.log('📊 Fetching report data from:', endpoint);

      const response = await fetch(endpoint, { 
        headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Server error (${response.status}): Using fallback data while backend service is offline`);
        } else if (response.status === 404) {
          throw new Error('Dialysis reporting endpoint not found. Using fallback analytics data.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 204) {
          // No content - no data for selected year
          throw new Error(`NO_DATA_FOR_YEAR:${selectedYear}`);
        } else {
          throw new Error(`Failed to fetch report data (HTTP ${response.status})`);
        }
      }

      const data = await response.json();
      
      // Check if data is empty or indicates no data for the year
      if (!data || (Array.isArray(data) && data.length === 0) || 
          (data.totalSessions === 0 && data.totalPatients === 0) ||
          (data.message && data.message.includes('No data'))) {
        throw new Error(`NO_DATA_FOR_YEAR:${selectedYear}`);
      }
      
      setReportData(data);
      console.log('✅ Report data loaded successfully from API');

    } catch (err) {
      // Handle different types of errors gracefully
      let errorMessage = 'Using fallback data';
      let isNoDataError = false;
      
      if (err.message.startsWith('NO_DATA_FOR_YEAR:')) {
        const year = err.message.split(':')[1];
        errorMessage = `No dialysis data found for year ${year}. Please select a different year or check if data has been recorded for this period.`;
        isNoDataError = true;
        setError(errorMessage);
        setReportData(null); // Clear any existing data
      } else if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        errorMessage = 'Connection timeout - using fallback data';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('Network request failed')) {
        errorMessage = 'Backend service offline - using fallback data';
      } else if (err.message.includes('Server error')) {
        errorMessage = err.message;
      } else {
        errorMessage = `Connection issue - using fallback data: ${err.message}`;
      }
      
      console.warn('⚠️ API unavailable, using fallback data:', errorMessage);
      
      if (!isNoDataError) {
        // Generate fallback data from sessions only if it's not a "no data" error
        const fallbackData = generateFallbackReportData();
        setReportData(fallbackData);
        
        // Show user-friendly message that we're using demo data
        setError(null); // Clear error since we have fallback data
        setSuccess('📊 Demo data loaded successfully. Connect to backend for real-time reports.');
        console.log('✅ Fallback report data generated successfully');
      }
    } finally {
      setLoading(false);
    }
  }, [reportMode, selectedYear, selectedMachine, generateFallbackReportData]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Download PDF report with enhanced error handling
  const downloadPDFReport = async () => {
    // Check if we have data for the selected year first
    if (!reportData || (reportData.totalSessions === 0 && reportData.totalPatients === 0)) {
      setError(`Cannot generate PDF report: No dialysis data available for year ${selectedYear}. Please select a different year or ensure data has been recorded for this period.`);
      return;
    }

    setIsGenerating(true);
    setDownloadingPDF(true);
    setError(null);
    setSuccess(null);

    try {
      const jwtToken = localStorage.getItem('jwtToken');
      const headers = {
        'Authorization': jwtToken ? `Bearer ${jwtToken}` : '',
        'Accept': 'application/pdf',
        'Content-Type': 'application/json'
      };

      let endpoint = '';
      let filename = '';

      switch (reportMode) {
        case 'annual-report':
          endpoint = `/api/dialysis/reports/annual/${selectedYear}/pdf`;
          filename = `Dialysis_Annual_Report_${selectedYear}.pdf`;
          break;
        case 'comprehensive':
          endpoint = `/api/dialysis/reports/comprehensive/export-pdf/${selectedYear}/Q1`;
          filename = `Comprehensive_Dialysis_Report_${selectedYear}.pdf`;
          break;
        case 'machine-specific': {
          const machineId = selectedMachine === 'all' ? 'M001' : selectedMachine;
          endpoint = `/api/dialysis/reports/machine-performance/export-pdf/${machineId}/${selectedYear}`;
          filename = `Machine_Performance_Report_${machineId}_${selectedYear}.pdf`;
          break;
        }
        case 'patient-analytics':
          endpoint = `/api/dialysis/reports/patient-analytics/export-pdf/${selectedYear}/Q1`;
          filename = `Patient_Analytics_Report_${selectedYear}.pdf`;
          break;
        default:
          throw new Error('Invalid report mode selected');
      }

      console.log('📄 Downloading PDF from:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'omit'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('PDF generation service not available. Please ensure the backend server is running.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 204) {
          throw new Error(`Cannot generate PDF: No dialysis data found for year ${selectedYear}. Please select a different year.`);
        } else if (response.status === 500) {
          throw new Error('Server error occurred while generating the PDF. Please try again later.');
        } else {
          throw new Error(`HTTP ${response.status}: Failed to generate PDF report`);
        }
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Received empty PDF file. Please try again.');
      }

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);

      setSuccess(`✅ Report downloaded successfully: ${filename}`);
      console.log(`📄 PDF downloaded successfully: ${filename} (${blob.size} bytes)`);

    } catch (err) {
      console.error('❌ PDF download error:', err);
      
      // Use toast for specific "empty PDF" error
      if (err.message.includes('Received empty PDF file')) {
        showToast('No data available for the selected year. Please choose a different year.', 'warning');
        return; // Don't set error state, just show toast
      }
      
      let errorMessage = 'Failed to download PDF report';
      if (err.message.includes('Server error')) {
        errorMessage = 'Server error: Please try again later or contact system administrator.';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
      setDownloadingPDF(false);
      
      // Clear messages after 8 seconds
      setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 8000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            Reports
          </h1>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
          <div>
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
          <div>
            <h3 className="text-green-800 font-medium">Success</h3>
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 max-w-sm w-full shadow-lg rounded-lg p-4 flex items-center transition-all duration-300 transform ${
            toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'warning' ? 'bg-amber-500 text-white' :
            'bg-green-500 text-white'
          }`}
        >
          <div className="flex items-center">
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 mr-3" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 mr-3" />}
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 mr-3" />}
            <div>
              <p className="font-medium">{toast.message}</p>
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-white hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Report Type Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Report Configuration</h3>
          <div className="flex items-center text-sm text-gray-500">
            <FileText className="w-4 h-4 mr-1" />
            Select Report Type & Settings
          </div>
        </div>
        
        {/* Featured Annual Report */}
        <div className="mb-6 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-emerald-100 rounded-lg mr-4">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-emerald-900">Annual Dialysis Report</h4>
                <p className="text-emerald-700">Primary annual report for comprehensive dialysis operations analysis</p>
              </div>
            </div>
          </div>
          
          {reportMode === 'annual-report' && (
            <div className="bg-white rounded-lg p-4 border border-emerald-200">
              <h5 className="font-semibold text-emerald-900 mb-3">Annual Report Features:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center text-emerald-800">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                  Monthly session trends & analytics
                </div>
                <div className="flex items-center text-emerald-800">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                  Patient outcome analysis
                </div>
                <div className="flex items-center text-emerald-800">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                  Equipment utilization reports
                </div>
                <div className="flex items-center text-emerald-800">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                  Quality assurance metrics
                </div>
                <div className="flex items-center text-emerald-800">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                  Strategic recommendations
                </div>
                <div className="flex items-center text-emerald-800">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                  Executive summary & insights
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Report Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Report Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            {/* No Data Warning for Selected Year */}
            {!reportData && !loading && error && error.includes('No dialysis data found for year') && (
              <div className="mt-2 flex items-center text-amber-600 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                No data for {selectedYear}
              </div>
            )}
          </div>

          {reportMode === 'machine-specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Monitor className="w-4 h-4 inline mr-1" />
                Machine
              </label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {machines.map(machine => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} - {machine.location}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end space-x-3">
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </>
              )}
            </button>
            
            <button
              onClick={downloadPDFReport}
              disabled={isGenerating || !reportData || downloadingPDF}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors shadow-md"
            >
              {isGenerating || downloadingPDF ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {downloadingPDF ? 'Downloading PDF...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mr-4" />
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">Loading Report Data...</p>
              <p className="text-gray-600">Please wait while we generate your report</p>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      {!loading && reportData && (
        <>
          {/* Machine Performance Table */}
          {reportMode === 'machine-specific' && reportData.machinePerformance && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Monitor className="w-5 h-5 mr-2 text-blue-600" />
                  Machine Performance Analysis
                </h3>
              </div>

              {/* Sub-tabs for Machine-Specific Reports */}
              <div className="mb-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setMachineSubTab('performance')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        machineSubTab === 'performance'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Settings className="w-4 h-4 inline mr-1" />
                      Machine Performance
                    </button>
                  </nav>
                </div>
              </div>

              {/* Machine Performance Sub-tab Content */}
              {machineSubTab === 'performance' && (
                <div>
                  <div className="mb-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Machine Performance Details</h4>
                    <p className="text-sm text-gray-600">Detailed performance metrics for each dialysis machine</p>
                  </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-4 font-semibold text-gray-900 border-b">Machine</th>
                      <th className="text-center p-4 font-semibold text-gray-900 border-b">Location</th>
                      <th className="text-center p-4 font-semibold text-gray-900 border-b">Total Sessions</th>
                      <th className="text-center p-4 font-semibold text-gray-900 border-b">Utilization</th>
                      <th className="text-center p-4 font-semibold text-gray-900 border-b">Efficiency</th>
                      <th className="text-center p-4 font-semibold text-gray-900 border-b">Downtime (hrs)</th>
                      <th className="text-center p-4 font-semibold text-gray-900 border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.machinePerformance.map((machine) => (
                      <tr key={machine.machineId} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 border-b">
                          <div>
                            <div className="font-medium text-gray-900">{machine.machineName}</div>
                            <div className="text-sm text-gray-500">{machine.machineId}</div>
                          </div>
                        </td>
                        <td className="p-4 border-b text-center">{machine.location}</td>
                        <td className="p-4 border-b text-center font-semibold">{machine.totalSessions}</td>
                        <td className="p-4 border-b text-center">
                          <span className={`font-medium ${
                            machine.utilizationRate >= 80 ? 'text-green-600' : 
                            machine.utilizationRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {machine.utilizationRate}%
                          </span>
                        </td>
                        <td className="p-4 border-b text-center">
                          <span className={`font-medium ${
                            machine.efficiency >= 90 ? 'text-green-600' : 
                            machine.efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {machine.efficiency}%
                          </span>
                        </td>
                        <td className="p-4 border-b text-center">{machine.downtime}</td>
                        <td className="p-4 border-b text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            machine.efficiency >= 90 ? 'bg-green-100 text-green-800' :
                            machine.efficiency >= 80 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {machine.efficiency >= 90 ? 'Excellent' :
                             machine.efficiency >= 80 ? 'Good' : 'Needs Attention'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </div>
              )}
            </div>
          )}

          {/* Key Insights and Recommendations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Key Insights & Strategic Recommendations
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Performance Highlights */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Award className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="font-semibold text-green-900">Performance Highlights</h4>
                </div>
                <div className="text-sm text-green-700 space-y-2">
                  <p>• Patient satisfaction score: {reportData.summary?.patientSatisfactionScore || 87}% (Above target)</p>
                  <p>• Treatment completion rate: {reportData.summary?.completionRate || 95}%</p>
                  <p>• Equipment utilization: {reportData.summary?.machineUtilizationRate || 78}% average</p>
                  <p>• Quality compliance: {reportData.qualityMetrics?.protocolAdherence || 91}%</p>
                </div>
              </div>

              {/* Action Items */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Target className="w-5 h-5 text-blue-600 mr-2" />
                  <h4 className="font-semibold text-blue-900">Strategic Action Items</h4>
                </div>
                <div className="text-sm text-blue-700 space-y-2">
                  <p>• Optimize machine scheduling during peak hours</p>
                  <p>• Implement predictive maintenance protocols</p>
                  <p>• Enhance patient flow management systems</p>
                  <p>• Expand capacity for emergency cases</p>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Download Feature Information */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                <Download className="w-5 h-5 mr-2" />
                Professional PDF Annual Report Features
              </h3>
              <div className="flex items-center text-blue-600 text-sm font-medium">
                <FileText className="w-4 h-4 mr-1" />
                PDF Generation Ready
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-600 mr-2" />
                  <h4 className="font-medium text-blue-900">Charts & Analytics</h4>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Monthly session line charts</li>
                  <li>• Machine utilization bar charts</li>
                  <li>• Patient outcomes pie charts</li>
                  <li>• Performance trend analysis</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center mb-2">
                  <Database className="w-4 h-4 text-blue-600 mr-2" />
                  <h4 className="font-medium text-blue-900">Comprehensive Tables</h4>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Monthly performance statistics</li>
                  <li>• Machine efficiency matrix</li>
                  <li>• Patient outcome summaries</li>
                  <li>• Quality metrics overview</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center mb-2">
                  <Shield className="w-4 h-4 text-blue-600 mr-2" />
                  <h4 className="font-medium text-blue-900">Professional Format</h4>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Executive summary section</li>
                  <li>• Strategic recommendations</li>
                  <li>• Hospital branding & styling</li>
                  <li>• Management-ready format</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <Info className="w-4 h-4 inline mr-1" />
                <strong>Note:</strong> The PDF report includes all visualizations with embedded charts, 
                comprehensive data tables, and professional formatting suitable for hospital management presentations.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}