import React, { createContext, useContext, ReactNode } from 'react';

// Design Mode Interface
export interface DesignMode {
  aesthetic: 'dice' | 'calm' | 'hybrid';
  energy: 'low' | 'medium' | 'high';
  interaction: 'gentle' | 'energetic';
}

// Context Type Definition
interface DesignContextType {
  mode: DesignMode;
  getVariantClasses: (componentType: ComponentType, baseClasses?: string) => string;
  isEnergetic: () => boolean;
  isCalm: () => boolean;
  isHybrid: () => boolean;
}

// Component Type Enum for Styling
export type ComponentType = 
  | 'button'
  | 'card' 
  | 'speech-bubble'
  | 'background'
  | 'text'
  | 'input'
  | 'modal'
  | 'hero'
  | 'content';

// Default Design Mode
const defaultMode: DesignMode = {
  aesthetic: 'hybrid',
  energy: 'medium',
  interaction: 'gentle'
};

// Create Context
const DesignContext = createContext<DesignContextType | undefined>(undefined);

// Provider Props
interface DesignProviderProps {
  children: ReactNode;
  mode?: Partial<DesignMode>;
  className?: string;
}

// Design Provider Component
export const DesignProvider: React.FC<DesignProviderProps> = ({ 
  children, 
  mode: providedMode,
  className 
}) => {
  // Merge provided mode with defaults
  const mode: DesignMode = {
    ...defaultMode,
    ...providedMode
  };

  // Helper function to get variant classes based on component type and mode
  const getVariantClasses = (componentType: ComponentType, baseClasses: string = ''): string => {
    const { aesthetic, energy, interaction } = mode;
    
    // Base classes always included
    let classes = baseClasses;

    // Component-specific styling based on aesthetic mode
    switch (componentType) {
      case 'button':
        if (aesthetic === 'dice' || (aesthetic === 'hybrid' && energy === 'high')) {
          classes += ' bg-energy text-black border-2 border-black hover:bg-fresh transform hover:rotate-1 hover:scale-105 shadow-brutal-punk font-bold';
        } else if (aesthetic === 'calm' || (aesthetic === 'hybrid' && energy === 'low')) {
          classes += ' bg-calm text-black border border-soft hover:bg-soft transition-all duration-500 rounded-full shadow-soft-calm';
        } else {
          // Hybrid medium energy
          classes += ' bg-gradient-to-r from-warm to-energy hover:from-fresh hover:to-calm border-2 border-black hover:shadow-glow-energy transform hover:-translate-y-1';
        }
        break;

      case 'card':
        if (aesthetic === 'dice' || interaction === 'energetic') {
          classes += ' border-4 border-black transform rotate-1 hover:rotate-0 shadow-brutal bg-energy';
        } else if (aesthetic === 'calm') {
          classes += ' rounded-3xl border border-soft shadow-soft-calm backdrop-blur-sm bg-calm';
        } else {
          classes += ' bg-gradient-to-br from-warm/80 to-soft/80 border-2 border-fresh rounded-2xl shadow-glow-warm';
        }
        break;

      case 'speech-bubble':
        if (aesthetic === 'dice' || energy === 'high') {
          classes += ' bg-energy border-2 border-black shadow-brutal-punk animate-glitch-subtle';
        } else if (aesthetic === 'calm') {
          classes += ' bg-calm border border-soft shadow-soft-calm animate-breathe';
        } else {
          classes += ' bg-warm border-2 border-fresh animate-gentle-float';
        }
        break;

      case 'background':
        if (aesthetic === 'calm') {
          classes += ' bg-gradient-to-br from-calm via-soft to-warm';
        } else if (aesthetic === 'dice') {
          classes += ' bg-gradient-to-br from-energy via-fresh to-warm';
        } else {
          classes += ' bg-gradient-organic';
        }
        break;

      case 'text':
        if (energy === 'high') {
          classes += ' font-bold text-black';
        } else if (energy === 'low') {
          classes += ' font-medium text-gray-700';
        } else {
          classes += ' font-semibold text-gray-800';
        }
        break;

      case 'input':
        if (aesthetic === 'dice') {
          classes += ' border-2 border-black focus:border-energy focus:shadow-glow-energy bg-energy/10';
        } else {
          classes += ' border border-soft focus:border-fresh focus:shadow-glow-calm bg-calm/50';
        }
        break;

      case 'modal':
        if (aesthetic === 'dice') {
          classes += ' border-4 border-black shadow-brutal-heavy bg-energy';
        } else {
          classes += ' border border-soft shadow-soft-calm backdrop-blur-sm bg-calm/90';
        }
        break;

      case 'hero':
        classes += ' bg-gradient-organic';
        break;

      case 'content':
        classes += ' bg-calm/30';
        break;

      default:
        break;
    }

    // Add animation classes based on interaction mode
    if (interaction === 'energetic' && componentType !== 'background') {
      classes += ' hover:animate-punk-bounce';
    } else if (interaction === 'gentle' && componentType !== 'background') {
      classes += ' hover:animate-calm-fade';
    }

    return classes.trim();
  };

  // Helper functions for mode checking
  const isEnergetic = (): boolean => mode.aesthetic === 'dice' || mode.energy === 'high';
  const isCalm = (): boolean => mode.aesthetic === 'calm' || mode.energy === 'low';
  const isHybrid = (): boolean => mode.aesthetic === 'hybrid';

  const contextValue: DesignContextType = {
    mode,
    getVariantClasses,
    isEnergetic,
    isCalm,
    isHybrid
  };

  return (
    <DesignContext.Provider value={contextValue}>
      <div className={className}>
        {children}
      </div>
    </DesignContext.Provider>
  );
};

// Custom Hook for Design Context
export const useDesignContext = (): DesignContextType => {
  const context = useContext(DesignContext);
  if (!context) {
    throw new Error('useDesignContext must be used within a DesignProvider');
  }
  return context;
};

// Export the context for direct use if needed
export { DesignContext };

// Utility function to determine mode based on section/component purpose
export const getContextualMode = (
  section: 'hero' | 'cta' | 'content' | 'form' | 'navigation' | 'modal'
): DesignMode => {
  switch (section) {
    case 'hero':
      return { aesthetic: 'hybrid', energy: 'high', interaction: 'energetic' };
    case 'cta':
      return { aesthetic: 'dice', energy: 'high', interaction: 'energetic' };
    case 'content':
      return { aesthetic: 'calm', energy: 'medium', interaction: 'gentle' };
    case 'form':
      return { aesthetic: 'calm', energy: 'low', interaction: 'gentle' };
    case 'navigation':
      return { aesthetic: 'hybrid', energy: 'medium', interaction: 'gentle' };
    case 'modal':
      return { aesthetic: 'calm', energy: 'low', interaction: 'gentle' };
    default:
      return defaultMode;
  }
};
