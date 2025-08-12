import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useDesignMode } from "@/hooks/useDesignMode"

// Card component variants supporting hybrid dice.fm + calm.com aesthetics
const cardVariants = cva(
  "transition-all duration-300 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Legacy variant - preserved for backward compatibility
        default: "rounded-xl border bg-card text-card-foreground shadow",
        
        // Dice.fm inspired - energetic punk styling
        energetic: "bg-primary-yellow text-primary-black border-4 border-primary-black transform rotate-1 hover:rotate-0 shadow-brutal-punk hover:shadow-brutal-heavy transition-all duration-200 rounded-lg",
        punk: "bg-primary-green text-primary-black border-4 border-primary-black transform -rotate-1 hover:rotate-1 shadow-brutal-punk hover:shadow-glow-fresh transition-all duration-300 rounded-none",
        
        // Calm.com inspired - serene styling
        calm: "bg-primary-mint text-primary-black border border-primary-lavender shadow-soft-calm hover:shadow-glow-calm rounded-3xl backdrop-blur-sm transition-all duration-500 animate-breathe-slow",
        serene: "bg-primary-lavender text-primary-black border border-primary-mint shadow-soft-warm rounded-2xl transition-all duration-600 hover:bg-primary-mint",
        
        // Hybrid variants - blending both aesthetics
        hybrid: "bg-gradient-to-br from-primary-peach/80 to-primary-lavender/80 text-primary-black border-2 border-primary-green shadow-glow-warm hover:shadow-brutal-punk rounded-2xl transition-all duration-400",
        balanced: "bg-gradient-to-r from-primary-mint to-primary-peach text-primary-black border-2 border-primary-yellow hover:border-primary-green shadow-soft-calm hover:shadow-glow-energy rounded-xl transition-all duration-350",
        
        // Additional contextual variants
        warm: "bg-primary-peach text-primary-black border border-primary-yellow shadow-soft-warm hover:shadow-glow-warm rounded-2xl transition-all duration-400 hover:bg-primary-yellow",
        fresh: "bg-primary-green text-primary-black border-2 border-primary-black shadow-glow-fresh hover:shadow-brutal-punk rounded-lg transition-all duration-250 hover:transform hover:scale-105",
        soft: "bg-primary-lavender/60 text-primary-black border border-primary-mint shadow-soft-calm rounded-3xl backdrop-blur-md transition-all duration-500 hover:bg-primary-mint/60",
        
        // Special gradient variants
        sunset: "bg-gradient-to-br from-primary-peach to-primary-yellow text-primary-black border-2 border-primary-green rounded-2xl shadow-glow-warm",
        ocean: "bg-gradient-to-br from-primary-mint to-primary-lavender text-primary-black border border-primary-peach rounded-3xl shadow-soft-calm",
        nature: "bg-gradient-to-br from-primary-green to-primary-mint text-primary-black border-2 border-primary-yellow rounded-xl shadow-glow-fresh",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        xl: "p-10",
        compact: "p-3",
      },
      elevation: {
        flat: "shadow-none",
        low: "shadow-sm",
        medium: "shadow-md", 
        high: "shadow-lg",
        brutal: "shadow-brutal",
      }
    },
    defaultVariants: {
      variant: "hybrid",
      size: "default",
      elevation: "medium",
    },
  }
)

// Enhanced Card component with variant support
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, elevation, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, elevation }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Context-aware card component that automatically chooses aesthetic based on design context
export interface ContextualCardProps extends Omit<CardProps, 'variant'> {
  purpose?: 'content' | 'interactive' | 'highlight' | 'navigation' | 'data';
  mood?: 'energetic' | 'calm' | 'neutral' | 'warm';
  fallbackVariant?: CardProps['variant'];
}

const ContextualCard = React.forwardRef<HTMLDivElement, ContextualCardProps>(
  ({ 
    className, 
    purpose = 'content', 
    mood = 'neutral',
    fallbackVariant = 'hybrid', 
    size, 
    elevation, 
    ...props 
  }, ref) => {
    try {
      const { isEnergetic, isCalm, mode } = useDesignMode();
      
      // Determine variant based on design context, purpose, and mood
      let variant: CardProps['variant'] = fallbackVariant;
      
      if (mood === 'energetic') {
        // Energetic mood always uses energetic variants
        variant = 'energetic';
      } else if (mood === 'calm') {
        // Calm mood always uses calm variants
        variant = 'calm';
      } else if (mood === 'warm') {
        // Warm mood uses warm variants
        variant = 'warm';
      } else if (mood === 'neutral') {
        // Neutral mood adapts to context and purpose
        if (purpose === 'interactive') {
          // Interactive cards should be engaging but not tilted
          variant = 'balanced';
        } else if (purpose === 'highlight') {
          // Highlight cards stand out but stay straight
          variant = isEnergetic() ? 'fresh' : 'warm';
        } else if (purpose === 'navigation') {
          // Navigation cards are balanced
          variant = 'balanced';
        } else if (purpose === 'data') {
          // Data cards are clean and readable
          variant = isCalm() ? 'serene' : 'soft';
        } else if (purpose === 'content') {
          // Content cards follow the current aesthetic
          if (isEnergetic()) {
            variant = mode.energy === 'high' ? 'fresh' : 'fresh';
          } else if (isCalm()) {
            variant = mode.energy === 'low' ? 'soft' : 'calm';
          } else {
            variant = 'hybrid';
          }
        }
      }
      
      return (
        <div
          ref={ref}
          className={cn(cardVariants({ variant, size, elevation }), className)}
          {...props}
        />
      );
    } catch (error) {
      // Fallback to regular card if context is not available
      return (
        <div
          ref={ref}
          className={cn(cardVariants({ variant: fallbackVariant, size, elevation }), className)}
          {...props}
        />
      );
    }
  }
);

ContextualCard.displayName = "ContextualCard";

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  ContextualCard,
  cardVariants 
}
