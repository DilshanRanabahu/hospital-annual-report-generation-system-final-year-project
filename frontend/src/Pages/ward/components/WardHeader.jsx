import { Bed, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WardHeader({ stats = {} }) {
  const navigate = useNavigate();

  // Provide default values for stats to prevent runtime errors
  const safeStats = {
    totalBeds: 58,
    occupiedBeds: 12,
    availableBeds: 46,
    occupancyRate: 21,
    todayAdmissions: 0,
    todayDischarges: 2,
    ...stats
  };

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('empId');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <div className="w-full flex justify-between items-start">
      <div className="w-full">
        {/* Hospital Name and Title */}
        <div className="flex items-center space-x-4 mb-3">
          <div className="relative">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Bed className="w-9 h-9 text-white drop-shadow-lg" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-400 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Ward Management</h1>
            <p className="text-gray-600 text-sm font-medium mt-1">
              National Institute of Nephrology, Dialysis and Transplantation
            </p>
            <div className="flex items-center mt-2 text-gray-500 text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span>Occupied: <span className="font-semibold">{safeStats.occupiedBeds}/{safeStats.totalBeds} beds</span></span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>Available: <span className="font-semibold">{safeStats.availableBeds} beds</span></span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span>Admissions Today: <span className="font-semibold">{safeStats.todayAdmissions}</span></span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
            <span>Discharges Today: <span className="font-semibold">{safeStats.todayDischarges}</span></span>
          </div>
        </div>
      </div>
      
      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="flex-shrink-0 mt-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center shadow-sm hover:shadow"
      >
        <LogOut className="w-5 h-5 mr-2" />
        Logout
      </button>
    </div>
  );
}
