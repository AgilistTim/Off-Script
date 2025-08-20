import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Clean B&W button styles with unified design
  "inline-flex items-center justify-center gap-2 rounded-button text-base font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 break-words text-center leading-tight border-2",
  {
    variants: {
      variant: {
        // Primary template color buttons - CTAs only
        primary: "bg-template-primary text-white border-template-primary hover:bg-black hover:text-white hover:border-black shadow-card hover:shadow-card-hover",
        secondary: "bg-template-secondary text-black border-template-secondary hover:bg-black hover:text-white hover:border-black shadow-card hover:shadow-card-hover",
        accent: "bg-template-accent text-black border-template-accent hover:bg-black hover:text-white hover:border-black shadow-card hover:shadow-card-hover",
        
        // Standard B&W variants
        default: "bg-white text-black border-black hover:bg-black hover:text-white shadow-card hover:shadow-card-hover",
        dark: "bg-black text-white border-black hover:bg-gray-800 hover:border-gray-800 shadow-card hover:shadow-card-hover",
        light: "bg-gray-100 text-black border-gray-300 hover:bg-gray-200 hover:border-gray-400 shadow-card hover:shadow-card-hover",
        
        // Outline variants
        outline: "bg-white text-black border-black hover:bg-black hover:text-white shadow-card hover:shadow-card-hover",
        "outline-gray": "bg-white text-gray-600 border-gray-300 hover:bg-gray-100 hover:border-gray-400 hover:text-black shadow-card hover:shadow-card-hover",
        
        // Subtle variants
        ghost: "bg-transparent text-black border-transparent hover:bg-gray-100 hover:border-gray-200 shadow-none hover:shadow-card",
        link: "bg-transparent text-black border-transparent underline-offset-4 hover:underline shadow-none p-0 h-auto min-h-0",
        
        // Semantic variants
        destructive: "bg-error text-white border-error hover:bg-black hover:border-black shadow-card hover:shadow-card-hover",
        success: "bg-success text-white border-success hover:bg-black hover:border-black shadow-card hover:shadow-card-hover",
        warning: "bg-warning text-white border-warning hover:bg-black hover:border-black shadow-card hover:shadow-card-hover",
      },
      size: {
        // Unified sizing system
        default: "px-6 py-3 min-h-[44px] text-base",
        sm: "px-4 py-2 min-h-[36px] text-sm",
        lg: "px-8 py-4 min-h-[52px] text-lg",
        xl: "px-10 py-5 min-h-[60px] text-xl",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-12 w-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Clean speech bubble variants for B&W design
const speechVariants = cva(
  "block w-full p-6 font-medium text-lg relative transition-all duration-300 no-underline border-2 rounded-lg shadow-card hover:shadow-card-hover",
  {
    variants: {
      variant: {
        // Clean B&W speech bubbles
        default: "bg-white text-black border-black",
        light: "bg-gray-100 text-black border-gray-300",
        dark: "bg-black text-white border-black",
        
        // Template color accents for key messages
        accent: "bg-template-accent text-black border-black",
        primary: "bg-template-primary text-white border-template-primary",
        secondary: "bg-template-secondary text-black border-template-secondary",
      }
    },
    defaultVariants: {
      variant: "default",
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

// Clean speech bubble component for B&W design
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
              // Clean B&W speech bubble tails
              "border-t-[20px] border-t-white": variant === "default" || variant === "light",
              "border-t-[20px] border-t-black": variant === "dark",
              "border-t-[20px] border-t-template-accent": variant === "accent",
              "border-t-[20px] border-t-template-primary": variant === "primary",
              "border-t-[20px] border-t-template-secondary": variant === "secondary",
            }
          )}
        />
      </Comp>
    )
  }
)
Speech.displayName = "Speech"

export { Button, Speech, buttonVariants, speechVariants }