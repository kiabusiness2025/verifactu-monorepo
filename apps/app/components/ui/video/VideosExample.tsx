import React from "react";

export default function VideosExample() {
  return (
    <div className="space-y-4">
      <div className="aspect-video overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        <video
          className="h-full w-full object-cover"
          controls
          poster="/images/cover/cover-01.png"
        >
          <source src="/video/sample.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="aspect-video overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <video
            className="h-full w-full object-cover"
            controls
            poster="/images/cover/cover-02.png"
          >
            <source src="/video/sample.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <div className="aspect-video overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <video
            className="h-full w-full object-cover"
            controls
            poster="/images/cover/cover-03.png"
          >
            <source src="/video/sample.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}
