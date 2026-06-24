import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-gradient-to-r from-sage-600 to-sage-700 text-white shadow-lg hover:shadow-xl hover:from-sage-700 hover:to-sage-800 hover:scale-105 active:scale-95",
                destructive:
                    "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl hover:from-red-600 hover:to-red-700 hover:scale-105 active:scale-95",
                outline:
                    "border-2 border-sage-200 bg-white/80 backdrop-blur-sm hover:bg-sage-50 hover:border-sage-300 hover:scale-105 active:scale-95 text-sage-700 shadow-sm hover:shadow-md",
                secondary:
                    "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 shadow-sm hover:shadow-md hover:from-gray-200 hover:to-gray-300 hover:scale-105 active:scale-95",
                ghost: "hover:bg-sage-50 hover:text-sage-900 hover:scale-105 active:scale-95 text-sage-700",
                link: "text-sage-600 underline-offset-4 hover:underline hover:text-sage-800",
                premium:
                    "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-orange-600 hover:scale-105 active:scale-95 font-bold",
                success:
                    "bg-gradient-to-r from-sage-700 to-sage-800 text-white shadow-lg hover:shadow-xl hover:from-sage-800 hover:to-sage-900 hover:scale-105 active:scale-95",
                filter: "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-300 rounded-full",
                filterActive: "border border-sage-primary bg-sage-primary/10 text-figma-forest-dark shadow-sm transition-all duration-300 rounded-full",
            },
            size: {
                default: "h-11 px-6 py-2.5",
                sm: "h-9 rounded-lg px-4 text-xs",
                lg: "h-12 rounded-xl px-8 text-base",
                xl: "h-14 rounded-xl px-10 text-lg",
                icon: "h-11 w-11",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
