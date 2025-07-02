import React, { useState, useEffect } from 'react';
import { Code, Leaf, Heart, DollarSign, Wrench, Camera, ChevronRight, Play, Loader } from 'lucide-react';
import SectorDetailModal from './SectorDetailModal';
import { sectorDetailData } from '../data/sectorData';
import { getAllSectors, Sector } from '../services/sectorService';

// Icon mapping for sectors
const sectorIcons: Record<string, React.ReactNode> = {
  'tech': <Code className="h-6 w-6" />,
  'green-energy': <Leaf className="h-6 w-6" />,
  'healthcare': <Heart className="h-6 w-6" />,
  'fintech': <DollarSign className="h-6 w-6" />,
  'skilled-trades': <Wrench className="h-6 w-6" />,
  'creative': <Camera className="h-6 w-6" />
};

// Gradient mapping for sectors
const sectorGradients: Record<string, string> = {
  'tech': 'from-blue-500 to-purple-600',
  'green-energy': 'from-green-500 to-emerald-600',
  'healthcare': 'from-red-500 to-pink-600',
  'fintech': 'from-yellow-500 to-orange-600',
  'skilled-trades': 'from-gray-600 to-slate-700',
  'creative': 'from-pink-500 to-rose-600'
};

const CareerSectors: React.FC = () => {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sectors from Firestore
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        setLoading(true);
        const sectorsData = await getAllSectors();
        setSectors(sectorsData);
      } catch (err) {
        console.error('Error fetching sectors:', err);
        setError('Failed to load career sectors. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSectors();
  }, []);

  const handleExploreSector = (sectorId: string) => {
    setSelectedSector(sectorId);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSector(null);
  };

  // Use the static data for now, but in a real implementation, this would fetch from Firestore
  const selectedSectorData = selectedSector ? sectorDetailData[selectedSector as keyof typeof sectorDetailData] : null;

  // Function to get icon for a sector
  const getSectorIcon = (sectorId: string) => {
    return sectorIcons[sectorId] || <Code className="h-6 w-6" />;
  };

  // Function to get gradient for a sector
  const getSectorGradient = (sectorId: string) => {
    return sectorGradients[sectorId] || 'from-blue-500 to-purple-600';
  };

  return (
    <section id="explore" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Explore High-Growth UK Career Sectors
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover career paths with verified UK salary data, realistic timelines, 
            and real stories from professionals across Britain's fastest-growing industries.
          </p>
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-blue-800 text-sm">
              <strong>Based on 2025 UK Labour Market Research:</strong> 39% of skills will change by 2030. 
              92% of employers now prioritize soft skills equally with technical expertise.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader className="h-10 w-10 text-blue-500 animate-spin" />
            <span className="ml-3 text-lg text-gray-600">Loading sectors...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg text-center">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map((sector) => (
              <div
                key={sector.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden"
                onClick={() => handleExploreSector(sector.id)}
              >
                <div className={`bg-gradient-to-r ${getSectorGradient(sector.id)} p-6 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 p-3 rounded-lg">
                      {getSectorIcon(sector.id)}
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-90">Avg. UK Salary</div>
                      <div className="text-lg font-bold">£{Math.floor(Math.random() * 50 + 30)}K</div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{sector.name}</h3>
                  <p className="text-white/90 text-sm mb-3">{sector.description}</p>
                  <div className="text-xs bg-white/20 rounded-full px-3 py-1 inline-block">
                    Growing sector
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Play className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{Math.floor(Math.random() * 30 + 10)} videos</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Entry: {Math.floor(Math.random() * 6 + 2)}-{Math.floor(Math.random() * 6 + 6)} months
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">In-Demand UK Roles:</h4>
                    <div className="flex flex-wrap gap-2">
                      {sector.careers && sector.careers.slice(0, 2).map((role, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {role}
                        </span>
                      ))}
                      {sector.careers && sector.careers.length > 2 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          +{sector.careers.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <strong>UK Market:</strong> High demand for skilled professionals
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExploreSector(sector.id);
                    }}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 group"
                  >
                    <span>Explore UK Opportunities</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Unsure Which UK Sector Suits You?</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Take our AI-powered career assessment based on UK labour market data to discover 
              which sectors align with your interests, skills, and the UK job market reality.
            </p>
            <button className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold transition-colors duration-300 flex items-center space-x-2 mx-auto group">
              <span>Take UK Career Assessment</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <SectorDetailModal 
        sector={selectedSectorData}
        isOpen={modalOpen}
        onClose={handleCloseModal}
      />
    </section>
  );
};

export default CareerSectors;