import React from 'react';
import { Heart, Shield, Bell, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = ({ todayStats }) => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('empId');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <header className="bg-white/90 backdrop-blur-md shadow-lg border-b-2 border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-800 to-indigo-900 bg-clip-text text-transparent">
                Clinic Management
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-gray-700 text-sm font-medium flex items-center">
                  <Shield size={14} className="mr-2 text-blue-600" />
                  NINDT Clinic Management - Patient Care System
                </p>
                <div className="hidden md:flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-700 font-medium">System Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden lg:flex items-center space-x-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Patients Under Care</p>
                <p className="text-2xl font-bold text-blue-700">{todayStats.totalPatients}</p>
              </div>
              <div className="w-px h-12 bg-gray-300"></div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Today's Care Visits</p>
                <p className="text-2xl font-bold text-emerald-600">{todayStats.totalAppointments}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors">
                <Bell size={18} />
              </button>
              <button className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                <Settings size={18} />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-colors flex items-center border border-red-100"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Today</p>
              <p className="text-sm font-bold text-gray-900">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric' 
                })}
              </p>
              <p className="text-xs text-gray-600">
                {new Date().toLocaleTimeString('en-US', { 
                  hour12: true,
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;