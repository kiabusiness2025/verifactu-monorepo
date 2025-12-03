"use client";
import Image from "next/image";
import React from "react";

export default function ResponsiveImage() {
  return (
    <Image
      src="/images/grid-image/image-01.png"
      alt="Responsive image"
      width={500}
      height={300}
      className="w-full"
    />
  );
}
