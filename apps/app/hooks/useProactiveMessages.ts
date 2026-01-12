"use client";

import { useIsaakDetection } from "@/hooks/useIsaakDetection";
import { getProactiveMessages } from "@/lib/isaak-messages-i18n";

export function useProactiveMessages() {
  const detection = useIsaakDetection();

  const messages = getProactiveMessages(
    detection.language,
    detection.context,
    detection.role
  );

  return messages;
}
