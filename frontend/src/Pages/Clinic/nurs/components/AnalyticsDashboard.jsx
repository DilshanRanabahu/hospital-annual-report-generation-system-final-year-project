import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, Stethoscope, RefreshCw, Eye, ChevronRight, Clock, CheckCircle, AlertCircle, XCircle, Search, X, FileText, Download } from 'lucide-react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import PatientStatsChart from './charts/PatientStatsChart';
import AppointmentAnalytics from './charts/AppointmentAnalytics';
import DoctorWorkloadChart from './charts/DoctorWorkloadChart';
import usePatients from '../hooks/usePatients';
import useDoctors from '../hooks/useDoctors';
import useAllAppointments from '../hooks/useAllAppointments';
import { chartColors, lineChartOptions } from '../utils/chartConfig';

const AnalyticsDashboard = () => {
  const [activeView, setActiveView] = useState('summary');
  const [refreshing, setRefreshing] = useState(false);
  const [_lastRefresh, setLastRefresh] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generatingReport, setGeneratingReport] = useState(false);

  // Data hooks
  const { patients, loading: patientsLoading, fetchPatients } = usePatients();
  const { doctors: _doctors, loading: doctorsLoading, fetchDoctors } = useDoctors();
  const { allAppointments, loading: appointmentsLoading, fetchAllAppointments } = useAllAppointments();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchPatients(),
        fetchDoctors(),
        fetchAllAppointments()
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPatients, fetchDoctors, fetchAllAppointments]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [handleRefresh]);

  // Generate comprehensive clinic report
  const generateComprehensiveReport = async () => {
    try {
      setGeneratingReport(true);

      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        console.error('No JWT token found');
        alert('Authentication required. Please log in again.');
        return;
      }

      const response = await axios.get(
        `/api/reports/comprehensive-clinic/full-report/${selectedYear}/pdf`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
          },
          responseType: 'blob', // Important for PDF download
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Set filename with current date and selected year
      const currentDate = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Comprehensive_Clinic_Report_${selectedYear}_Generated_${currentDate}.pdf`);

      // Append to body and click
      document.body.appendChild(link);

      console.log('Report downloaded successfully');

      link.click();

      // Clean up
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating report:', error);

      // Check if this is a client-side error after successful download
      if (error.code === 'ERR_BLOCKED_BY_CLIENT' || error.code === 'ERR_NETWORK') {
        // This often happens after successful download due to ad blockers or browser restrictions
        console.warn('Download may have completed despite error:', error.message);
        return;
      }

      let errorMessage = 'Failed to generate report. ';

      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to generate reports.';
      } else if (error.response?.status === 404) {
        errorMessage = `No data found for year ${selectedYear}. Please select a different year.`;
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        // Only show network error if it's not a post-download client error
        if (error.code !== 'ERR_BLOCKED_BY_CLIENT' && error.code !== 'ERR_NETWORK') {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          // Don't show error for these cases as download likely succeeded
          return;
        }
      }

      alert(errorMessage);
    } finally {
      setGeneratingReport(false);
    }
  };

  const isLoading = patientsLoading || doctorsLoading || appointmentsLoading;

  // Month-wise appointment chart data
  const monthlyAppointmentData = useMemo(() => {
    if (!allAppointments.length) return null;

    // Get last 12 months
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }

    // Group appointments by month
    const appointmentsByMonth = allAppointments.reduce((acc, apt) => {
      const monthKey = apt.appointmentDate.substring(0, 7); // YYYY-MM format
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(apt);
      return acc;
    }, {});

    // Create chart data
    const chartData = months.map(month => ({
      month: month.label,
      total: appointmentsByMonth[month.key]?.length || 0,
      completed: appointmentsByMonth[month.key]?.filter(apt => apt.status === 'COMPLETED').length || 0
    }));

    return {
      labels: chartData.map(d => d.month),
      datasets: [
        {
          label: 'Total Appointments',
          data: chartData.map(d => d.total),
          borderColor: chartColors.primary,
          backgroundColor: chartColors.backgrounds?.blue || 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: chartColors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
        {
          label: 'Completed Appointments',
          data: chartData.map(d => d.completed),
          borderColor: chartColors.success,
          backgroundColor: 'transparent',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: chartColors.success,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        }
      ]
    };
  }, [allAppointments]);

  // Doctor-wise appointment charts data (separate charts)
  const doctorChartsData = useMemo(() => {
    if (!allAppointments.length) return null;

    // Get last 6 months for better readability
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }

    // Group appointments by doctor and month
    const doctorData = {};
    allAppointments.forEach(apt => {
      const monthKey = apt.appointmentDate.substring(0, 7);
      const doctorName = apt.doctorName;
      const doctorSpecialization = apt.doctorSpecialization;

      if (!doctorData[doctorName]) {
        doctorData[doctorName] = {
          specialization: doctorSpecialization,
          months: {}
        };
      }
      if (!doctorData[doctorName].months[monthKey]) {
        doctorData[doctorName].months[monthKey] = {
          total: 0,
          completed: 0
        };
      }
      doctorData[doctorName].months[monthKey].total++;
      if (apt.status === 'COMPLETED') {
        doctorData[doctorName].months[monthKey].completed++;
      }
    });

    // Get top 6 doctors by total appointments
    const doctorTotals = Object.keys(doctorData).map(doctor => ({
      name: doctor,
      specialization: doctorData[doctor].specialization,
      total: Object.values(doctorData[doctor].months).reduce((sum, data) => sum + data.total, 0),
      completed: Object.values(doctorData[doctor].months).reduce((sum, data) => sum + data.completed, 0),
      data: doctorData[doctor]
    })).sort((a, b) => b.total - a.total).slice(0, 6);

    // Create individual chart data for each doctor
    const colors = [
      chartColors.primary,
      chartColors.success,
      chartColors.warning,
      chartColors.danger,
      chartColors.info,
      chartColors.purple || '#8B5CF6'
    ];

    return doctorTotals.map((doctor, index) => ({
      doctorName: doctor.name,
      specialization: doctor.specialization,
      totalAppointments: doctor.total,
      completedAppointments: doctor.completed,
      completionRate: doctor.total > 0 ? Math.round((doctor.completed / doctor.total) * 100) : 0,
      chartData: {
        labels: months.map(m => m.label),
        datasets: [
          {
            label: 'Total Appointments',
            data: months.map(month => doctor.data.months[month.key]?.total || 0),
            borderColor: colors[index],
            backgroundColor: colors[index] + '20',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: colors[index],
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
          },
          {
            label: 'Completed',
            data: months.map(month => doctor.data.months[month.key]?.completed || 0),
            borderColor: chartColors.success,
            backgroundColor: 'transparent',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: chartColors.success,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
          }
        ]
      }
    }));
  }, [allAppointments]);

  // Helper functions for status styling
  const getStatusColor = (status) => {
    const colors = {
      'COMPLETED': 'bg-green-100 text-green-800 border-green-200',
      'SCHEDULED': 'bg-blue-100 text-blue-800 border-blue-200',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
      'NO_SHOW': 'bg-gray-100 text-gray-800 border-gray-200',
      'CONFIRMED': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'COMPLETED': CheckCircle,
      'SCHEDULED': Calendar,
      'IN_PROGRESS': Clock,
      'CANCELLED': XCircle,
      'NO_SHOW': AlertCircle,
      'CONFIRMED': CheckCircle
    };
    return icons[status] || Clock;
  };

  const isUpcomingAppointment = (appointmentTime) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return appointmentTime > currentTime;
  };

  const isPastAppointment = (appointmentTime) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return appointmentTime < currentTime;
  };

  // Today's schedule data
  const todaySchedule = useMemo(() => {
    if (!allAppointments.length) return [];

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const todayAppointments = allAppointments
      .filter(apt => apt.appointmentDate === today)
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));

    return todayAppointments.map(apt => ({
      ...apt,
      timeSlot: apt.appointmentTime.substring(0, 5), // HH:MM format
      statusColor: getStatusColor(apt.status),
      statusIcon: getStatusIcon(apt.status),
      isUpcoming: isUpcomingAppointment(apt.appointmentTime),
      isPast: isPastAppointment(apt.appointmentTime)
    }));
  }, [allAppointments]);

  // Today's statistics
  const todayStats = useMemo(() => {
    if (!todaySchedule.length) return null;

    const completed = todaySchedule.filter(apt => apt.status === 'COMPLETED').length;
    const inProgress = todaySchedule.filter(apt => apt.status === 'IN_PROGRESS').length;
    const upcoming = todaySchedule.filter(apt => apt.isUpcoming && apt.status === 'SCHEDULED').length;
    const cancelled = todaySchedule.filter(apt => apt.status === 'CANCELLED').length;

    return {
      total: todaySchedule.length,
      completed,
      inProgress,
      upcoming,
      cancelled,
      completionRate: todaySchedule.length > 0 ? Math.round((completed / todaySchedule.length) * 100) : 0
    };
  }, [todaySchedule]);

  // Filtered today's schedule based on search term
  const filteredTodaySchedule = useMemo(() => {
    if (!searchTerm.trim()) return todaySchedule;

    const searchLower = searchTerm.toLowerCase().trim();
    return todaySchedule.filter(appointment =>
      appointment.patientName.toLowerCase().includes(searchLower) ||
      appointment.doctorName.toLowerCase().includes(searchLower) ||
      appointment.appointmentId.toString().includes(searchLower) ||
      appointment.patientNationalId.toString().includes(searchLower) ||
      appointment.doctorSpecialization.toLowerCase().includes(searchLower) ||
      appointment.status.toLowerCase().includes(searchLower)
    );
  }, [todaySchedule, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
          <p className="text-gray-600">Quick insights for today</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors w-fit"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={48} className="mx-auto mb-4 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Simple Chart Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setActiveView('summary')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'summary'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setActiveView('today')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'today'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today's Schedule
              </button>
              <button
                onClick={() => setActiveView('monthly')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'monthly'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monthly Trends
              </button>
              <button
                onClick={() => setActiveView('doctors')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'doctors'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Doctor Performance
              </button>
              <button
                onClick={() => setActiveView('patients')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'patients'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Patients
              </button>
              <button
                onClick={() => setActiveView('appointments')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'appointments'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Appointments
              </button>
              <button
                onClick={() => setActiveView('reports')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'reports'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Reports & Analytics
              </button>
            </div>

            {/* Content Area */}
            <div>
              {activeView === 'summary' && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Clinic Summary</h3>
                    <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900">Appointments</h4>
                        <p className="text-blue-700">• {allAppointments.length} total appointments</p>
                        <p className="text-blue-700">• {allAppointments.filter(apt => apt.appointmentDate === new Date().toISOString().split('T')[0]).length} scheduled for today</p>
                        <p className="text-blue-700">• {allAppointments.filter(apt => apt.status === 'COMPLETED').length} completed overall</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-900">Patients & Doctors</h4>
                        <p className="text-green-700">• {new Set(allAppointments.map(apt => apt.patientNationalId)).size} unique patients</p>
                        <p className="text-green-700">• {new Set(allAppointments.map(apt => apt.doctorEmployeeId)).size} active doctors</p>
                        <p className="text-green-700">• {new Set(allAppointments.map(apt => apt.doctorSpecialization)).size} specializations</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Recent Appointments</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {allAppointments
                        .sort((a, b) => new Date(b.appointmentDate + ' ' + b.appointmentTime) - new Date(a.appointmentDate + ' ' + a.appointmentTime))
                        .slice(0, 5)
                        .map(apt => (
                          <div key={apt.appointmentId} className="flex justify-between items-center py-2 px-3 bg-white rounded text-sm">
                            <span className="font-medium">{apt.patientName}</span>
                            <span className="text-gray-600">{apt.doctorName}</span>
                            <span className="text-gray-500">{apt.appointmentDate}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              apt.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              apt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              )}
              {activeView === 'today' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Today's Schedule</h3>
                    <p className="text-gray-600">Real-time appointment tracking - {new Date().toLocaleDateString()}</p>
                  </div>

                  {/* Today's Quick Stats */}
                  {todayStats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{todayStats.total}</div>
                        <div className="text-sm text-blue-700">Total Today</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{todayStats.completed}</div>
                        <div className="text-sm text-green-700">Completed</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{todayStats.inProgress}</div>
                        <div className="text-sm text-yellow-700">In Progress</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{todayStats.upcoming}</div>
                        <div className="text-sm text-purple-700">Upcoming</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{todayStats.cancelled}</div>
                        <div className="text-sm text-red-700">Cancelled</div>
                      </div>
                    </div>
                  )}

                  {/* Current Time Display */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white text-center mb-6">
                    <div className="text-2xl font-bold">
                      {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="text-blue-100">Current Time</div>
                  </div>

                  {/* Search Bar */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search appointments by patient, doctor, appointment ID, or status..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      {searchTerm && (
                        <div className="text-sm text-gray-600 whitespace-nowrap">
                          {filteredTodaySchedule.length} of {todaySchedule.length} appointments
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Appointments List */}
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900 flex items-center justify-between">
                        <div className="flex items-center">
                          <Calendar size={18} className="mr-2 text-blue-500" />
                          Today's Appointments
                          {searchTerm ? (
                            <span className="ml-2">
                              ({filteredTodaySchedule.length} of {todaySchedule.length})
                            </span>
                          ) : (
                            <span className="ml-2">({todaySchedule.length})</span>
                          )}
                        </div>
                        {searchTerm && (
                          <div className="text-sm text-gray-500">
                            Filtered by: "{searchTerm}"
                          </div>
                        )}
                      </h4>
                    </div>

                    {filteredTodaySchedule.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {todaySchedule.length === 0 ? (
                          <>
                            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No appointments scheduled for today</p>
                            <p className="text-sm">Check back later or view other dates</p>
                          </>
                        ) : (
                          <>
                            <Search size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No appointments match your search</p>
                            <p className="text-sm">Try adjusting your search terms</p>
                            <button
                              onClick={() => setSearchTerm('')}
                              className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Clear search
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredTodaySchedule.map((appointment) => {
                          const StatusIcon = appointment.statusIcon;
                          return (
                            <div
                              key={appointment.appointmentId}
                              className={`p-4 hover:bg-gray-50 transition-colors ${
                                appointment.isUpcoming ? 'bg-blue-25' : ''
                              } ${appointment.status === 'IN_PROGRESS' ? 'bg-yellow-25' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900">
                                      {appointment.timeSlot}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {appointment.isUpcoming ? 'Upcoming' : appointment.isPast ? 'Past' : 'Current'}
                                    </div>
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <h5 className="font-medium text-gray-900">{appointment.patientName}</h5>
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${appointment.statusColor}`}>
                                        <StatusIcon size={12} className="mr-1" />
                                        {appointment.status}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{appointment.doctorName}</p>
                                    <p className="text-xs text-gray-500">{appointment.doctorSpecialization}</p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-900">
                                    Apt #{appointment.appointmentId}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Patient ID: {appointment.patientNationalId}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Completion Progress */}
                  {todayStats && todayStats.total > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                      <h4 className="font-medium text-gray-900 mb-4">Today's Progress</h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Completion Rate</span>
                        <span className="text-sm font-medium text-gray-900">{todayStats.completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${todayStats.completionRate}%` }}
                        ></div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-green-600">{todayStats.completed}</div>
                          <div className="text-gray-600">Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-yellow-600">{todayStats.inProgress}</div>
                          <div className="text-gray-600">In Progress</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-blue-600">{todayStats.upcoming}</div>
                          <div className="text-gray-600">Upcoming</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-red-600">{todayStats.cancelled}</div>
                          <div className="text-gray-600">Cancelled</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeView === 'monthly' && monthlyAppointmentData && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Monthly Appointment Trends</h3>
                    <p className="text-gray-600">Patient appointments over the last 12 months</p>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="h-96">
                      <Line
                        data={monthlyAppointmentData}
                        options={{
                          ...lineChartOptions,
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Number of Appointments',
                                font: {
                                  size: 12,
                                  weight: 'bold'
                                }
                              },
                              grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Month',
                                font: {
                                  size: 12,
                                  weight: 'bold'
                                }
                              },
                              grid: {
                                display: false
                              }
                            }
                          },
                          plugins: {
                            legend: {
                              display: true,
                              position: 'top',
                              labels: {
                                usePointStyle: true,
                                padding: 20
                              }
                            },
                            title: {
                              display: true,
                              text: 'Monthly Appointment Trends',
                              font: {
                                size: 16,
                                weight: 'bold'
                              },
                              padding: 20
                            }
                          },
                          interaction: {
                            mode: 'index',
                            intersect: false,
                          },
                          hover: {
                            mode: 'nearest',
                            intersect: true
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Monthly Statistics Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Peak Month</h4>
                      <p className="text-blue-700 font-semibold">
                        {monthlyAppointmentData.labels[
                          monthlyAppointmentData.datasets[0].data.indexOf(
                            Math.max(...monthlyAppointmentData.datasets[0].data)
                          )
                        ] || 'N/A'}
                      </p>
                      <p className="text-blue-600 text-sm">
                        {Math.max(...monthlyAppointmentData.datasets[0].data)} appointments
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">Total This Year</h4>
                      <p className="text-green-700 font-semibold">
                        {monthlyAppointmentData.datasets[0].data.reduce((sum, val) => sum + val, 0)}
                      </p>
                      <p className="text-green-600 text-sm">appointments completed</p>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4">
                      <h4 className="font-medium text-orange-900 mb-2">Average per Month</h4>
                      <p className="text-orange-700 font-semibold">
                        {Math.round(
                          monthlyAppointmentData.datasets[0].data.reduce((sum, val) => sum + val, 0) /
                          monthlyAppointmentData.datasets[0].data.filter(val => val > 0).length
                        )}
                      </p>
                      <p className="text-orange-600 text-sm">appointments</p>
                    </div>
                  </div>
                </div>
              )}
              {activeView === 'doctors' && doctorChartsData && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Doctor Performance Analytics</h3>
                    <p className="text-gray-600">Individual performance charts for top 6 doctors (Last 6 months)</p>
                  </div>

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Most Active Doctor</h4>
                      <p className="text-blue-700 font-semibold">
                        {doctorChartsData.length > 0 ? doctorChartsData[0].doctorName : 'N/A'}
                      </p>
                      <p className="text-blue-600 text-sm">
                        {doctorChartsData.length > 0 ? doctorChartsData[0].totalAppointments + ' appointments' : '0 appointments'}
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">Total Doctors</h4>
                      <p className="text-green-700 font-semibold">
                        {new Set(allAppointments.map(apt => apt.doctorEmployeeId)).size}
                      </p>
                      <p className="text-green-600 text-sm">active in system</p>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4">
                      <h4 className="font-medium text-orange-900 mb-2">Avg Completion Rate</h4>
                      <p className="text-orange-700 font-semibold">
                        {doctorChartsData.length > 0
                          ? Math.round(doctorChartsData.reduce((sum, doc) => sum + doc.completionRate, 0) / doctorChartsData.length) + '%'
                          : '0%'
                        }
                      </p>
                      <p className="text-orange-600 text-sm">across top doctors</p>
                    </div>
                  </div>

                  {/* Individual Doctor Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {doctorChartsData.map((doctor, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="mb-4">
                          <h4 className="text-lg font-semibold text-gray-900">{doctor.doctorName}</h4>
                          <p className="text-sm text-gray-600 mb-2">{doctor.specialization}</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-blue-600">
                              <strong>{doctor.totalAppointments}</strong> total
                            </span>
                            <span className="text-green-600">
                              <strong>{doctor.completedAppointments}</strong> completed
                            </span>
                            <span className="text-purple-600">
                              <strong>{doctor.completionRate}%</strong> success rate
                            </span>
                          </div>
                        </div>

                        <div className="h-64">
                          <Line
                            data={doctor.chartData}
                            options={{
                              ...lineChartOptions,
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  title: {
                                    display: true,
                                    text: 'Appointments',
                                    font: { size: 10 }
                                  },
                                  grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                  }
                                },
                                x: {
                                  grid: {
                                    display: false
                                  }
                                }
                              },
                              plugins: {
                                legend: {
                                  display: true,
                                  position: 'top',
                                  labels: {
                                    usePointStyle: true,
                                    padding: 10,
                                    font: { size: 10 }
                                  }
                                },
                                title: {
                                  display: false
                                }
                              },
                              interaction: {
                                mode: 'index',
                                intersect: false,
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeView === 'patients' && (
                <PatientStatsChart patients={patients} appointments={allAppointments} />
              )}
              {activeView === 'appointments' && (
                <AppointmentAnalytics appointments={allAppointments} />
              )}
              {activeView === 'reports' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Comprehensive Clinic Reports</h3>
                    <p className="text-gray-600">Generate detailed annual reports for clinic operations and analytics</p>
                  </div>

                  {/* Report Generation Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-8">
                    <div className="max-w-md mx-auto">
                      <div className="text-center mb-6">
                        <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <FileText size={32} className="text-blue-600" />
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900 mb-2">Annual Clinic Report</h4>
                        <p className="text-gray-600 text-sm">
                          Generate a comprehensive PDF report containing all clinic data, analytics,
                          patient statistics, doctor performance, and appointment insights for the selected year.
                        </p>
                      </div>

                      {/* Year Selection */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Year
                        </label>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          disabled={generatingReport}
                        >
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Generate Button */}
                      <button
                        onClick={generateComprehensiveReport}
                        disabled={generatingReport}
                        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-lg transition-colors"
                      >
                        <Download size={20} className={generatingReport ? 'animate-pulse' : ''} />
                        <span>
                          {generatingReport ? 'Generating Report...' : `Generate ${selectedYear} Report`}
                        </span>
                      </button>

                      {generatingReport && (
                        <div className="mt-4 text-center">
                          <div className="inline-flex items-center text-sm text-gray-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                            Processing clinic data for {selectedYear}...
                          </div>
                        </div>
                      )}

                      {/* Report Info */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">Report Contents:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Patient registration and demographic data</li>
                          <li>• Appointment statistics and trends</li>
                          <li>• Doctor performance analytics</li>
                          <li>• Monthly and yearly comparisons</li>
                          <li>• Clinic operational insights</li>
                          <li>• Visual charts and graphs</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="bg-blue-100 rounded-full p-2">
                          <AlertCircle size={16} className="text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <h5 className="font-medium text-blue-900 mb-1">Important Notes</h5>
                        <div className="text-sm text-blue-800 space-y-1">
                          <p>• Reports are generated in PDF format and will download automatically</p>
                          <p>• Large datasets may take a few moments to process</p>
                          <p>• Ensure you have sufficient permissions to access clinic data</p>
                          <p>• Reports include sensitive patient information - handle with care</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;