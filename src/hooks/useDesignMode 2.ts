import { useDesignContext, DesignMode, ComponentType, getContextualMode } from '../context/DesignContext';

// Re-export types for convenience
export type { DesignMode, ComponentType };

// Enhanced hook with additional utilities
export const useDesignMode = () => {
  const context = useDesignContext();
  
  return {
    // Core context properties
    ...context,
    
    // Additional utility functions
    getAnimationClass: (intense: boolean = false): string => {
      if (context.isEnergetic()) {
        return intense ? 'animate-glitch' : 'animate-glitch-subtle';
      } else if (context.isCalm()) {
        return intense ? 'animate-breathe' : 'animate-breathe-slow';
      } else {
        return 'animate-gentle-float';
      }
    },
    
    getShadowClass: (): string => {
      if (context.isEnergetic()) {
        return 'shadow-brutal-punk';
      } else if (context.isCalm()) {
        return 'shadow-soft-calm';
      } else {
        return 'shadow-glow-warm';
      }
    },
    
    getGlowClass: (): string => {
      const { energy } = context.mode;
      switch (energy) {
        case 'high':
          return 'shadow-glow-energy';
        case 'low':
          return 'shadow-glow-calm';
        default:
          return 'shadow-glow-warm';
      }
    },
    
    getTransitionClass: (): string => {
      return context.isCalm() ? 'transition-all duration-500' : 'transition-all duration-200';
    },
    
    // Color class getters
    getBgClass: (): string => {
      if (context.isEnergetic()) {
        return 'bg-energy';
      } else if (context.isCalm()) {
        return 'bg-calm';
      } else {
        return 'bg-warm';
      }
    },
    
    getTextClass: (): string => {
      const { energy } = context.mode;
      switch (energy) {
        case 'high':
          return 'text-black font-bold';
        case 'low':
          return 'text-gray-700 font-medium';
        default:
          return 'text-gray-800 font-semibold';
      }
    },
    
    getBorderClass: (): string => {
      if (context.isEnergetic()) {
        return 'border-2 border-black';
      } else if (context.isCalm()) {
        return 'border border-soft';
      } else {
        return 'border-2 border-fresh';
      }
    },
    
    // Contextual mode helpers
    withContextualMode: (section: Parameters<typeof getContextualMode>[0]) => {
      return getContextualMode(section);
    }
  };
};

// Hook for getting contextual styling based on component purpose
export const useContextualStyling = (
  componentType: ComponentType,
  section?: Parameters<typeof getContextualMode>[0],
  baseClasses?: string
) => {
  const { getVariantClasses } = useDesignContext();
  
  // If section is provided, get contextual mode styling
  if (section) {
    const contextualMode = getContextualMode(section);
    // This would require a way to temporarily override the context mode
    // For now, we'll use the current context mode
  }
  
  return getVariantClasses(componentType, baseClasses);
};

// Hook for responsive design mode (changes based on screen size)
export const useResponsiveDesignMode = () => {
  const context = useDesignContext();
  
  // This could be enhanced to change modes based on screen size
  // For mobile: prefer calmer aesthetics for better usability
  // For desktop: can handle more energetic interactions
  
  return {
    ...context,
    // Mobile-specific adjustments could go here
    getMobileVariantClasses: (componentType: ComponentType, baseClasses?: string): string => {
      // On mobile, prefer calmer interactions for better usability
      const mobileMode: DesignMode = {
        ...context.mode,
        interaction: 'gentle', // Always gentle on mobile
        energy: context.mode.energy === 'high' ? 'medium' : context.mode.energy // Tone down energy on mobile
      };
      
      // This would need a way to temporarily use different mode
      // For now, return regular classes
      return context.getVariantClasses(componentType, baseClasses);
    }
  };
};

export default useDesignMode;
