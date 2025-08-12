import React from 'react';
import { X, TrendingUp, Users, Clock, DollarSign, MapPin, BookOpen, Award } from 'lucide-react';

interface SectorData {
  id: string;
  title: string;
  ukGrowthRate: string;
  averageSalary: string;
  timeToEntry: string;
  ukDemand: string;
  keyRoles: string[];
  skillsRequired: string[];
  educationPaths: string[];
  regionalData: {
    london: string;
    manchester: string;
    edinburgh: string;
    birmingham: string;
  };
  apprenticeshipData: {
    available: number;
    averageWage: string;
    duration: string;
  };
  marketAnalysis: string[];
  careerProgression: string[];
  videos: Array<{
    id: string;
    title: string;
    creator: string;
    role: string;
    salary: string;
    location: string;
  }>;
}

interface SectorDetailModalProps {
  sector: SectorData | null;
  isOpen: boolean;
  onClose: () => void;
}

const SectorDetailModal: React.FC<SectorDetailModalProps> = ({ sector, isOpen, onClose }) => {
  if (!isOpen || !sector) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">{sector.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-green-50 p-4 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-semibold text-gray-900">UK Growth Rate</h3>
              <p className="text-2xl font-bold text-green-600">{sector.ukGrowthRate}</p>
            </div>
            <div className="bg-primary-lavender/10 p-4 rounded-lg">
              <DollarSign className="h-8 w-8 text-primary-green mb-2" />
              <h3 className="font-semibold text-gray-900">Average Salary</h3>
              <p className="text-2xl font-bold text-primary-green">{sector.averageSalary}</p>
            </div>
            <div className="bg-primary-peach/10 p-4 rounded-lg">
              <Clock className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Time to Entry</h3>
              <p className="text-2xl font-bold text-purple-600">{sector.timeToEntry}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <Users className="h-8 w-8 text-orange-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Apprenticeships</h3>
              <p className="text-2xl font-bold text-orange-600">{sector.apprenticeshipData.available}</p>
            </div>
          </div>

          {/* UK Market Demand */}
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-red-900 mb-3">🇬🇧 UK Market Demand</h3>
            <p className="text-red-800">{sector.ukDemand}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Key Roles */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">High-Demand UK Roles</h3>
              <div className="space-y-3">
                {sector.keyRoles.map((role, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-primary-green rounded-full"></div>
                    <span className="font-medium">{role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Required */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Essential Skills</h3>
              <div className="flex flex-wrap gap-2">
                {sector.skillsRequired.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-2 bg-primary-lavender/20 text-primary-black rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Regional Salary Data */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Regional Salary Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold">London</h4>
                <p className="text-lg font-bold text-green-600">{sector.regionalData.london}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold">Manchester</h4>
                <p className="text-lg font-bold text-green-600">{sector.regionalData.manchester}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold">Edinburgh</h4>
                <p className="text-lg font-bold text-green-600">{sector.regionalData.edinburgh}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold">Birmingham</h4>
                <p className="text-lg font-bold text-green-600">{sector.regionalData.birmingham}</p>
              </div>
            </div>
          </div>

          {/* Education Pathways */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              UK Education Pathways
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sector.educationPaths.map((path, index) => (
                <div key={index} className="border border-gray-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Award className="h-4 w-4 text-primary-green" />
                    <span className="font-medium">{path}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Apprenticeship Details */}
          <div className="mt-8 bg-primary-lavender/10 border border-primary-lavender/30 rounded-lg p-6">
            <h3 className="text-xl font-bold text-primary-black mb-4">UK Government Apprenticeships</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-primary-black">Available Positions</h4>
                <p className="text-2xl font-bold text-primary-green">{sector.apprenticeshipData.available}</p>
              </div>
              <div>
                <h4 className="font-semibold text-primary-black">Starting Wage</h4>
                <p className="text-2xl font-bold text-primary-green">{sector.apprenticeshipData.averageWage}</p>
              </div>
              <div>
                <h4 className="font-semibold text-primary-black">Duration</h4>
                <p className="text-2xl font-bold text-primary-green">{sector.apprenticeshipData.duration}</p>
              </div>
            </div>
          </div>

          {/* Market Analysis */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Market Analysis & Trends</h3>
            <div className="space-y-3">
              {sector.marketAnalysis.map((analysis, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">{analysis}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Career Videos */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">UK Professional Videos ({sector.videos.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sector.videos.map((video) => (
                <div key={video.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-900 mb-2">{video.title}</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Professional:</strong> {video.creator}</p>
                    <p><strong>Role:</strong> {video.role}</p>
                    <p><strong>Salary:</strong> {video.salary}</p>
                    <p><strong>Location:</strong> {video.location}</p>
                  </div>
                  <button className="mt-3 w-full bg-primary-green text-primary-black py-2 rounded-lg hover:bg-primary-yellow transition-colors">
                    Watch Career Story
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Career Progression */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Career Progression Path</h3>
            <div className="space-y-4">
              {sector.careerProgression.map((stage, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="bg-primary-green text-primary-black rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{stage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectorDetailModal;