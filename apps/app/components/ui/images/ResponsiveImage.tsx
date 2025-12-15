import React from "react";
import Image from "next/image";

export default function ResponsiveImage() {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
      <Image
        src="/images/cover/cover-01.png"
        alt="Responsive image example"
        fill
        className="object-cover"
      />
    </div>
  );
}
