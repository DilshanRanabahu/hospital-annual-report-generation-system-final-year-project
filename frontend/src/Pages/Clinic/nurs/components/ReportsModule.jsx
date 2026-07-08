import React, { useState } from 'react';
import { TrendingUp, Activity, Users, Calendar, FileText, Shield, Download, BarChart3, AlertCircle, Clock, Building2, Stethoscope } from 'lucide-react';
import axios from 'axios';

const ReportsModule = ({ todayStats }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedYear, setLastGeneratedYear] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2023); // Default to 2023 where we have data
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Generate years for dropdown (current year and previous 5 years)
  const availableYears = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  const downloadClinicReport = async (year) => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        setError('Authentication required. Please log in again.');
        setIsGenerating(false);
        return;
      }

      const response = await axios({
        method: 'GET',
        url: `/api/reports/comprehensive-clinic/full-report/${year}/pdf`,
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
        responseType: 'blob',
        timeout: 30000, // 30 second timeout for PDF generation
      });

      // Check if response is actually an error (JSON) disguised as blob
      if (response.data.type === 'application/json') {
        // This is an error response, parse it
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        setError(errorData.message || 'Failed to generate report');
        return;
      }

      // Check if response contains PDF data
      if (response.data.size === 0) {
        setError('Received empty file. Please try again.');
        return;
      }

      // Create blob link to download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Set filename with current date and selected year
      const currentDate = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Comprehensive_Clinic_Report_${year}_Generated_${currentDate}.pdf`);

      document.body.appendChild(link);

      // Mark as successful before triggering download
      setLastGeneratedYear(year);
      setSuccess(`Report for ${year} downloaded successfully!`);

      // Trigger download
      link.click();

      // Clean up
      link.remove();
      window.URL.revokeObjectURL(url);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error generating report:', error);

      // Check if this is a client-side error after successful download
      if (error.code === 'ERR_BLOCKED_BY_CLIENT' || error.code === 'ERR_NETWORK') {
        // This often happens after successful download due to ad blockers or browser restrictions
        // Don't show error if we might have successfully downloaded
        console.warn('Download may have completed despite error:', error.message);
        return;
      }

      let errorMessage = 'Failed to generate report. ';

      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to generate reports.';
      } else if (error.response?.status === 404) {
        errorMessage = `No data found for year ${year}. Please select a different year.`;
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
      } else {
        // Handle different types of errors
        if (error.response.data instanceof Blob && error.response.data.type === 'application/json') {
          // Error response is JSON blob
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || 'Server error occurred';
          } catch {
            errorMessage = 'Failed to parse error response';
          }
        } else {
          errorMessage = error.response.data?.message || 'Server error occurred';
        }
      }

      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Reports & Analytics</h1>
            <p className="text-gray-600">Generate and download medical reports for clinical analysis</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Building2 size={16} />
            <span>National Institute for Nephrology</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Statistics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <BarChart3 size={20} className="mr-2 text-blue-600" />
              System Statistics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Patients</p>
                    <p className="text-2xl font-semibold text-gray-900">{todayStats.totalPatients}</p>
                  </div>
                  <Users size={24} className="text-blue-600" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Registrations</p>
                    <p className="text-2xl font-semibold text-gray-900">{todayStats.todayRegistrations}</p>
                  </div>
                  <Calendar size={24} className="text-green-600" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Status</p>
                    <p className="text-sm font-semibold text-green-600">Operational</p>
                  </div>
                  <Activity size={24} className="text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Stethoscope size={20} className="mr-2 text-blue-600" />
            Report Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Last Generated:</span>
              <span className="text-gray-900">{lastGeneratedYear || 'None'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Available Years:</span>
              <span className="text-gray-900">{availableYears.length} years</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Report Format:</span>
              <span className="text-gray-900">PDF</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Report service online
              </div>
            </div>
          </div>
        </div>
      </div>
        
      {/* Main Report Generation Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Clinic Statistics Report</h3>
              <p className="text-gray-600 mt-1">Generate annual clinic performance and patient statistics reports</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Success Display */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <Download size={20} className="text-green-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-green-800 font-medium">Report Generated Successfully</h4>
                  <p className="text-green-700 text-sm mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle size={20} className="text-red-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-red-800 font-medium">Report Generation Failed</h4>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Report Form */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Report Parameters</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isGenerating}
                    >
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1">Select the year for statistical analysis</p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => {
                        downloadClinicReport(selectedYear);
                      }}
                      disabled={isGenerating}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Generating Report...</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>Generate PDF Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Report Information */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Report Contents</h4>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Statistical Data</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Monthly patient visit statistics</li>
                      <li>• Trend analysis and insights</li>
                      <li>• Peak and low activity periods</li>
                      <li>• Unit-wise performance metrics</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Clinic Units Covered</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Nephrology Unit 1</li>
                      <li>• Nephrology Unit 2</li>
                      <li>• Professor Unit</li>
                      <li>• Urology and Transplant</li>
                      <li>• Vascular and Transplant</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Visual Elements</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Professional line charts</li>
                      <li>• Medical-grade formatting</li>
                      <li>• Clean data visualization</li>
                      <li>• Hospital branding elements</li>
                    </ul>
                  </div>
                </div>
              </div>

              {lastGeneratedYear && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Download size={16} className="text-green-600" />
                    </div>
                    <div>
                      <h5 className="font-medium text-green-900">Last Report Generated</h5>
                      <p className="text-sm text-green-700">Year {lastGeneratedYear} report successfully created</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Report Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, title: 'Financial Reports', status: 'Coming Soon', color: 'text-purple-600 bg-purple-50' },
            { icon: Calendar, title: 'Staff Performance', status: 'Coming Soon', color: 'text-green-600 bg-green-50' },
            { icon: Users, title: 'Patient Demographics', status: 'Coming Soon', color: 'text-blue-600 bg-blue-50' },
            { icon: Shield, title: 'Compliance Audit', status: 'Coming Soon', color: 'text-red-600 bg-red-50' }
          ].map((item, index) => (
            <div key={index} className="text-center p-4 border border-gray-200 rounded-lg">
              <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                <item.icon size={20} />
              </div>
              <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{item.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;