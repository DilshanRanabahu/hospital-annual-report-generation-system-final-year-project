import React, { useState, useEffect, useCallback } from 'react';
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
  Activity, 
  Users, 
  Zap, 
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Droplet,
  Calendar,
  Settings,
  Shield,
  Database,
  Monitor,
  Heart,
  Weight,
  Gauge
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

export default function DialysisAnalytics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // Add tab state

  // Analytics data state
  const [machinePerformance, setMachinePerformance] = useState(null);
  const [sessionTrends, setSessionTrends] = useState(null);
  const [patientMetrics, setPatientMetrics] = useState(null);
  const [operationalMetrics, setOperationalMetrics] = useState(null);
  const [kpiDashboard, setKpiDashboard] = useState(null);
  const [utilizationHeatmap, setUtilizationHeatmap] = useState(null);
  const [monthlyComparison, setMonthlyComparison] = useState(null);
  const [machineWiseTrends, setMachineWiseTrends] = useState(null);
  const [patientTrendsData, setPatientTrendsData] = useState(null);
  const [patientTrendsLoading, setPatientTrendsLoading] = useState(false);
  
  // Annual trends specific state
  const [annualData, setAnnualData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [annualLoading, setAnnualLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const jwtToken = localStorage.getItem('jwtToken');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header only if token exists
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      // Calculate date range
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      console.log('Fetching analytics data:', {
        startDate,
        endDate,
        timeRange,
        hasToken: !!jwtToken
      });

      // Fetch all analytics data
      const [
        machineResponse,
        trendsResponse,
        metricsResponse,
        operationalResponse,
        kpiResponse,
        heatmapResponse,
        monthlyResponse,
        machineWiseResponse
      ] = await Promise.all([
        fetch(`/api/dialysis/analytics/machine-performance?startDate=${startDate}&endDate=${endDate}`, { headers }),
        fetch(`/api/dialysis/analytics/session-trends?days=${timeRange}`, { headers }),
        fetch(`/api/dialysis/analytics/patient-metrics?startDate=${startDate}&endDate=${endDate}`, { headers }),
        fetch(`/api/dialysis/analytics/operational-metrics`, { headers }),
        fetch(`/api/dialysis/analytics/kpi-dashboard`, { headers }),
        fetch(`/api/dialysis/analytics/utilization-heatmap?days=7`, { headers }),
        fetch(`/api/dialysis/analytics/monthly-comparison?months=6`, { headers }),
        fetch(`/api/dialysis/analytics/machine-wise-trends?days=${timeRange}`, { headers })
      ]);

      if (!machineResponse.ok || !trendsResponse.ok || !metricsResponse.ok || 
          !operationalResponse.ok || !kpiResponse.ok || !heatmapResponse.ok || 
          !monthlyResponse.ok || !machineWiseResponse.ok) {
        
        // Check for specific error types
        const errorResponse = !machineResponse.ok ? machineResponse : 
                             !trendsResponse.ok ? trendsResponse :
                             !metricsResponse.ok ? metricsResponse :
                             !operationalResponse.ok ? operationalResponse :
                             !kpiResponse.ok ? kpiResponse :
                             !heatmapResponse.ok ? heatmapResponse : 
                             !monthlyResponse.ok ? monthlyResponse : machineWiseResponse;
        
        if (errorResponse.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (errorResponse.status === 403) {
          throw new Error('Access denied. Insufficient permissions.');
        } else if (errorResponse.status === 404) {
          throw new Error('Analytics service not found.');
        } else if (errorResponse.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`Failed to fetch analytics data (${errorResponse.status})`);
        }
      }

      const [machineData, trendsData, metricsData, operationalData, kpiData, heatmapData, monthlyData, machineWiseData] = 
        await Promise.all([
          machineResponse.json(),
          trendsResponse.json(),
          metricsResponse.json(),
          operationalResponse.json(),
          kpiResponse.json(),
          heatmapResponse.json(),
          monthlyResponse.json(),
          machineWiseResponse.json()
        ]);

      setMachinePerformance(machineData);
      setSessionTrends(trendsData);
      setPatientMetrics(metricsData);
      setOperationalMetrics(operationalData);
      setKpiDashboard(kpiData);
      setUtilizationHeatmap(heatmapData);
      setMonthlyComparison(monthlyData);
      setMachineWiseTrends(machineWiseData);

    } catch (error) {
      console.error('Analytics fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Fetch annual trends data
  const fetchAnnualData = useCallback(async (year) => {
    try {
      setAnnualLoading(true);
      setError(null);
      
      const jwtToken = localStorage.getItem('jwtToken');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      console.log('Fetching annual dialysis data for year:', year);

      // Fetch annual data
      const [
        annualStatsResponse,
        monthlySessionsResponse,
        monthlyPatientsResponse,
        machineUtilizationResponse,
        yearComparisonResponse
      ] = await Promise.all([
        fetch(`/api/dialysis/analytics/annual-statistics?year=${year}`, { headers }),
        fetch(`/api/dialysis/analytics/monthly-sessions?year=${year}`, { headers }),
        fetch(`/api/dialysis/analytics/monthly-patients?year=${year}`, { headers }),
        fetch(`/api/dialysis/analytics/monthly-machine-utilization?year=${year}`, { headers }),
        fetch(`/api/dialysis/analytics/year-comparison?currentYear=${year}&previousYear=${year - 1}`, { headers })
      ]);

      // Check for errors
      if (!annualStatsResponse.ok || !monthlySessionsResponse.ok || 
          !monthlyPatientsResponse.ok || !machineUtilizationResponse.ok || 
          !yearComparisonResponse.ok) {
        
        // Handle different error scenarios
        if (annualStatsResponse.status === 404 || monthlySessionsResponse.status === 404) {
          throw new Error(`No dialysis data found for year ${year}`);
        } else {
          throw new Error(`Server error: Failed to fetch annual data (HTTP ${annualStatsResponse.status})`);
        }
      }

      const [annualStats, monthlySessions, monthlyPatients, machineUtilization, yearComparison] = 
        await Promise.all([
          annualStatsResponse.json(),
          monthlySessionsResponse.json(),
          monthlyPatientsResponse.json(),
          machineUtilizationResponse.json(),
          yearComparisonResponse.json()
        ]);

      // Combine all annual data
      const combinedAnnualData = {
        year,
        summary: annualStats,
        monthlySessions,
        monthlyPatients,
        machineUtilization,
        yearComparison,
        lastUpdated: new Date().toISOString()
      };

      setAnnualData(combinedAnnualData);
      
    } catch (error) {
      console.error('Annual data fetch error:', error);
      setError(`Failed to load annual data: ${error.message}`);
      setAnnualData(null);
    } finally {
      setAnnualLoading(false);
    }
  }, []);

  // Fetch patient trends data
  const fetchPatientTrendsData = useCallback(async (year) => {
    try {
      setPatientTrendsLoading(true);
      setError(null);
      
      const jwtToken = localStorage.getItem('jwtToken');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      console.log('Fetching machine-wise patient trends for year:', year);

      const response = await fetch(`/api/dialysis/reports/machine-trends/${year}`, {
        headers,
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        setPatientTrendsData(data);
        console.log('✅ Patient trends data loaded successfully');
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch patient trends data`);
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch patient trends data:', err.message);
      setError('Failed to load patient trends data. Using fallback data.');
      // Generate mock data as fallback
      const mockData = Array.from({ length: 6 }, (_, i) => ({
        machineId: `M00${i + 1}`,
        machineName: `Dialysis Machine ${i + 1}`,
        location: `Unit ${String.fromCharCode(65 + Math.floor(i / 2))}`,
        monthlyPatientData: Array.from({ length: 12 }, (_, month) => ({
          month: month + 1,
          monthName: new Date(0, month).toLocaleString('default', { month: 'long' }),
          uniquePatients: Math.floor(Math.random() * 20) + 10,
          totalSessions: Math.floor(Math.random() * 40) + 20,
          utilizationRate: Math.random() * 30 + 70
        })),
        totalUniquePatients: Math.floor(Math.random() * 150) + 100,
        averagePatientsPerMonth: Math.floor(Math.random() * 15) + 10,
        trendDirection: ['INCREASING', 'DECREASING', 'STABLE'][Math.floor(Math.random() * 3)],
        growthRate: (Math.random() - 0.5) * 20
      }));
      setPatientTrendsData(mockData);
    } finally {
      setPatientTrendsLoading(false);
    }
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    if (activeTab === 'annual-trends') {
      await fetchAnnualData(selectedYear);
    }
    if (activeTab === 'patient-trends') {
      await fetchPatientTrendsData(selectedYear);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Fetch data on component mount and time range change
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Fetch annual data when tab becomes active or year changes
  useEffect(() => {
    if (activeTab === 'annual-trends') {
      fetchAnnualData(selectedYear);
    }
  }, [activeTab, selectedYear, fetchAnnualData]);

  // Fetch patient trends data when tab becomes active or year changes
  useEffect(() => {
    if (activeTab === 'patient-trends') {
      fetchPatientTrendsData(selectedYear);
    }
  }, [activeTab, selectedYear, fetchPatientTrendsData]);

  // KPI Card component
  const KPICard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color || 'text-gray-900'} mb-1`}>
            {value !== undefined ? value : '—'}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center text-sm mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {Math.abs(trend)}% vs last period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color ? color.replace('text-', 'bg-').replace('900', '100') : 'bg-gray-100'}`}>
          {Icon && <Icon className={`w-6 h-6 ${color || 'text-gray-600'}`} />}
        </div>
      </div>
    </div>
  );

  // Annual Trends Chart Data Functions
  const getAnnualSessionsChartData = () => {
    if (!annualData?.monthlySessions) return null;

    return {
      labels: annualData.monthlySessions.map(month => month.monthName?.substring(0, 3) || 'N/A'),
      datasets: [
        {
          label: 'Total Sessions',
          data: annualData.monthlySessions.map(month => month.sessionCount || 0),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        },
        {
          label: 'Completed Sessions',
          data: annualData.monthlySessions.map(month => month.completedSessions || 0),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        },
        {
          label: 'Emergency Sessions',
          data: annualData.monthlySessions.map(month => month.emergencyCount || 0),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        }
      ]
    };
  };

  const getAnnualPatientsChartData = () => {
    if (!annualData?.monthlyPatients) return null;

    return {
      labels: annualData.monthlyPatients.map(month => month.monthName?.substring(0, 3) || 'N/A'),
      datasets: [
        {
          label: 'Total Patients',
          data: annualData.monthlyPatients.map(month => month.patientCount || 0),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        },
        {
          label: 'New Patients',
          data: annualData.monthlyPatients.map(month => month.newPatients || 0),
          borderColor: 'rgba(147, 51, 234, 1)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
        },
        {
          label: 'Discharged Patients',
          data: annualData.monthlyPatients.map(month => month.dischargedPatients || 0),
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgba(245, 158, 11, 1)',
        }
      ]
    };
  };

  const getAnnualMachineUtilizationChartData = () => {
    if (!annualData?.machineUtilization) return null;

    return {
      labels: annualData.machineUtilization.map(month => month.monthName?.substring(0, 3) || 'N/A'),
      datasets: [
        {
          label: 'Utilization %',
          data: annualData.machineUtilization.map(month => month.utilizationPercentage?.toFixed(1) || 0),
          borderColor: 'rgba(147, 51, 234, 1)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
          yAxisID: 'y',
        },
        {
          label: 'Active Machines',
          data: annualData.machineUtilization.map(month => month.activeMachines || 0),
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(245, 158, 11, 1)',
          yAxisID: 'y1',
        },
        {
          label: 'Downtime (Hours)',
          data: annualData.machineUtilization.map(month => month.downtime?.toFixed(1) || 0),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgba(239, 68, 68, 1)',
          yAxisID: 'y2',
        }
      ]
    };
  };

  // Machine Performance Chart
  const MachinePerformanceChart = () => {
    if (!machinePerformance?.machineUtilization?.machines) return null;

    const machines = machinePerformance.machineUtilization.machines;
    
    const chartData = {
      labels: machines.map(m => m.machineName || m.machineId),
      datasets: [{
        label: 'Sessions Count',
        data: machines.map(m => m.sessionCount),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 4,
      }]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Machine Performance - Session Count'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          }
        },
        x: {
          grid: {
            display: false,
          }
        }
      }
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <Bar data={chartData} options={options} />
      </div>
    );
  };

  // Session Trends Chart
  const SessionTrendsChart = () => {
    if (!sessionTrends?.dailyVolume?.daily) return null;

    const dailyData = sessionTrends.dailyVolume.daily;
    
    const chartData = {
      labels: dailyData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Daily Sessions',
        data: dailyData.map(d => d.sessionCount),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      }]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Session Volume Trends'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          }
        },
        x: {
          grid: {
            display: false,
          }
        }
      }
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <Line data={chartData} options={options} />
      </div>
    );
  };

  // Individual Machine Line Charts
  const IndividualMachineChart = ({ machine, color }) => {
    if (!machine.dailyTrends) return null;

    const dateLabels = machine.dailyTrends.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const chartData = {
      labels: dateLabels,
      datasets: [{
        label: 'Sessions',
        data: machine.dailyTrends.map(day => day.sessionCount),
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: `${machine.machineName} - ${machine.location}`,
          font: {
            size: 14,
            weight: 'bold'
          },
          color: color
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: color,
          borderWidth: 2,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function(context) {
              const dayData = machine.dailyTrends[context.dataIndex];
              return [
                `Sessions: ${context.parsed.y}`,
                `Completed: ${dayData.completedCount}`,
                `Utilization: ${Math.round(dayData.utilizationRate)}%`,
                `Avg Duration: ${dayData.avgSessionDuration ? dayData.avgSessionDuration.toFixed(1) : 'N/A'}h`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Sessions',
            font: {
              size: 12,
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
          ticks: {
            stepSize: 1,
            font: {
              size: 11
            }
          }
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 10
            },
            maxRotation: 45
          }
        }
      },
      elements: {
        line: {
          borderWidth: 3
        },
        point: {
          radius: 5,
          hoverRadius: 7
        }
      }
    };

    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div style={{ height: '280px' }}>
          <Line data={chartData} options={options} />
        </div>
        
        {/* Machine Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-lg font-bold" style={{ color: color }}>
              {machine.totalSessions}
            </p>
            <p className="text-xs text-gray-600">Total Sessions</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-lg font-bold text-green-600">
              {Math.round(machine.completionRate)}%
            </p>
            <p className="text-xs text-gray-600">Completion Rate</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-lg font-bold text-blue-600">
              {machine.dailyTrends ? Math.round(
                machine.dailyTrends.reduce((sum, day) => sum + day.utilizationRate, 0) / machine.dailyTrends.length
              ) : 0}%
            </p>
            <p className="text-xs text-gray-600">Avg Utilization</p>
          </div>
        </div>
      </div>
    );
  };

  // Machine-Wise Trends Container
  const MachineWiseTrendsChart = () => {
    if (!machineWiseTrends?.machineWiseData) return null;

    const machineData = machineWiseTrends.machineWiseData;
    
    // Generate colors for each machine
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Machine-Wise Performance Trends</h3>
          <p className="text-sm text-gray-600 mb-6">Individual performance charts for each dialysis machine</p>
          
          {/* Machine Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {machineData.map((machine, index) => (
              <IndividualMachineChart
                key={machine.machineId}
                machine={machine}
                color={colors[index % colors.length]}
              />
            ))}
          </div>
          
          {/* Overall Summary */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Fleet Overview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {machineData.length}
                </p>
                <p className="text-sm text-gray-600">Active Machines</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {machineData.reduce((sum, machine) => sum + machine.totalSessions, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {Math.round(
                    machineData.reduce((sum, machine) => sum + machine.completionRate, 0) / machineData.length
                  )}%
                </p>
                <p className="text-sm text-gray-600">Avg Completion</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {machineData.filter(machine => machine.completionRate > 90).length}
                </p>
                <p className="text-sm text-gray-600">High Performers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Monthly Comparison Chart
  const MonthlyComparisonChart = () => {
    if (!monthlyComparison?.monthlyData) return null;

    const monthlyData = monthlyComparison.monthlyData;
    
    const chartData = {
      labels: monthlyData.map(m => m.month),
      datasets: [
        {
          label: 'Total Sessions',
          data: monthlyData.map(m => m.totalSessions),
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
          borderRadius: 4,
        },
        {
          label: 'Completed Sessions',
          data: monthlyData.map(m => m.completedSessions),
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          borderRadius: 4,
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Monthly Performance Comparison'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          }
        },
        x: {
          grid: {
            display: false,
          }
        }
      }
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <Bar data={chartData} options={options} />
      </div>
    );
  };

  // Patient Metrics Component
  const PatientMetricsCard = () => {
    if (!patientMetrics) return null;
    
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 text-green-600 mr-2" />
          Patient Care Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {patientMetrics.totalPatients || 0}
            </p>
            <p className="text-sm text-gray-600">Total Patients</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {patientMetrics.averageSessionDuration || 0}min
            </p>
            <p className="text-sm text-gray-600">Avg Session Duration</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(patientMetrics.completionRate || 0)}%
            </p>
            <p className="text-sm text-gray-600">Completion Rate</p>
          </div>
        </div>
      </div>
    );
  };

  // Utilization Heatmap Component
  const UtilizationHeatmapCard = () => {
    if (!utilizationHeatmap) return null;
    
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 text-orange-600 mr-2" />
          Utilization Heatmap
        </h3>
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-2">Peak Hours Analysis</p>
          <p className="text-2xl font-bold text-orange-600">
            {utilizationHeatmap.peakHours || 'N/A'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Maximum utilization period
          </p>
        </div>
      </div>
    );
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Analytics</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
            Analytics Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Comprehensive dialysis management insights</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('machine-trends')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'machine-trends'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                Machine-Wise Performance Trends
              </div>
            </button>
            <button
              onClick={() => setActiveTab('annual-trends')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'annual-trends'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Annual Trends Analysis
              </div>
            </button>
            <button
              onClick={() => setActiveTab('patient-trends')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'patient-trends'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                Patient Trends Analysis
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

      {/* KPI Dashboard */}
      {kpiDashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Available Machines"
            value={`${kpiDashboard.availableMachines}/${kpiDashboard.totalMachines}`}
            subtitle="Ready for use"
            icon={Monitor}
            color="text-green-600"
          />
          <KPICard
            title="Today's Sessions"
            value={kpiDashboard.scheduledToday}
            subtitle={`${kpiDashboard.completedToday} completed`}
            icon={Calendar}
            color="text-blue-600"
          />
          <KPICard
            title="Completion Rate"
            value={`${Math.round(kpiDashboard.completionRate || 0)}%`}
            subtitle="Today's performance"
            icon={CheckCircle}
            color="text-emerald-600"
          />
          <KPICard
            title="Active Sessions"
            value={kpiDashboard.activeSessions}
            subtitle="Currently in progress"
            icon={Activity}
            color="text-orange-600"
          />
        </div>
      )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MachinePerformanceChart />
            <SessionTrendsChart />
            <MonthlyComparisonChart />
          </div>

          {/* Patient Metrics and Utilization Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PatientMetricsCard />
            <UtilizationHeatmapCard />
          </div>

          {/* Additional Metrics */}
          {operationalMetrics && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Database className="w-5 h-5 text-blue-600 mr-2" />
                Operational Metrics
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {operationalMetrics.todayStats && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Today's Statistics</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Total: {operationalMetrics.todayStats.total}</p>
                      <p>Completed: {operationalMetrics.todayStats.completed}</p>
                      <p>In Progress: {operationalMetrics.todayStats.inProgress}</p>
                      <p>Scheduled: {operationalMetrics.todayStats.scheduled}</p>
                    </div>
                  </div>
                )}
                
                {operationalMetrics.weeklyStats && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Weekly Performance</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Total Sessions: {operationalMetrics.weeklyStats.totalSessions}</p>
                      <p>Completion Rate: {Math.round(operationalMetrics.weeklyStats.completionRate)}%</p>
                      <p>Avg Daily: {Math.round(operationalMetrics.weeklyStats.averageDaily)}</p>
                    </div>
                  </div>
                )}
                
                {operationalMetrics.resourceUtilization && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Resource Utilization</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Machine Utilization: {Math.round(operationalMetrics.resourceUtilization.machineUtilization)}%</p>
                      <p>Available Capacity: {operationalMetrics.resourceUtilization.availableCapacity}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Machine-Wise Performance Trends Tab */}
      {activeTab === 'machine-trends' && (
        <div className="space-y-6">
          <MachineWiseTrendsChart />
        </div>
      )}

      {/* Annual Trends Analysis Tab */}
      {activeTab === 'annual-trends' && (
        <div className="space-y-6">
          {/* Year Selection and Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-6 h-6 mr-3 text-emerald-600" />
                Annual Trends Analysis
              </h3>
              <div className="flex items-center space-x-4">
                {/* Year Comparison Toggle */}
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    showComparison 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Year Comparison
                </button>
                
                {/* Year Selector */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                
                {/* Refresh Button */}
                <button
                  onClick={() => fetchAnnualData(selectedYear)}
                  disabled={annualLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${annualLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
            
            {annualLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading annual trends data...</p>
                </div>
              </div>
            ) : annualData ? (
              <>
                {/* Charts Section */}
                <div className="space-y-8">
                  {/* Monthly Sessions Trends */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-blue-600" />
                      Monthly Dialysis Sessions - {selectedYear}
                    </h4>
                    {getAnnualSessionsChartData() ? (
                      <div className="h-80">
                        <Line 
                          data={getAnnualSessionsChartData()} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { 
                                position: 'top',
                                labels: {
                                  usePointStyle: true,
                                  padding: 20
                                }
                              },
                              tooltip: {
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: 'white',
                                bodyColor: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1
                              }
                            },
                            scales: {
                              y: { 
                                beginAtZero: true,
                                title: { display: true, text: 'Number of Sessions' },
                                grid: { color: 'rgba(0, 0, 0, 0.1)' }
                              },
                              x: { 
                                title: { display: true, text: 'Month' },
                                grid: { display: false }
                              }
                            },
                            interaction: {
                              mode: 'nearest',
                              axis: 'x',
                              intersect: false
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-gray-500">No session data available for {selectedYear}</p>
                      </div>
                    )}
                  </div>

                  {/* Monthly Patients Trends */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-green-600" />
                      Monthly Patient Statistics - {selectedYear}
                    </h4>
                    {getAnnualPatientsChartData() ? (
                      <div className="h-80">
                        <Line 
                          data={getAnnualPatientsChartData()} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { 
                                position: 'top',
                                labels: {
                                  usePointStyle: true,
                                  padding: 20
                                }
                              },
                              tooltip: {
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: 'white',
                                bodyColor: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1
                              }
                            },
                            scales: {
                              y: { 
                                beginAtZero: true,
                                title: { display: true, text: 'Number of Patients' },
                                grid: { color: 'rgba(0, 0, 0, 0.1)' }
                              },
                              x: { 
                                title: { display: true, text: 'Month' },
                                grid: { display: false }
                              }
                            },
                            interaction: {
                              mode: 'nearest',
                              axis: 'x',
                              intersect: false
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-gray-500">No patient data available for {selectedYear}</p>
                      </div>
                    )}
                  </div>

                  {/* Machine Utilization Trends */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                      <Gauge className="w-5 h-5 mr-2 text-purple-600" />
                      Monthly Machine Utilization & Performance - {selectedYear}
                    </h4>
                    {getAnnualMachineUtilizationChartData() ? (
                      <div className="h-80">
                        <Line 
                          data={getAnnualMachineUtilizationChartData()} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { 
                                position: 'top',
                                labels: {
                                  usePointStyle: true,
                                  padding: 20
                                }
                              },
                              tooltip: {
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: 'white',
                                bodyColor: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1
                              }
                            },
                            scales: {
                              y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                beginAtZero: true,
                                max: 100,
                                title: { display: true, text: 'Utilization (%)' },
                                grid: { color: 'rgba(0, 0, 0, 0.1)' }
                              },
                              y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                beginAtZero: true,
                                title: { display: true, text: 'Active Machines' },
                                grid: { drawOnChartArea: false }
                              },
                              y2: {
                                type: 'linear',
                                display: false,
                                position: 'right',
                                beginAtZero: true,
                              },
                              x: { 
                                title: { display: true, text: 'Month' },
                                grid: { display: false }
                              }
                            },
                            interaction: {
                              mode: 'nearest',
                              axis: 'x',
                              intersect: false
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-gray-500">No machine utilization data available for {selectedYear}</p>
                      </div>
                    )}
                  </div>

                  {/* Year Comparison Section */}
                  {showComparison && annualData.yearComparison && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
                      <h4 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                        Year-over-Year Comparison ({selectedYear} vs {selectedYear - 1})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <div className="text-3xl font-bold text-indigo-900 mb-2">
                            +{annualData.yearComparison.sessionsGrowth?.toFixed(1) || '0'}%
                          </div>
                          <div className="text-sm text-gray-600">Sessions Growth</div>
                          <div className="text-xs text-gray-500 mt-1">Year over year increase</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <div className="text-3xl font-bold text-green-900 mb-2">
                            +{annualData.yearComparison.patientsGrowth?.toFixed(1) || '0'}%
                          </div>
                          <div className="text-sm text-gray-600">Patients Growth</div>
                          <div className="text-xs text-gray-500 mt-1">New patient registrations</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <div className="text-3xl font-bold text-purple-900 mb-2">
                            +{annualData.yearComparison.utilizationImprovement?.toFixed(1) || '0'}%
                          </div>
                          <div className="text-sm text-gray-600">Efficiency Gain</div>
                          <div className="text-xs text-gray-500 mt-1">Machine utilization improvement</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Insights */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Database className="w-5 h-5 mr-2 text-gray-600" />
                      Key Insights for {selectedYear}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          <span>Peak month: {annualData.monthlySessions?.reduce((max, month) => 
                            month.sessionCount > max.sessionCount ? month : max, 
                            annualData.monthlySessions[0] || {}
                          )?.monthName || 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
                          <span>Average sessions per month: {Math.floor((annualData.summary?.totalSessions || 0) / 12)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-purple-600 mr-2" />
                          <span>Total downtime: {annualData.summary?.totalDowntime?.toFixed(1) || '0'} hours</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <TrendingUp className="w-4 h-4 text-emerald-600 mr-2" />
                          <span>Highest utilization: {Math.max(...(annualData.machineUtilization?.map(m => m.utilizationPercentage) || [0]))?.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Users className="w-4 h-4 text-green-600 mr-2" />
                          <span>Peak patient load: {Math.max(...(annualData.monthlyPatients?.map(m => m.patientCount) || [0]))} patients</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Activity className="w-4 h-4 text-orange-600 mr-2" />
                          <span>Data last updated: {new Date(annualData.lastUpdated).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No annual data available</p>
                <p className="text-sm text-gray-500">Click refresh to load data for {selectedYear}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Patient Trends Analysis Tab */}
      {activeTab === 'patient-trends' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Monitor className="w-5 h-5 mr-2 text-blue-600" />
                  Machine-Wise Patient Trends Analysis
                </h3>
                <p className="text-sm text-gray-600 mt-1">Individual patient trend analysis for each dialysis machine</p>
              </div>
              <div className="flex items-center space-x-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => fetchPatientTrendsData(selectedYear)}
                  disabled={patientTrendsLoading}
                  className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${patientTrendsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {patientTrendsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mr-4" />
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-900">Loading Patient Trends...</p>
                  <p className="text-gray-600">Analyzing machine-wise patient data</p>
                </div>
              </div>
            ) : patientTrendsData && patientTrendsData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {patientTrendsData.map((machine) => (
                  <div key={machine.machineId} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 flex items-center">
                        <Monitor className="w-4 h-4 mr-2 text-blue-600" />
                        {machine.machineName}
                      </h5>
                      <p className="text-sm text-gray-600">
                        Location: {machine.location || 'N/A'} | 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          machine.trendDirection === 'INCREASING' ? 'bg-green-100 text-green-800' :
                          machine.trendDirection === 'DECREASING' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {machine.trendDirection} ({machine.growthRate?.toFixed(1)}%)
                        </span>
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <Line
                        data={{
                          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                          datasets: [
                            {
                              label: 'Unique Patients',
                              data: machine.monthlyPatientData?.map(m => m.uniquePatients) || Array(12).fill(0),
                              borderColor: machine.trendDirection === 'INCREASING' ? 'rgb(16, 185, 129)' :
                                          machine.trendDirection === 'DECREASING' ? 'rgb(239, 68, 68)' :
                                          'rgb(59, 130, 246)',
                              backgroundColor: machine.trendDirection === 'INCREASING' ? 'rgba(16, 185, 129, 0.1)' :
                                              machine.trendDirection === 'DECREASING' ? 'rgba(239, 68, 68, 0.1)' :
                                              'rgba(59, 130, 246, 0.1)',
                              tension: 0.4,
                              fill: true,
                              pointRadius: 4,
                              pointHoverRadius: 6
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                            title: {
                              display: false
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Patients'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Month'
                              }
                            }
                          }
                        }}
                        height={200}
                      />
                    </div>
                    
                    {/* Machine Statistics */}
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-blue-50 rounded p-2 text-center">
                        <div className="font-medium text-blue-900">{machine.totalUniquePatients || 0}</div>
                        <div className="text-blue-600">Total Patients</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="font-medium text-gray-900">{machine.averagePatientsPerMonth?.toFixed(1) || '0.0'}</div>
                        <div className="text-gray-600">Avg/Month</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <Monitor className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-yellow-800 mb-2">No Patient Trends Data Available</h3>
                <p className="text-yellow-700">Machine-wise patient trends data is not available for the selected year. Click refresh to try loading the data.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}