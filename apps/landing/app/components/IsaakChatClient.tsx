"use client";

import dynamic from "next/dynamic";

const IsaakChat = dynamic(() => import("./IsaakChat"), {
  ssr: false,
});

export default function IsaakChatClient() {
  return <IsaakChat />;
}
