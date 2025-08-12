import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base Off Script button styles
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-button-fluid font-medium transition-all duration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Off Script button variants
        black: "bg-primary-black text-primary-white border border-primary-black hover:bg-primary-peach hover:text-primary-black hover:border-primary-peach",
        white: "bg-primary-white text-primary-black border border-border-neutral hover:bg-gray-50 hover:border-gray-300",
        light: "bg-gray-50 text-primary-black border border-gray-200 hover:bg-gray-100 hover:border-gray-300",
        dark: "bg-gray-800 text-primary-white border border-gray-800 hover:bg-gray-700",
        // Legacy variants for compatibility
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
        blue: "bg-primary-blue text-primary-black",
        peach: "bg-primary-peach text-primary-black",
      }
    },
    defaultVariants: {
      variant: "blue",
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
              "border-t-[20px] border-t-primary-blue": variant === "blue",
              "border-t-[20px] border-t-primary-peach": variant === "peach",
            }
          )}
        />
      </Comp>
    )
  }
)
Speech.displayName = "Speech"

export { Button, Speech, buttonVariants, speechVariants }
