import React from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useDesignMode } from '@/hooks/useDesignMode';

// Speech bubble variants supporting dice.fm + calm.com aesthetics
const speechBubbleVariants = cva(
  "relative inline-block max-w-sm lg:max-w-md xl:max-w-lg p-4 rounded-3xl text-sm font-medium leading-relaxed transition-all duration-300",
  {
    variants: {
      variant: {
        // User speech bubbles (right side)
        user: "bg-primary-green text-primary-black ml-auto rounded-br-sm shadow-glow-fresh",
        "user-energetic": "bg-primary-yellow text-primary-black ml-auto rounded-br-sm shadow-brutal-punk border-2 border-primary-black",
        "user-calm": "bg-primary-mint text-primary-black ml-auto rounded-br-lg shadow-soft-calm",
        
        // Assistant speech bubbles (left side)  
        assistant: "bg-primary-lavender text-primary-black mr-auto rounded-bl-sm shadow-soft-calm",
        "assistant-energetic": "bg-primary-peach text-primary-black mr-auto rounded-bl-sm shadow-glow-warm border-2 border-primary-green",
        "assistant-calm": "bg-primary-mint/60 text-primary-black mr-auto rounded-bl-lg shadow-soft-calm backdrop-blur-sm",
        
        // System messages (centered)
        system: "bg-primary-white/80 text-primary-black mx-auto rounded-2xl shadow-sm border border-primary-black/10 backdrop-blur-sm",
        
        // Special variants
        warm: "bg-primary-peach text-primary-black rounded-3xl shadow-glow-warm",
        fresh: "bg-primary-green text-primary-black rounded-3xl shadow-glow-fresh border border-primary-black",
        soft: "bg-primary-lavender/70 text-primary-black rounded-3xl shadow-soft-calm backdrop-blur-md",
      },
      size: {
        sm: "p-3 text-xs max-w-xs",
        default: "p-4 text-sm max-w-sm lg:max-w-md", 
        lg: "p-5 text-base max-w-md lg:max-w-lg",
        xl: "p-6 text-lg max-w-lg lg:max-w-xl",
      },
      animation: {
        none: "",
        fadeIn: "animate-in fade-in-0 duration-300",
        slideIn: "animate-in slide-in-from-bottom-2 duration-400",
        bounceIn: "animate-in zoom-in-75 duration-300",
        breathe: "animate-breathe-slow",
        float: "animate-gentle-float",
      }
    },
    defaultVariants: {
      variant: "assistant",
      size: "default", 
      animation: "fadeIn",
    },
  }
);

// Speech bubble tail/pointer component
const SpeechTail: React.FC<{
  variant: string;
  isUser: boolean;
  className?: string;
}> = ({ variant, isUser, className }) => {
  const getColorClasses = () => {
    // Map variant to appropriate tail color
    switch (variant) {
      case 'user':
      case 'fresh':
        return 'border-t-primary-green';
      case 'user-energetic':
        return 'border-t-primary-yellow';
      case 'user-calm':
      case 'assistant-calm':
        return 'border-t-primary-mint';
      case 'assistant':
        return 'border-t-primary-lavender';
      case 'assistant-energetic':
      case 'warm':
        return 'border-t-primary-peach';
      case 'soft':
        return 'border-t-primary-lavender';
      case 'system':
        return 'border-t-primary-white';
      default:
        return 'border-t-primary-lavender';
    }
  };

  const tailColorClass = getColorClasses();
  
  return (
    <div 
      className={cn(
        "absolute w-0 h-0 border-l-[12px] border-r-[12px] border-l-transparent border-r-transparent border-t-[12px]",
        tailColorClass,
        isUser 
          ? "bottom-0 right-4 transform translate-y-full" 
          : "bottom-0 left-4 transform translate-y-full",
        className
      )}
    />
  );
};

export interface SpeechBubbleProps 
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'>,
    VariantProps<typeof speechBubbleVariants> {
  isUser?: boolean;
  showTail?: boolean;
  children: React.ReactNode;
}

export const SpeechBubble = React.forwardRef<HTMLDivElement, SpeechBubbleProps>(
  ({ 
    className, 
    variant, 
    size, 
    animation, 
    isUser = false, 
    showTail = true,
    children, 
    ...props 
  }, ref) => {
    // Auto-determine variant based on user type if not specified
    const finalVariant = variant || (isUser ? 'user' : 'assistant');
    
    return (
      <motion.div
        ref={ref}
        className={cn(
          speechBubbleVariants({ variant: finalVariant, size, animation }),
          className
        )}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        {...props}
      >
        {children}
        {showTail && <SpeechTail variant={finalVariant} isUser={isUser} />}
      </motion.div>
    );
  }
);

SpeechBubble.displayName = "SpeechBubble";

// Context-aware speech bubble that automatically chooses styling
export interface ContextualSpeechBubbleProps extends Omit<SpeechBubbleProps, 'variant'> {
  mood?: 'energetic' | 'calm' | 'neutral' | 'warm' | 'fresh';
  fallbackVariant?: SpeechBubbleProps['variant'];
}

export const ContextualSpeechBubble = React.forwardRef<HTMLDivElement, ContextualSpeechBubbleProps>(
  ({ 
    className, 
    mood = 'neutral',
    isUser = false,
    fallbackVariant,
    size, 
    animation, 
    showTail = true,
    children, 
    ...props 
  }, ref) => {
    try {
      const { isEnergetic, isCalm, mode } = useDesignMode();
      
      // Determine variant based on design context, user type, and mood
      let variant: SpeechBubbleProps['variant'] = fallbackVariant;
      
      if (mood === 'energetic') {
        variant = isUser ? 'user-energetic' : 'assistant-energetic';
      } else if (mood === 'calm') {
        variant = isUser ? 'user-calm' : 'assistant-calm';
      } else if (mood === 'warm') {
        variant = 'warm';
      } else if (mood === 'fresh') {
        variant = 'fresh';
      } else if (mood === 'neutral') {
        // Neutral mood adapts to context
        if (isEnergetic()) {
          variant = isUser ? 'user-energetic' : 'assistant-energetic';
        } else if (isCalm()) {
          variant = isUser ? 'user-calm' : 'assistant-calm';
        } else {
          variant = isUser ? 'user' : 'assistant';
        }
      }

      // Fallback to default if no variant determined
      if (!variant) {
        variant = isUser ? 'user' : 'assistant';
      }
      
      return (
        <SpeechBubble
          ref={ref}
          variant={variant}
          size={size}
          animation={animation}
          isUser={isUser}
          showTail={showTail}
          className={className}
          {...props}
        >
          {children}
        </SpeechBubble>
      );
    } catch (error) {
      // Fallback to regular speech bubble if context is not available
      return (
        <SpeechBubble
          ref={ref}
          variant={fallbackVariant || (isUser ? 'user' : 'assistant')}
          size={size}
          animation={animation}
          isUser={isUser}
          showTail={showTail}
          className={className}
          {...props}
        >
          {children}
        </SpeechBubble>
      );
    }
  }
);

ContextualSpeechBubble.displayName = "ContextualSpeechBubble";

export { speechBubbleVariants };
