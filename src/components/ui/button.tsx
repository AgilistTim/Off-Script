import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useDesignMode } from "@/hooks/useDesignMode"

const buttonVariants = cva(
  // Base Off Script button styles
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-button-fluid font-medium transition-all duration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Off Script button variants - Preserved
        black: "bg-primary-black text-primary-white border border-primary-black hover:bg-primary-peach hover:text-primary-black hover:border-primary-peach",
        white: "bg-primary-white text-primary-black border border-border-neutral hover:bg-gray-50 hover:border-gray-300",
        light: "bg-gray-50 text-primary-black border border-gray-200 hover:bg-gray-100 hover:border-gray-300",
        dark: "bg-gray-800 text-primary-white border border-gray-800 hover:bg-gray-700",
        
        // New Hybrid Aesthetic Variants - Dice.fm + Calm.com with Heavy Shadows
        energetic: "bg-primary-yellow text-primary-black border-4 border-primary-black hover:bg-primary-green transform hover:rotate-1 hover:scale-105 shadow-[6px_6px_0px_0px_#000000] hover:shadow-[8px_8px_0px_0px_#000000] font-bold transition-all duration-200",
        calm: "bg-primary-mint text-primary-black border-3 border-primary-black hover:bg-primary-lavender transition-all duration-500 rounded-2xl shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000]",
        hybrid: "bg-gradient-to-r from-primary-peach to-primary-yellow text-primary-black hover:from-primary-green hover:to-primary-mint border-4 border-primary-black shadow-[6px_6px_0px_0px_#000000] hover:shadow-[8px_8px_0px_0px_#000000] transform hover:-translate-y-1 transition-all duration-300",
        
        // Additional Contextual Variants with Heavy Shadows
        fresh: "bg-primary-green text-primary-black border-4 border-primary-black hover:bg-primary-yellow shadow-[5px_5px_0px_0px_#000000] hover:shadow-[7px_7px_0px_0px_#000000] transition-all duration-200",
        warm: "bg-primary-peach text-primary-black border-3 border-primary-black hover:bg-primary-yellow shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all duration-400",
        soft: "bg-primary-lavender text-primary-black border-3 border-primary-black hover:bg-primary-mint rounded-2xl shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all duration-600",
        
        // Legacy variants for compatibility - Preserved
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Off Script sizing - large horizontal padding
        default: "px-6 sm:px-8 lg:px-40 py-3 sm:py-4 min-h-[44px]", // Mobile-first responsive sizing
        sm: "px-4 sm:px-6 lg:px-20 py-2 text-sm min-h-[44px]",
        lg: "px-6 sm:px-8 lg:px-48 py-4 sm:py-5 lg:py-6 text-lg min-h-[44px]",
        icon: "h-10 w-10",
        // Compact versions for UI elements
        compact: "px-6 py-2",
        "compact-sm": "px-4 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "black",
      size: "default",
    },
  }
)

