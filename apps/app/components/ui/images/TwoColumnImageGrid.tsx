import React from "react";
import Image from "next/image";

export default function TwoColumnImageGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="relative aspect-video overflow-hidden rounded-lg">
        <Image
          src="/images/cover/cover-01.png"
          alt="Image 1"
          fill
          className="object-cover"
        />
      </div>
      <div className="relative aspect-video overflow-hidden rounded-lg">
        <Image
          src="/images/cover/cover-02.png"
          alt="Image 2"
          fill
          className="object-cover"
        />
      </div>
    </div>
  );
}
