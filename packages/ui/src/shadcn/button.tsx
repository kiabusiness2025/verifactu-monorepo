import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "default";
  size?: "icon" | "default";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          variant === "ghost" ? "bg-transparent hover:bg-accent" : "bg-primary text-primary-foreground hover:bg-primary/90",
          size === "icon" ? "h-9 w-9 p-0" : "h-10 px-4 py-2",
          className,
        ].filter(Boolean).join(" ")}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
