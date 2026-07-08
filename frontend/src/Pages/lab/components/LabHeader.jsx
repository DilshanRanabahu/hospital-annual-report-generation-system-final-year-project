import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TestTube,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Microscope,
  LogOut
} from 'lucide-react';

export default function LabHeader({ stats = {} }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('empId');
    localStorage.removeItem('role');
    navigate('/');
  };

  // Provide default values for stats to prevent runtime errors
  const safeStats = {
    todayTests: 0,
    pendingTests: 0,
    inProgressTests: 0,
    completedTests: 0,
    urgentTests: 0,
    criticalResults: 0,
    completionRate: 0,
    equipmentUtilization: 0,
    ...stats
  };

  const statCards = [
    {
      label: 'Today\'s Tests',
      value: safeStats.todayTests,
      icon: TestTube,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      label: 'Pending Orders',
      value: safeStats.pendingTests,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200'
    },
    {
      label: 'In Progress',
      value: safeStats.inProgressTests,
      icon: Activity,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200'
    },
    {
      label: 'Completed Today',
      value: safeStats.completedTests,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    {
      label: 'Urgent Tests',
      value: safeStats.urgentTests,
      icon: AlertCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-200'
    },
    {
      label: 'Critical Results',
      value: safeStats.criticalResults,
      icon: AlertCircle,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    }
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md shadow-lg border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          {/* Hospital Identity */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                <Microscope size={24} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                <Activity size={12} className="text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Laboratory Dashboard</h1>
              <p className="text-sm text-gray-600">National Institute of Nephrology, Dialysis and Transplantation</p>
              <div className="flex items-center mt-1 space-x-4 text-xs text-gray-500">
                <span className="flex items-center">
                  <Users size={12} className="mr-1" />
                  Lab Department
                </span>
                <span className="flex items-center">
                  <TrendingUp size={12} className="mr-1" />
                  {safeStats.completionRate}% Completion Rate
                </span>
                <span className="flex items-center">
                  <Activity size={12} className="mr-1" />
                  {safeStats.equipmentUtilization}% Equipment Utilization
                </span>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="hidden lg:flex items-center space-x-6 text-right">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-xs text-gray-600">
                {new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center shadow-sm hover:shadow"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pb-6">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className={`${stat.bgColor} ${stat.borderColor} border-2 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:scale-105`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-semibold ${stat.textColor} uppercase tracking-wide`}>
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold ${stat.textColor} mt-1`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <stat.icon size={20} className={stat.textColor} />
                </div>
              </div>

              {/* Trend indicator for specific cards */}
              {(stat.label === 'Completed Today' || stat.label === 'Today\'s Tests') && (
                <div className="mt-2 flex items-center">
                  <TrendingUp size={12} className={`${stat.textColor} mr-1 opacity-70`} />
                  <span className={`text-xs ${stat.textColor} opacity-70`}>
                    {stat.label === 'Completed Today' ? 'vs yesterday' : 'scheduled'}
                  </span>
                </div>
              )}

              {/* Alert indicators */}
              {(stat.label === 'Urgent Tests' || stat.label === 'Critical Results') && stat.value > 0 && (
                <div className="mt-2">
                  <div className={`w-full ${stat.bgColor} rounded-full h-1`}>
                    <div
                      className={`bg-${stat.color}-400 h-1 rounded-full animate-pulse`}
                      style={{ width: `${Math.min((stat.value / 10) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}