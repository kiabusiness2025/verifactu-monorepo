"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";

type BrandLogoProps = {
  variant?: "header" | "footer" | "auth";
  className?: string;
};

export default function BrandLogo({ 
  variant = "header", 
  className = "",
}: BrandLogoProps) {
  const isFooter = variant === "footer";
  const isAuth = variant === "auth";

  // Height based on variant
  const height = isAuth ? 65 : isFooter ? 55 : 60;
  const width = height * 4.5; // Ratio para logo horizontal
  
  // Footer: use the provided definitive logo; others use light variant
  const logoSrc = isFooter
    ? "/brand/logo/logo-horizontal-dark.png"
    : "/brand/logo/logo-horizontal-light.png";

  return (
    <Link
      href="/"
      aria-label="Ir al inicio de Verifactu Business"
      className={[
        "group inline-flex items-center transition-opacity hover:opacity-90",
        // Focus states for accessibility
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded",
        isFooter ? "focus-visible:ring-offset-slate-900" : "focus-visible:ring-offset-white",
        className,
      ].join(" ")}
    >
      {/* Verifactu Business Logo */}
      <Image
        src={logoSrc}
        alt="Verifactu Business"
        width={width}
        height={height}
        className="h-auto transition-transform group-hover:scale-105"
        style={{ height: `${height}px`, width: "auto" }}
        priority
      />
    </Link>
  );
}