// Speech bubble component variants
const speechVariants = cva(
  "block w-full p-speech-padding italic font-medium text-promo-fluid relative transition-all duration-brand no-underline",
  {
    variants: {
      variant: {
        // Legacy variants - Preserved
        blue: "bg-primary-blue text-primary-black",
        peach: "bg-primary-peach text-primary-black",
        
        // New Hybrid Aesthetic Variants - Dice.fm + Calm.com
        energetic: "bg-primary-yellow text-primary-black border-2 border-primary-black shadow-brutal-punk animate-glitch-subtle hover:animate-glitch",
        calm: "bg-primary-mint text-primary-black border border-primary-lavender shadow-soft-calm animate-breathe-slow hover:animate-breathe rounded-2xl",
        hybrid: "bg-gradient-to-br from-primary-peach to-primary-yellow text-primary-black border-2 border-primary-green shadow-glow-warm animate-gentle-float",
        
        // Additional Color Variants
        fresh: "bg-primary-green text-primary-black border-2 border-primary-black shadow-glow-fresh hover:shadow-brutal-punk transition-all duration-300",
        warm: "bg-primary-peach text-primary-black border border-primary-yellow shadow-soft-warm rounded-xl animate-breathe-slow",
        soft: "bg-primary-lavender text-primary-black border border-primary-mint shadow-soft-calm rounded-3xl animate-breathe transition-all duration-500",
        
        // Gradient Variants for Special Cases
        sunset: "bg-gradient-to-r from-primary-peach to-primary-yellow text-primary-black border border-primary-green",
        ocean: "bg-gradient-to-r from-primary-mint to-primary-lavender text-primary-black border border-primary-peach",
        nature: "bg-gradient-to-r from-primary-green to-primary-mint text-primary-black border border-primary-yellow",
      }
    },
    defaultVariants: {
      variant: "hybrid",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export interface SpeechProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof speechVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// Speech bubble component for Off Script design system
const Speech = React.forwardRef<HTMLAnchorElement, SpeechProps>(
  ({ className, variant, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "a"
    return (
      <Comp
        className={cn(speechVariants({ variant, className }), "speech")}
        ref={ref}
        {...props}
      >
        {children}
        <div 
          className={cn(
            "absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[20px] border-r-[20px] border-l-transparent border-r-transparent",
            {
              // Legacy variants - Preserved
              "border-t-[20px] border-t-primary-blue": variant === "blue",
              
              // Yellow variants - Combined
              "border-t-[20px] border-t-primary-yellow": variant === "energetic" || variant === "hybrid" || variant === "sunset",
              
              // Mint variants
              "border-t-[20px] border-t-primary-mint": variant === "calm" || variant === "nature",
              
              // Green variants
              "border-t-[20px] border-t-primary-green": variant === "fresh",
              
              // Peach variants - Combined
              "border-t-[20px] border-t-primary-peach": variant === "peach" || variant === "warm",
              
              // Lavender variants - Combined
              "border-t-[20px] border-t-primary-lavender": variant === "soft" || variant === "ocean",
            }
          )}
        />
      </Comp>
    )
  }
)
Speech.displayName = "Speech"

// Context-aware speech bubble component that automatically chooses aesthetic based on design context
export interface ContextualSpeechProps extends Omit<SpeechProps, 'variant'> {
  mood?: 'excited' | 'calm' | 'neutral' | 'warm' | 'fresh';
  fallbackVariant?: SpeechProps['variant'];
}

const ContextualSpeech = React.forwardRef<HTMLAnchorElement, ContextualSpeechProps>(
  ({ className, mood = 'neutral', fallbackVariant = 'hybrid', asChild = false, children, ...props }, ref) => {
    try {
      const { isEnergetic, isCalm, mode } = useDesignMode();
      
      // Determine variant based on design context and mood
      let variant: SpeechProps['variant'] = fallbackVariant;
      
      if (mood === 'excited') {
        // Excited speech bubbles should be energetic
        variant = 'energetic';
      } else if (mood === 'calm') {
        // Calm speech bubbles should be serene
        variant = 'calm';
      } else if (mood === 'warm') {
        // Warm speech bubbles use warm colors
        variant = 'warm';
      } else if (mood === 'fresh') {
        // Fresh speech bubbles use fresh colors
        variant = 'fresh';
      } else if (mood === 'neutral') {
        // Neutral bubbles adapt to context
        if (isEnergetic()) {
          variant = mode.energy === 'high' ? 'energetic' : 'fresh';
        } else if (isCalm()) {
          variant = mode.energy === 'low' ? 'soft' : 'calm';
        } else {
          variant = 'hybrid';
        }
      }
      
      const Comp = asChild ? Slot : "a";
      return (
        <Comp
          className={cn(speechVariants({ variant, className }), "speech")}
          ref={ref}
          {...props}
        >
          {children}
          <div 
            className={cn(
              "absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[20px] border-r-[20px] border-l-transparent border-r-transparent",
              {
                // Legacy variants - Preserved
                "border-t-[20px] border-t-primary-blue": variant === "blue",
                
                // Yellow variants - Combined
                "border-t-[20px] border-t-primary-yellow": variant === "energetic" || variant === "hybrid" || variant === "sunset",
                
                // Mint variants
                "border-t-[20px] border-t-primary-mint": variant === "calm" || variant === "nature",
                
                // Green variants
                "border-t-[20px] border-t-primary-green": variant === "fresh",
                
                // Peach variants - Combined
                "border-t-[20px] border-t-primary-peach": variant === "peach" || variant === "warm",
                
                // Lavender variants - Combined
                "border-t-[20px] border-t-primary-lavender": variant === "soft" || variant === "ocean",
              }
            )}
          />
        </Comp>
      );
    } catch (error) {
      // Fallback to regular speech bubble if context is not available
      const Comp = asChild ? Slot : "a";
      return (
        <Comp
          className={cn(speechVariants({ variant: fallbackVariant, className }), "speech")}
          ref={ref}
          {...props}
        >
          {children}
          <div 
            className={cn(
              "absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[20px] border-r-[20px] border-l-transparent border-r-transparent",
              {
                "border-t-[20px] border-t-primary-yellow": fallbackVariant === "hybrid",
                "border-t-[20px] border-t-primary-blue": fallbackVariant === "blue",
                "border-t-[20px] border-t-primary-peach": fallbackVariant === "peach",
              }
            )}
          />
        </Comp>
      );
    }
  }
);

ContextualSpeech.displayName = "ContextualSpeech";

// Context-aware button component that automatically chooses aesthetic based on design context
export interface ContextualButtonProps extends Omit<ButtonProps, 'variant'> {
  intent?: 'primary' | 'secondary' | 'cta' | 'chat-cta' | 'navigation' | 'form';
  fallbackVariant?: ButtonProps['variant'];
}

const ContextualButton = React.forwardRef<HTMLButtonElement, ContextualButtonProps>(
  ({ className, intent = 'primary', fallbackVariant = 'hybrid', asChild = false, ...props }, ref) => {
    try {
      const { isEnergetic, isCalm, mode } = useDesignMode();
      
      // Determine variant based on design context and intent
      let variant: ButtonProps['variant'] = fallbackVariant;
      
      if (intent === 'chat-cta') {
        // Chat CTAs should use yellow (energetic variant)
        variant = 'energetic';
      } else if (intent === 'cta') {
        // Other CTAs use different colors to differentiate
        variant = 'fresh'; // Green for general CTAs
      } else if (intent === 'form') {
        // Form buttons should be calm
        variant = 'calm';
      } else if (intent === 'navigation') {
        // Navigation buttons adapt to context
        variant = isCalm() ? 'soft' : 'fresh';
      } else if (intent === 'primary') {
        // Primary buttons follow the current aesthetic
        if (isEnergetic()) {
          variant = mode.energy === 'high' ? 'energetic' : 'fresh';
        } else if (isCalm()) {
          variant = mode.energy === 'low' ? 'soft' : 'calm';
        } else {
          variant = 'hybrid';
        }
      } else if (intent === 'secondary') {
        // Secondary buttons are always softer
        variant = isEnergetic() ? 'warm' : 'soft';
      }
      
      const Comp = asChild ? Slot : "button";
      return (
        <Comp
          className={cn(buttonVariants({ variant, className }))}
          ref={ref}
          {...props}
        />
      );
    } catch (error) {
      // Fallback to regular button if context is not available
      const Comp = asChild ? Slot : "button";
      return (
        <Comp
          className={cn(buttonVariants({ variant: fallbackVariant, className }))}
          ref={ref}
          {...props}
        />
      );
    }
  }
);

ContextualButton.displayName = "ContextualButton";

export { Button, Speech, ContextualButton, ContextualSpeech, buttonVariants, speechVariants }
