import * as React from "react";

type LogoProps = {
  variant?: "auto" | "light" | "dark";
  alt?: string;
  className?: string;
  priority?: boolean;
};

export function Logo({
  variant = "auto",
  alt = "Verifactu",
  className,
  priority,
}: LogoProps) {
  const lightSrc = "/brand/logo-horizontal-light.png";
  const darkSrc = "/brand/logo-horizontal-dark.png";

  const loading = priority ? "eager" : undefined;

  if (variant === "light") {
    return <img src={lightSrc} alt={alt} className={className} loading={loading} />;
  }
  if (variant === "dark") {
    return <img src={darkSrc} alt={alt} className={className} loading={loading} />;
  }

  // auto: responde a prefers-color-scheme, sin forzar la carga de ambos
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={darkSrc} />
      <img src={lightSrc} alt={alt} className={className} loading={loading} />
    </picture>
  );
}
