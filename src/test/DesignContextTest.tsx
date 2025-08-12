import React from 'react';
import { DesignProvider } from '../context/DesignContext';
import { useDesignMode } from '../hooks/useDesignMode';

// Test component to verify design context functionality
const TestComponent: React.FC = () => {
  const { 
    mode, 
    getVariantClasses, 
    isEnergetic, 
    isCalm, 
    isHybrid,
    getAnimationClass,
    getShadowClass,
    getBgClass 
  } = useDesignMode();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Design Context Test</h2>
      
      {/* Display current mode */}
      <div className="p-3 border rounded">
        <h3 className="font-semibold">Current Mode:</h3>
        <p>Aesthetic: {mode.aesthetic}</p>
        <p>Energy: {mode.energy}</p>
        <p>Interaction: {mode.interaction}</p>
        <p>Is Energetic: {isEnergetic() ? 'Yes' : 'No'}</p>
        <p>Is Calm: {isCalm() ? 'Yes' : 'No'}</p>
        <p>Is Hybrid: {isHybrid() ? 'Yes' : 'No'}</p>
      </div>

      {/* Test button styling */}
      <div className="space-y-2">
        <h3 className="font-semibold">Button Variants:</h3>
        <button className={getVariantClasses('button', 'px-4 py-2 rounded')}>
          Contextual Button
        </button>
      </div>

      {/* Test card styling */}
      <div className="space-y-2">
        <h3 className="font-semibold">Card Variants:</h3>
        <div className={getVariantClasses('card', 'p-4')}>
          <p>This is a contextual card</p>
        </div>
      </div>

      {/* Test utility classes */}
      <div className="space-y-2">
        <h3 className="font-semibold">Utility Classes:</h3>
        <div className={`p-2 ${getBgClass()} ${getShadowClass()} ${getAnimationClass()}`}>
          Animated background with shadow
        </div>
      </div>
    </div>
  );
};

// Main test component with different providers
export const DesignContextTest: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {/* Energetic Mode Test */}
      <DesignProvider mode={{ aesthetic: 'dice', energy: 'high', interaction: 'energetic' }}>
        <div className="border-2 border-red-500 rounded-lg">
          <h2 className="p-2 bg-red-100 font-bold">Dice.fm (Energetic)</h2>
          <TestComponent />
        </div>
      </DesignProvider>

      {/* Calm Mode Test */}
      <DesignProvider mode={{ aesthetic: 'calm', energy: 'low', interaction: 'gentle' }}>
        <div className="border-2 border-blue-500 rounded-lg">
          <h2 className="p-2 bg-blue-100 font-bold">Calm.com (Serene)</h2>
          <TestComponent />
        </div>
      </DesignProvider>

      {/* Hybrid Mode Test */}
      <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'gentle' }}>
        <div className="border-2 border-green-500 rounded-lg">
          <h2 className="p-2 bg-green-100 font-bold">Hybrid (Default)</h2>
          <TestComponent />
        </div>
      </DesignProvider>
    </div>
  );
};

export default DesignContextTest;
