import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-button border-2 border-black bg-white px-4 py-2 text-base text-black shadow-card transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:border-template-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
