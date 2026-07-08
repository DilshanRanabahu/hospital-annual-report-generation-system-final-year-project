import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
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
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Users, 
  Bed, 
  Activity,
  ArrowUpDown,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react';

// Import the new analytics hook
import useWardAnalytics from '../hooks/useWardAnalytics';

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

export default function WardAnalytics({ 
  showToast, // For displaying notifications
  timeRange: initialTimeRange = '7days' // Initial time range
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [patientAgeGroups, setPatientAgeGroups] = useState({});

  // Use the new analytics hook to fetch real data from APIs
  const {
    activeAdmissions,
    allAdmissions,
    wards,
    loading,
    refreshData,
    lastError
  } = useWardAnalytics(showToast);

  // Function to calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Function to get age group from age
  const getAgeGroup = (age) => {
    if (age < 18) return '0-17';
    if (age < 35) return '18-34';
    if (age < 55) return '35-54';
    if (age < 70) return '55-69';
    return '70+';
  };

  // Fetch patient age data
  const fetchPatientAgeData = useCallback(async () => {
    if (!activeAdmissions || activeAdmissions.length === 0) {
      setPatientAgeGroups({});
      return;
    }

    try {
      // Use the same token key as the hook
      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        console.warn('No JWT token found for patient API calls');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      };

      // Get unique patient national IDs
      const uniquePatientIds = [...new Set(activeAdmissions.map(admission => admission.patientNationalId))];
      
      console.log('Fetching patient details for age calculation:', {
        totalAdmissions: activeAdmissions.length,
        uniquePatients: uniquePatientIds.length,
        patientIds: uniquePatientIds
      });
      
      // Fetch patient details in batches
      const patientPromises = uniquePatientIds.map(async (nationalId) => {
        try {
          const response = await axios.get(`/api/patients/${nationalId}`, { headers });
          return response.data;
        } catch (error) {
          console.warn(`Failed to fetch patient ${nationalId}:`, error);
          return null;
        }
      });

      const patients = await Promise.all(patientPromises);
      const validPatients = patients.filter(patient => patient && patient.dateOfBirth);

      // Calculate age groups
      const ageGroups = validPatients.reduce((acc, patient) => {
        const age = calculateAge(patient.dateOfBirth);
        const ageGroup = getAgeGroup(age);
        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
        return acc;
      }, {});

      // Ensure all age groups are represented
      const completeAgeGroups = {
        '0-17': ageGroups['0-17'] || 0,
        '18-34': ageGroups['18-34'] || 0,
        '35-54': ageGroups['35-54'] || 0,
        '55-69': ageGroups['55-69'] || 0,
        '70+': ageGroups['70+'] || 0,
      };

      setPatientAgeGroups(completeAgeGroups);

      console.log('Real Patient Age Groups from API:', {
        totalPatients: validPatients.length,
        ageDistribution: completeAgeGroups,
        dataSource: 'Real Patient API calls'
      });

    } catch (error) {
      console.error('Error fetching patient age data:', error);
      // Fallback to empty age groups
      setPatientAgeGroups({});
    }
  }, [activeAdmissions]);

  // Fetch age data when active admissions change
  useEffect(() => {
    fetchPatientAgeData();
  }, [fetchPatientAgeData]);

  const analyticsData = useMemo(() => {
    if (!allAdmissions.length && !activeAdmissions.length) return null;

    // Debug logging
    console.log('Analytics Data Generation:', {
      allAdmissions: allAdmissions.length,
      activeAdmissions: activeAdmissions.length,
      wards: wards.length,
      wardsData: wards,
      activeAdmissionsData: activeAdmissions.slice(0, 3) // First 3 for debugging
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Time range filtering
    const getDateRange = (range) => {
      const endDate = new Date(today);
      const startDate = new Date(today);
      
      switch(range) {
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }
      return { startDate, endDate };
    };

    const { startDate } = getDateRange(timeRange);

    // Filter admissions by time range
    const filteredAdmissions = allAdmissions.filter(admission => {
      const admissionDate = new Date(admission.admissionDate);
      return admissionDate >= startDate;
    });

    // Ward Occupancy Analysis - Updated to match active patients correctly
    const wardOccupancy = wards.map(ward => {
      // Get active patients for this ward using multiple matching criteria
      const wardActivePatients = activeAdmissions.filter(admission => {
        // Filter only ACTIVE status admissions
        if (admission.status !== 'ACTIVE') return false;
        
        // Match by wardId (most reliable)
        if (ward.wardId && admission.wardId && ward.wardId === admission.wardId) {
          return true;
        }
        
        // Fallback: Match by ward name (with flexible matching)
        if (ward.wardName && admission.wardName) {
          const wardNameNormalized = ward.wardName.toLowerCase().trim();
          const admissionWardNormalized = admission.wardName.toLowerCase().trim();
          
          // Direct match
          if (wardNameNormalized === admissionWardNormalized) return true;
          
          // Contains match (e.g., "Ward 1" contains "Ward1" or vice versa)
          if (wardNameNormalized.includes(admissionWardNormalized) || 
              admissionWardNormalized.includes(wardNameNormalized)) return true;
          
          // Extract ward numbers for matching (e.g., "Ward 1" vs "Ward1")
          const wardNumMatch = wardNameNormalized.match(/ward\s*(\d+)/);
          const admissionNumMatch = admissionWardNormalized.match(/ward\s*(\d+)/);
          if (wardNumMatch && admissionNumMatch && wardNumMatch[1] === admissionNumMatch[1]) {
            return true;
          }
        }
        
        return false;
      });

      const occupiedBeds = wardActivePatients.length;
      const totalBeds = 20; // Each ward has exactly 20 beds
      
      return {
        wardId: ward.wardId,
        wardName: ward.wardName || ward.name, // Use wardName from API
        wardType: ward.wardType,
        occupied: occupiedBeds,
        total: totalBeds,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        available: totalBeds - occupiedBeds,
        activePatients: wardActivePatients, // Include actual patient data
        patientNames: wardActivePatients.map(p => p.patientName).join(', '), // For tooltips
        bedCapacity: totalBeds // Explicitly show bed capacity
      };
    });

    // Debug logging for ward occupancy with 20-bed capacity
    console.log('Ward Occupancy Calculation Result (20 beds each):', 
      wardOccupancy.map(ward => ({
        wardName: ward.wardName,
        occupied: ward.occupied,
        available: ward.available,
        total: ward.total,
        occupancyRate: ward.occupancyRate + '%',
        activePatientCount: ward.activePatients.length
      }))
    );

    // Admission Status Distribution - Enhanced with real-time API data
    const statusDistribution = {
      active: activeAdmissions.length, // From /api/admissions/active
      discharged: allAdmissions.filter(a => 
        a.status === 'DISCHARGED' && 
        a.dischargeDate && 
        new Date(a.dischargeDate).toDateString() === today.toDateString()
      ).length, // Discharged today only
      transferred: allAdmissions.filter(a => 
        a.status === 'TRANSFERRED' &&
        a.admissionDate &&
        new Date(a.admissionDate).toDateString() === today.toDateString()
      ).length, // Transferred today only
      total: allAdmissions.length
    };

    console.log('Real-time Status Distribution:', {
      activeCount: statusDistribution.active,
      dischargedToday: statusDistribution.discharged,
      transferredToday: statusDistribution.transferred,
      totalAdmissions: statusDistribution.total
    });

    // Age Group Analysis - Use real API data from state
    const ageGroups = patientAgeGroups;

    // Daily Admissions Trend (Last 30 days) - Enhanced Real API Data Processing
    const last30Days = [];
    let totalAdmissionsLast30 = 0;
    let totalDischargesLast30 = 0;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      // Real API data filtering for admissions
      const admissionsCount = allAdmissions.filter(admission => {
        if (!admission.admissionDate) return false;
        const admissionDate = new Date(admission.admissionDate);
        return admissionDate.toDateString() === dateStr;
      }).length;

      // Real API data filtering for discharges
      const dischargesCount = allAdmissions.filter(admission => {
        if (!admission.dischargeDate) return false;
        const dischargeDate = new Date(admission.dischargeDate);
        return dischargeDate.toDateString() === dateStr;
      }).length;

      totalAdmissionsLast30 += admissionsCount;
      totalDischargesLast30 += dischargesCount;

      last30Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        admissions: admissionsCount,
        discharges: dischargesCount,
        fullDate: date
      });
    }

    console.log('Real API Trend Data (Last 30 Days):', {
      totalDays: last30Days.length,
      totalAdmissions: totalAdmissionsLast30,
      totalDischarges: totalDischargesLast30,
      averageAdmissionsPerDay: (totalAdmissionsLast30 / 30).toFixed(1),
      averageDischargesPerDay: (totalDischargesLast30 / 30).toFixed(1),
      dataSource: 'Real Hospital APIs'
    });

    // Average Length of Stay
    const dischargedAdmissions = allAdmissions.filter(a => 
      a.status === 'DISCHARGED' && a.dischargeDate
    );
    
    const avgLengthOfStay = dischargedAdmissions.length > 0 
      ? dischargedAdmissions.reduce((sum, admission) => {
          const admitDate = new Date(admission.admissionDate);
          const dischargeDate = new Date(admission.dischargeDate);
          const lengthOfStay = Math.ceil((dischargeDate - admitDate) / (1000 * 60 * 60 * 24));
          return sum + lengthOfStay;
        }, 0) / dischargedAdmissions.length
      : 0;

    // Ward Type Distribution
    const wardTypes = wards.reduce((acc, ward) => {
      const type = ward.type || 'general';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Emergency vs Routine Admissions (sample data)
    const admissionTypes = {
      emergency: Math.floor(activeAdmissions.length * 0.3),
      routine: Math.floor(activeAdmissions.length * 0.7)
    };

    return {
      wardOccupancy,
      statusDistribution,
      last30Days,
      avgLengthOfStay: Math.round(avgLengthOfStay * 10) / 10,
      wardTypes,
      ageGroups,
      admissionTypes,
      totalBeds: wardOccupancy.reduce((sum, ward) => sum + ward.total, 0),
      occupiedBeds: wardOccupancy.reduce((sum, ward) => sum + ward.occupied, 0),
      filteredAdmissions
    };
  }, [allAdmissions, activeAdmissions, wards, timeRange, patientAgeGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      await fetchPatientAgeData(); // Also refresh patient age data
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  // Chart configurations
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  };

  // Ward Occupancy Chart Data - Enhanced with 20-bed capacity and percentage information
  const wardOccupancyData = {
    labels: analyticsData ? analyticsData.wardOccupancy.map(w => {
      const occupancyPercentage = Math.round((w.occupied / 20) * 100);
      return `${w.wardName}\n(${occupancyPercentage}% Full - ${w.occupied}/20 beds)`;
    }) : [],
    datasets: [
      {
        label: 'Active Patients (Occupied)',
        data: analyticsData ? analyticsData.wardOccupancy.map(w => w.occupied) : [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Available Beds (Empty)',
        data: analyticsData ? analyticsData.wardOccupancy.map(w => w.available) : [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      }
    ],
  };

  // Admission Status Distribution - Real-time API data
  const statusDistributionData = {
    labels: ['Active Patients', 'Discharged Today', 'Transferred Today'],
    datasets: [
      {
        data: analyticsData ? [
          analyticsData.statusDistribution.active,
          analyticsData.statusDistribution.discharged,
          analyticsData.statusDistribution.transferred,
        ] : [0, 0, 0],
        backgroundColor: [
          '#3B82F6', // blue
          '#10B981', // green
          '#F59E0B', // yellow
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Daily Admissions Trend - Real API Data (Last 30 Days)
  const admissionsTrendData = {
    labels: analyticsData ? analyticsData.last30Days.map(d => d.date) : [],
    datasets: [
      {
        label: 'Daily Admissions (Real API)',
        data: analyticsData ? analyticsData.last30Days.map(d => d.admissions) : [],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Daily Discharges (Real API)',
        data: analyticsData ? analyticsData.last30Days.map(d => d.discharges) : [],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }
    ],
  };

  // Age Group Distribution - Enhanced with fallback data
  const ageGroupData = {
    labels: analyticsData && analyticsData.ageGroups && Object.keys(analyticsData.ageGroups).length > 0 
      ? Object.keys(analyticsData.ageGroups) 
      : ['0-17', '18-34', '35-54', '55-69', '70+'], // Fallback labels
    datasets: [
      {
        data: analyticsData && analyticsData.ageGroups && Object.keys(analyticsData.ageGroups).length > 0
          ? Object.values(analyticsData.ageGroups)
          : [0, 0, 0, 0, 0], // Fallback empty data
        backgroundColor: [
          '#8B5CF6', // purple
          '#06B6D4', // cyan
          '#10B981', // green
          '#F59E0B', // yellow
          '#EF4444', // red
        ],
      },
    ],
  };

  // Debug age group data
  console.log('Age Group Chart Debug:', {
    analyticsData: !!analyticsData,
    ageGroups: analyticsData?.ageGroups,
    ageGroupDataLabels: ageGroupData.labels,
    ageGroupDataValues: ageGroupData.datasets[0].data,
    patientAgeGroups: patientAgeGroups
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading ward analytics...</span>
        </div>
      </div>
    );
  }

  // Show error message if API calls failed
  if (lastError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Analytics</h3>
          <p className="text-gray-600 mb-4">{lastError.message}</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">No admission data available for analysis</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>
    );
  }

  const occupancyRate = analyticsData.totalBeds > 0 
    ? Math.round((analyticsData.occupiedBeds / analyticsData.totalBeds) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-7 h-7 mr-3 text-blue-600" />
              Ward Analytics Dashboard
            </h2>
            <p className="text-gray-600 mt-1">Real-time hospital ward insights and metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-3xl font-bold text-blue-600">{analyticsData.statusDistribution.active}</p>
              <p className="text-xs text-gray-500 mt-1">Currently admitted</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Bed Occupancy Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bed Occupancy</p>
              <p className="text-3xl font-bold text-green-600">{occupancyRate}%</p>
              <p className="text-xs text-gray-500 mt-1">{analyticsData.occupiedBeds}/{analyticsData.totalBeds} beds</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Bed className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Average Length of Stay */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Length of Stay</p>
              <p className="text-3xl font-bold text-purple-600">{analyticsData.avgLengthOfStay}</p>
              <p className="text-xs text-gray-500 mt-1">days</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Activity</p>
              <p className="text-3xl font-bold text-orange-600">
                {analyticsData.last30Days[analyticsData.last30Days.length - 1]?.admissions || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">new admissions</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ward Occupancy Chart - Enhanced with 20-bed capacity visualization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <Bed className="w-5 h-5 mr-2 text-blue-600" />
            Ward Bed Occupancy (20 Beds per Ward)
          </h3>
          
          {/* Simple Explanation */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-2">
              <strong>How to read this chart:</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span><strong>Blue bars</strong> = Patients currently in beds</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span><strong>Green bars</strong> = Empty beds available</span>
              </div>
              <div className="col-span-1 md:col-span-2 mt-1">
                <span>📊 Each ward has exactly <strong>20 beds total</strong>. Ward labels show <strong>percentage filled</strong> and current bed usage.</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            <Bar data={wardOccupancyData} options={{
              ...chartOptions,
              scales: {
                x: {
                  stacked: true,
                },
                y: {
                  stacked: true,
                  beginAtZero: true,
                  max: 20, // Set maximum to 20 beds
                  ticks: {
                    stepSize: 2, // Show every 2 beds
                    callback: function(value) {
                      return value + ' beds';
                    }
                  }
                }
              },
              plugins: {
                ...chartOptions.plugins,
                tooltip: {
                  callbacks: {
                    title: function(context) {
                      const wardData = analyticsData?.wardOccupancy[context[0].dataIndex];
                      const occupancyPercentage = wardData ? Math.round((wardData.occupied / 20) * 100) : 0;
                      return `${wardData?.wardName} - ${occupancyPercentage}% Filled (${wardData?.occupied || 0}/20 beds)`;
                    },
                    label: function(context) {
                      const wardData = analyticsData?.wardOccupancy[context.dataIndex];
                      const occupancyPercentage = wardData ? Math.round((wardData.occupied / 20) * 100) : 0;
                      
                      if (context.dataset.label === 'Active Patients (Occupied)') {
                        const patientCount = wardData?.occupied || 0;
                        const patientList = wardData?.patientNames || '';
                        if (patientCount > 0 && patientList) {
                          return [
                            `Occupied: ${patientCount}/20 beds (${occupancyPercentage}%)`,
                            `Patients: ${patientList}`
                          ];
                        }
                        return `Occupied: ${patientCount}/20 beds (${occupancyPercentage}%)`;
                      } else {
                        const available = wardData?.available || 0;
                        const availablePercentage = Math.round((available / 20) * 100);
                        return `Available: ${available}/20 beds (${availablePercentage}%)`;
                      }
                    },
                    afterLabel: function(context) {
                      const wardData = analyticsData?.wardOccupancy[context.dataIndex];
                      if (context.dataset.label === 'Active Patients (Occupied)' && wardData) {
                        return `Occupancy Rate: ${wardData.occupancyRate}%`;
                      }
                      return '';
                    }
                  }
                }
              }
            }} />
          </div>

          {/* Additional Quick Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-lg font-bold text-gray-900">
                {analyticsData?.wardOccupancy?.reduce((sum, ward) => sum + ward.total, 0) || 0}
              </div>
              <div className="text-xs text-gray-600">Total Beds</div>
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">
                {analyticsData?.wardOccupancy?.reduce((sum, ward) => sum + ward.occupied, 0) || 0}
              </div>
              <div className="text-xs text-blue-600">Patients Admitted</div>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">
                {analyticsData?.wardOccupancy?.reduce((sum, ward) => sum + ward.available, 0) || 0}
              </div>
              <div className="text-xs text-green-600">Beds Available</div>
            </div>
            <div className="p-2 bg-purple-50 rounded">
              <div className="text-lg font-bold text-purple-600">
                {analyticsData?.wardOccupancy?.length || 0}
              </div>
              <div className="text-xs text-purple-600">Active Wards</div>
            </div>
          </div>
        </div>

        {/* Patient Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-green-600" />
            Patient Status Distribution
          </h3>
          
          {/* Simple Explanation for Status Distribution */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 mb-2">
              <strong>Real-time Patient Status (Live API Data):</strong>
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs text-green-700">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span><strong>Active Patients</strong> = Currently admitted in hospital beds</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span><strong>Discharged Today</strong> = Patients who went home today</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                <span><strong>Transferred Today</strong> = Patients moved to other departments today</span>
              </div>
              <div className="mt-1">
                <span>📊 This live chart shows current patient distribution from hospital APIs.</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <Doughnut data={statusDistributionData} options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  position: 'bottom',
                  labels: {
                    generateLabels: function(chart) {
                      const data = chart.data;
                      const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
                      
                      return data.labels.map((label, index) => {
                        const value = data.datasets[0].data[index];
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        
                        return {
                          text: `${label}: ${value} (${percentage}%)`,
                          fillStyle: data.datasets[0].backgroundColor[index],
                          strokeStyle: data.datasets[0].backgroundColor[index],
                          lineWidth: 2,
                          hidden: false,
                          index: index
                        };
                      });
                    }
                  }
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                      const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                      return `${context.label}: ${context.parsed} patients (${percentage}%)`;
                    }
                  }
                }
              }
            }} />
          </div>
          
          {/* Percentage Summary */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {analyticsData && (() => {
              const total = analyticsData.statusDistribution.active + 
                           analyticsData.statusDistribution.discharged + 
                           analyticsData.statusDistribution.transferred;
              const activePercent = total > 0 ? Math.round((analyticsData.statusDistribution.active / total) * 100) : 0;
              const dischargedPercent = total > 0 ? Math.round((analyticsData.statusDistribution.discharged / total) * 100) : 0;
              const transferredPercent = total > 0 ? Math.round((analyticsData.statusDistribution.transferred / total) * 100) : 0;
              
              return (
                <>
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-600">{activePercent}%</div>
                    <div className="text-xs text-blue-600">Active Patients</div>
                    <div className="text-xs text-gray-500">{analyticsData.statusDistribution.active} patients</div>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">{dischargedPercent}%</div>
                    <div className="text-xs text-green-600">Discharged Today</div>
                    <div className="text-xs text-gray-500">{analyticsData.statusDistribution.discharged} patients</div>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded">
                    <div className="text-lg font-bold text-yellow-600">{transferredPercent}%</div>
                    <div className="text-xs text-yellow-600">Transferred Today</div>
                    <div className="text-xs text-gray-500">{analyticsData.statusDistribution.transferred} patients</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Admissions & Discharges Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
            Admissions & Discharges Trend (Last 30 Days)
          </h3>
          
          {/* Real API Data Explanation */}
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800 mb-2">
              <strong>Live Hospital Data (Real APIs):</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-purple-700">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span><strong>Blue line</strong> = Daily patient admissions</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span><strong>Green line</strong> = Daily patient discharges</span>
              </div>
              <div className="col-span-1 md:col-span-2 mt-1">
                <span>📈 Track patient flow trends over the last 30 days from hospital database.</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <Line data={admissionsTrendData} options={{
              ...chartOptions,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: function(value) {
                      return value + ' patients';
                    }
                  }
                }
              },
              plugins: {
                ...chartOptions.plugins,
                tooltip: {
                  callbacks: {
                    title: function(context) {
                      return `Date: ${context[0].label}`;
                    },
                    label: function(context) {
                      return `${context.dataset.label}: ${context.parsed.y} patients`;
                    }
                  }
                }
              }
            }} />
          </div>
        </div>

        {/* Patient Age Groups */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-cyan-600" />
            Patient Age Groups
          </h3>
          
          {/* Real API Data Explanation */}
          <div className="mb-4 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
            <p className="text-sm text-cyan-800 mb-2">
              <strong>Real Patient Ages (Live API Data):</strong>
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs text-cyan-700">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                <span><strong>0-17 years</strong> = Children and adolescents</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-cyan-500 rounded-full mr-2"></div>
                <span><strong>18-34 years</strong> = Young adults</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span><strong>35-54 years</strong> = Middle-aged adults</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span><strong>55-69 years</strong> = Older adults</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span><strong>70+ years</strong> = Elderly patients</span>
              </div>
              <div className="mt-1">
                <span>📅 Ages calculated from real patient birth dates in hospital database.</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <Pie data={ageGroupData} options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                      if (total === 0) {
                        return `${context.label}: No data available`;
                      }
                      const percentage = Math.round((context.parsed / total) * 100);
                      return `${context.label}: ${context.parsed} patients (${percentage}%)`;
                    }
                  }
                }
              }
            }} />
          </div>
          
          {/* Show loading message when fetching patient data */}
          {Object.keys(patientAgeGroups).length === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 text-center">
                📊 Loading patient age data from APIs... 
                {activeAdmissions.length > 0 ? `Processing ${activeAdmissions.length} patients` : 'No active patients found'}
              </p>
            </div>
          )}
          
          {/* Age Group Summary */}
          {analyticsData && analyticsData.ageGroups && Object.keys(analyticsData.ageGroups).length > 0 && (
            <div className="mt-4 grid grid-cols-5 gap-2 text-center">
              {Object.entries(analyticsData.ageGroups).map(([ageGroup, count], index) => {
                const colors = ['bg-purple-50 text-purple-600', 'bg-cyan-50 text-cyan-600', 'bg-green-50 text-green-600', 'bg-yellow-50 text-yellow-600', 'bg-red-50 text-red-600'];
                const total = Object.values(analyticsData.ageGroups).reduce((sum, val) => sum + val, 0);
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                
                return (
                  <div key={ageGroup} className={`p-2 rounded ${colors[index] || 'bg-gray-50 text-gray-600'}`}>
                    <div className="text-lg font-bold">{percentage}%</div>
                    <div className="text-xs">{ageGroup} years</div>
                    <div className="text-xs opacity-75">{count} patients</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ward Utilization Table - Enhanced with 20-Bed Capacity Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Ward Utilization (20 Beds Each) & Active Patients
          </h3>
          
          {/* Simple Explanation */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 mb-1">
              <strong>Quick Reference:</strong> Track how many beds are being used in each ward
            </p>
            <div className="text-xs text-green-700 space-y-1">
              <div>• <strong>Active Patients:</strong> Number of patients currently admitted</div>
              <div>• <strong>Bed Usage:</strong> Shows occupied beds out of 20 total beds</div>
              <div>• <strong>Rate:</strong> Percentage of beds being used (Green = Good, Yellow = Busy, Red = Full)</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-900">Ward Name</th>
                  <th className="text-center py-2 font-medium text-gray-900">Active Patients</th>
                  <th className="text-center py-2 font-medium text-gray-900">Bed Usage (20 Total)</th>
                  <th className="text-center py-2 font-medium text-gray-900">Fill Rate (%)</th>
                  <th className="text-center py-2 font-medium text-gray-900">Occupancy Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analyticsData.wardOccupancy.map((ward, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div>
                        <div className="font-medium text-gray-900">{ward.wardName}</div>
                        <div className="text-xs text-gray-500">
                          {ward.wardType || 'General'} • {ward.occupancyRate}% Full ({ward.occupied}/20 beds)
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <div className="font-medium text-blue-600">{ward.occupied}</div>
                      {ward.occupied > 0 && ward.patientNames && (
                        <div className="text-xs text-gray-500 mt-1 max-w-32 truncate" 
                             title={ward.patientNames}>
                          {ward.patientNames.length > 30 
                            ? `${ward.patientNames.substring(0, 30)}...` 
                            : ward.patientNames}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <div className="font-medium">{ward.occupied}/20</div>
                      <div className="text-xs text-gray-500">{ward.available} free beds</div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        ward.occupancyRate >= 90 ? 'bg-red-100 text-red-800' :
                        ward.occupancyRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ward.occupancyRate}%
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {ward.occupancyRate >= 95 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Full
                        </span>
                      ) : ward.occupancyRate >= 80 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          <Activity className="w-3 h-3 mr-1" />
                          High
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}