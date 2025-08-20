import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-button border-2 px-3 py-1 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-white text-black border-black shadow-card hover:bg-gray-100",
        primary: "bg-template-primary text-white border-template-primary shadow-card hover:bg-black hover:border-black",
        secondary: "bg-template-secondary text-black border-template-secondary shadow-card hover:bg-black hover:text-white hover:border-black",
        accent: "bg-template-accent text-black border-black shadow-card hover:bg-black hover:text-white",
        light: "bg-gray-100 text-black border-gray-300 shadow-card hover:bg-gray-200 hover:border-gray-400",
        dark: "bg-black text-white border-black shadow-card hover:bg-gray-800",
        outline: "bg-white text-black border-black shadow-none hover:bg-gray-100",
        destructive: "bg-error text-white border-error shadow-card hover:bg-black hover:border-black",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
