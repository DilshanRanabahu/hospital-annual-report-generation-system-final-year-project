import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  RefreshCw,
  FileText,
  Activity,
  Users,
  Bed,
  Clock,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const WardStatisticsReport = () => {
  const [reportMode, setReportMode] = useState('hospital-wide'); // 'hospital-wide', 'individual-ward'
  const [selectedWard, setSelectedWard] = useState('Ward1');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking'); // 'checking', 'online', 'offline'

  const wards = [
    { id: 1, apiName: 'Ward1', displayName: 'Ward 1 - General', type: 'General' },
    { id: 2, apiName: 'Ward2', displayName: 'Ward 2 - General', type: 'General' },
    { id: 3, apiName: 'Ward3', displayName: 'Ward 3 - ICU', type: 'ICU' },
    { id: 4, apiName: 'Ward4', displayName: 'Ward 4 - Dialysis', type: 'Dialysis' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Define callback functions before useEffect
  const fetchWardStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/ward-statistics/ward/${selectedWard}/year/${selectedYear}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Server error (${response.status}): Please check if the backend service is running`);
        } else if (response.status === 404) {
          throw new Error('Ward statistics endpoint not found. Please verify the API configuration.');
        } else {
          throw new Error(`Failed to fetch ward statistics (HTTP ${response.status})`);
        }
      }

      const data = await response.json();
      setReportData(data);
      setApiStatus('online');
      console.log('Ward statistics loaded successfully:', data);

    } catch (err) {
      console.error('Error fetching ward statistics:', err);
      setError(err.message);
      setApiStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [selectedWard, selectedYear]);

  const fetchHospitalWideStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/ward-statistics/hospital-wide/${selectedYear}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Server error (${response.status}): Please check if the backend service is running`);
        } else if (response.status === 404) {
          throw new Error('Hospital-wide statistics endpoint not found. Please verify the API configuration.');
        } else {
          throw new Error(`Failed to fetch hospital-wide statistics (HTTP ${response.status})`);
        }
      }

      const data = await response.json();
      setHospitalData(data);
      setReportData(null); // Clear individual ward data
      setApiStatus('online');
      console.log('Hospital-wide statistics loaded successfully:', data);

    } catch (err) {
      console.error('Error fetching hospital-wide statistics:', err);
      setError(err.message);
      setApiStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Use effect after both callback functions are defined
  useEffect(() => {
    if (reportMode === 'hospital-wide') {
      fetchHospitalWideStatistics();
    } else {
      fetchWardStatistics();
    }
  }, [reportMode, selectedWard, selectedYear, fetchHospitalWideStatistics, fetchWardStatistics]);

  const downloadPDF = async () => {
    setPdfDownloading(true);
    setError(null);

    try {
      let url, filename, logMessage;

      if (reportMode === 'hospital-wide') {
        url = `/api/reports/ward-statistics/hospital-wide/export-pdf/${selectedYear}`;
        filename = `Hospital_Wide_Statistics_${selectedYear}.pdf`;
        logMessage = `Downloading hospital-wide PDF for ${selectedYear}`;
      } else {
        const selectedWardData = wards.find(w => w.apiName === selectedWard);
        const _WARD_DISPLAY_NAME = selectedWardData ? selectedWardData.displayName : selectedWard;
        url = `/api/reports/ward-statistics/ward/${selectedWard}/export-pdf/${selectedYear}`;
        filename = `Ward_${selectedWard}_Statistics_${selectedYear}.pdf`;
        logMessage = `Downloading PDF for ${selectedWard} (${selectedYear})`;
      }

      console.log(logMessage);

      // Alternative method 1: Try direct window location
      try {
        window.location.href = url;
        console.log('PDF download initiated using window.location');
        return;
      } catch (directError) {
        console.log('Direct download failed, trying fetch method:', directError);
      }

      // Alternative method 2: Fetch with different headers
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf,*/*',
        },
        credentials: 'omit', // Don't send credentials to avoid CORS issues
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to generate PDF report'}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        // Try creating a new tab instead
        window.open(url, '_blank');
        console.log('PDF opened in new tab');
        return;
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Received empty PDF file');
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;

      // Ensure the link is properly added to DOM
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);

      console.log(`PDF downloaded successfully: ${filename}`);

    } catch (err) {
      console.error('PDF download error:', err);
      setError(`Failed to download PDF report: ${err.message}`);
    } finally {
      setPdfDownloading(false);
    }
  };

  const getAdmissionChartData = () => {
    const monthlyData = reportMode === 'hospital-wide' ? hospitalData?.hospitalMonthlyData : reportData?.monthlyData;
    if (!monthlyData) return null;

    return {
      labels: monthlyData.map(month => month.monthName),
      datasets: [
        {
          label: reportMode === 'hospital-wide' ? 'Total Admissions' : 'Admissions',
          data: monthlyData.map(month => reportMode === 'hospital-wide' ? month.totalAdmissions : month.admissions),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        },
        {
          label: reportMode === 'hospital-wide' ? 'Total Discharges' : 'Discharges',
          data: monthlyData.map(month => reportMode === 'hospital-wide' ? month.totalDischarges : month.discharges),
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const getOccupancyChartData = () => {
    const monthlyData = reportMode === 'hospital-wide' ? hospitalData?.hospitalMonthlyData : reportData?.monthlyData;
    if (!monthlyData) return null;

    return {
      labels: monthlyData.map(month => month.monthName),
      datasets: [
        {
          label: reportMode === 'hospital-wide' ? 'Hospital Average Occupancy (%)' : 'Average Occupancy (%)',
          data: monthlyData.map(month => month.averageOccupancy),
          borderColor: 'rgba(168, 85, 247, 1)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const getGenderChartData = () => {
    const genderBreakdown = reportMode === 'hospital-wide' ? hospitalData?.hospitalGenderBreakdown : reportData?.genderBreakdown;
    if (!genderBreakdown) return null;

    const labels = Object.keys(genderBreakdown);
    const data = Object.values(genderBreakdown);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(16, 185, 129, 0.8)'
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(236, 72, 153, 1)',
            'rgba(16, 185, 129, 1)'
          ],
          borderWidth: 2
        }
      ]
    };
  };

  const getAgeGroupChartData = () => {
    const ageGroupBreakdown = reportMode === 'hospital-wide' ? hospitalData?.hospitalAgeGroupBreakdown : reportData?.ageGroupBreakdown;
    if (!ageGroupBreakdown) return null;

    const labels = Object.keys(ageGroupBreakdown);
    const data = Object.values(ageGroupBreakdown);

    return {
      labels,
      datasets: [
        {
          label: 'Patients by Age Group',
          data,
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(168, 85, 247, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading ward statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-red-800 font-medium">Error loading statistics</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
        <button
          onClick={fetchWardStatistics}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-semibold text-gray-900">Ward Statistics Report</h1>
              <p className="text-gray-600">Comprehensive analytics and performance metrics</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchWardStatistics}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={downloadPDF}
              disabled={pdfDownloading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfDownloading ? (
                <RefreshCw size={16} className="mr-2 animate-spin" />
              ) : (
                <Download size={16} className="mr-2" />
              )}
              {pdfDownloading ? 'Generating PDF...' : 'Export PDF Report'}
            </button>
            <div className="flex items-center ml-4">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                apiStatus === 'online' ? 'bg-green-500' :
                apiStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-xs text-gray-600">
                API: {apiStatus === 'online' ? 'Connected' : apiStatus === 'offline' ? 'Disconnected' : 'Checking...'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Report Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="hospital-wide"
                  checked={reportMode === 'hospital-wide'}
                  onChange={(e) => setReportMode(e.target.value)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Hospital-Wide Report (All Wards)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="individual-ward"
                  checked={reportMode === 'individual-ward'}
                  onChange={(e) => setReportMode(e.target.value)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Individual Ward Report</span>
              </label>
            </div>
          </div>

          {/* Ward and Year Selection */}
          <div className="flex flex-col sm:flex-row gap-4">
            {reportMode === 'individual-ward' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Ward</label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {wards.map(ward => (
                    <option key={ward.id} value={ward.apiName}>{ward.displayName}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {(reportData || hospitalData) && (
        <>
          {/* Key Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    {reportMode === 'hospital-wide' ? 'Total Hospital Admissions' : 'Total Admissions'}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {reportMode === 'hospital-wide' ? hospitalData?.totalHospitalAdmissions : reportData?.totalAdmissions}
                  </p>
                  {reportMode === 'individual-ward' && reportData?.yearOverYearGrowth !== 0 && (
                    <div className="flex items-center mt-2">
                      {reportData?.yearOverYearGrowth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${reportData?.yearOverYearGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(reportData?.yearOverYearGrowth || 0).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">
                    {reportMode === 'hospital-wide' ? 'Hospital Occupancy Rate' : 'Occupancy Rate'}
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {reportMode === 'hospital-wide' ?
                      hospitalData?.hospitalOccupancyRate?.toFixed(1) :
                      reportData?.currentOccupancyRate?.toFixed(1)
                    }%
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {reportMode === 'hospital-wide' ? 'Average rate' : 'Current rate'}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">
                    {reportMode === 'hospital-wide' ? 'Hospital Avg Length of Stay' : 'Avg Length of Stay'}
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {reportMode === 'hospital-wide' ?
                      hospitalData?.averageHospitalLengthOfStay?.toFixed(1) :
                      reportData?.averageLengthOfStay?.toFixed(1)
                    }
                  </p>
                  <p className="text-sm text-gray-600 mt-1">days</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">
                    {reportMode === 'hospital-wide' ? 'Hospital Bed Utilization' : 'Bed Utilization'}
                  </p>
                  <p className="text-2xl font-bold text-orange-900">
                    {reportMode === 'hospital-wide' ?
                      hospitalData?.hospitalBedUtilizationRate?.toFixed(1) :
                      reportData?.bedUtilizationRate?.toFixed(1)
                    }%
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {reportMode === 'hospital-wide' ? 'Average rate' : 'Annual rate'}
                  </p>
                </div>
                <Bed className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {reportMode === 'hospital-wide' ? 'Hospital-Wide Executive Summary' : 'Executive Summary'}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {reportMode === 'hospital-wide' ? hospitalData?.hospitalExecutiveSummary : reportData?.executiveSummary}
            </p>
          </div>

          {/* Hospital-Wide Ward Comparison Table */}
          {reportMode === 'hospital-wide' && hospitalData?.wardReports && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                All Wards Performance Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ward</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admissions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg LOS</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bed Util</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hospitalData.wardReports.map((ward, index) => (
                      <tr key={ward.wardName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ward.wardName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ward.wardName.includes('3') ? 'ICU' : ward.wardName.includes('4') ? 'Dialysis' : 'General'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ward.totalAdmissions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ward.currentOccupancyRate?.toFixed(1)}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ward.averageLengthOfStay?.toFixed(1)} days</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ward.bedUtilizationRate?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Admissions and Discharges Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {reportMode === 'hospital-wide' ? 'Hospital Monthly Admissions & Discharges' : 'Monthly Admissions & Discharges'}
              </h3>
              {getAdmissionChartData() && (
                <Bar data={getAdmissionChartData()} options={chartOptions} />
              )}
            </div>

            {/* Occupancy Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {reportMode === 'hospital-wide' ? 'Hospital Occupancy Trend' : 'Occupancy Trend'}
              </h3>
              {getOccupancyChartData() && (
                <Line data={getOccupancyChartData()} options={lineChartOptions} />
              )}
            </div>

            {/* Gender Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {reportMode === 'hospital-wide' ? 'Hospital-Wide Gender Distribution' : 'Gender Distribution'}
              </h3>
              {getGenderChartData() && (
                <div className="h-64 flex items-center justify-center">
                  <Doughnut data={getGenderChartData()} options={doughnutOptions} />
                </div>
              )}
            </div>

            {/* Age Group Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {reportMode === 'hospital-wide' ? 'Hospital-Wide Age Group Distribution' : 'Age Group Distribution'}
              </h3>
              {getAgeGroupChartData() && (
                <Bar data={getAgeGroupChartData()} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Performance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                {reportMode === 'hospital-wide' ? 'Hospital Trend Analysis' : 'Trend Analysis'}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {reportMode === 'hospital-wide' ? hospitalData?.hospitalTrendAnalysis : reportData?.trendAnalysis}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Info className="h-5 w-5 mr-2" />
                {reportMode === 'hospital-wide' ? 'Hospital Performance Insights' : 'Performance Insights'}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {reportMode === 'hospital-wide' ? hospitalData?.hospitalPerformanceInsights : reportData?.performanceInsights}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {reportMode === 'hospital-wide' ? 'Strategic Recommendations' : 'Recommendations'}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {reportMode === 'hospital-wide' ? hospitalData?.hospitalRecommendations : reportData?.recommendations}
            </p>
          </div>

          {/* Monthly Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {reportMode === 'hospital-wide' ? 'Hospital Monthly Breakdown' : 'Monthly Breakdown'}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {reportMode === 'hospital-wide' ? 'Total Admissions' : 'Admissions'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {reportMode === 'hospital-wide' ? 'Total Discharges' : 'Discharges'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Occupancy</th>
                    {reportMode === 'individual-ward' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg LOS</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(reportMode === 'hospital-wide' ? hospitalData?.hospitalMonthlyData : reportData?.monthlyData)?.map((month) => (
                    <tr key={month.month} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month.monthName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reportMode === 'hospital-wide' ? month.totalAdmissions : month.admissions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reportMode === 'hospital-wide' ? month.totalDischarges : month.discharges}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {month.averageOccupancy?.toFixed(1)}%
                      </td>
                      {reportMode === 'individual-ward' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {month.averageLengthOfStay?.toFixed(1)} days
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report Footer */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Report generated on: {new Date((reportMode === 'hospital-wide' ? hospitalData?.generatedAt : reportData?.generatedAt) || new Date()).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  {reportMode === 'hospital-wide' ?
                    `Hospital-Wide Report | Year: ${hospitalData?.year || selectedYear}` :
                    `Ward: ${reportData?.wardName} | Year: ${reportData?.year || selectedYear}`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Hospital Management System</p>
                <p className="text-sm text-gray-500">
                  {reportMode === 'hospital-wide' ? 'Hospital-Wide Analytics Module' : 'Ward Analytics Module'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WardStatisticsReport;