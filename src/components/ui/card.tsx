import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Clean B&W card variants
const cardVariants = cva(
  "transition-all duration-300 relative overflow-hidden border-2",
  {
    variants: {
      variant: {
        // Standard B&W cards
        default: "bg-white text-black border-black shadow-card hover:shadow-card-hover",
        light: "bg-gray-50 text-black border-gray-300 shadow-card hover:shadow-card-hover",
        dark: "bg-black text-white border-black shadow-card hover:shadow-card-hover",
        
        // Template color accent cards - for key content only
        accent: "bg-template-accent text-black border-black shadow-card hover:shadow-card-hover",
        primary: "bg-template-primary text-white border-template-primary shadow-card hover:shadow-card-hover",
        secondary: "bg-template-secondary text-black border-template-secondary shadow-card hover:shadow-card-hover",
        
        // Outline variants
        outline: "bg-white text-black border-black shadow-none hover:shadow-card",
        "outline-light": "bg-white text-black border-gray-300 shadow-none hover:shadow-card",
        
        // Interactive variants
        interactive: "bg-white text-black border-black shadow-card hover:shadow-card-hover hover:bg-gray-50 cursor-pointer",
        "interactive-dark": "bg-black text-white border-black shadow-card hover:shadow-card-hover hover:bg-gray-800 cursor-pointer",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        xl: "p-10",
        compact: "p-3",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        default: "rounded-card",
        lg: "rounded-lg",
        xl: "rounded-xl",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, rounded, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, rounded }), className)}
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
    className={cn("flex flex-col space-y-2 p-6", className)}
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
    className={cn("text-xl font-semibold leading-tight tracking-tight text-black", className)}
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
    className={cn("text-base text-gray-600 leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("p-6 pt-0", className)} 
    {...props} 
  />
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

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  cardVariants 
}