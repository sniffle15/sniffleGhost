export const EVENT_TYPE_OPTIONS = [
  { value: "MESSAGE_CREATE", label: "When a message is sent" },
  { value: "MESSAGE_DELETE", label: "When a message is deleted" },
  { value: "MESSAGE_UPDATE", label: "When a message is edited" },
  { value: "CHANNEL_CREATE", label: "When a channel is created" },
  { value: "CHANNEL_DELETE", label: "When a channel is deleted" },
  { value: "CHANNEL_UPDATE", label: "When a channel is updated" },
  { value: "VOICE_CHANNEL_JOIN", label: "When a user joins voice" },
  { value: "VOICE_CHANNEL_LEAVE", label: "When a user leaves voice" },
  { value: "VOICE_CHANNEL_MOVE", label: "When a user moves voice channel" },
  { value: "MEMBER_JOIN", label: "When a member joins server" },
  { value: "MEMBER_LEAVE", label: "When a member leaves server" }
] as const;

export type EventTypeValue = (typeof EVENT_TYPE_OPTIONS)[number]["value"];

const EVENT_TYPE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

export function formatEventTypeLabel(eventType: string | null | undefined): string {
  if (!eventType) return "Unknown event";
  return EVENT_TYPE_LABEL_MAP[eventType] ?? eventType;
}
