"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";
import { EVENT_TYPE_OPTIONS, type EventTypeValue, formatEventTypeLabel } from "@/lib/event-types";

interface BotEvent {
  id: string;
  name: string;
  description: string;
  eventType: string;
}

interface EventForm {
  name: string;
  description: string;
  eventType: EventTypeValue;
}

export default function EventsPage() {
  const params = useParams();
  const botId = params.botId as string;
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<EventForm>({
    defaultValues: { eventType: "MESSAGE_CREATE" }
  });

  async function load() {
    setIsLoading(true);
    try {
      const data = await authFetch(`/bots/${botId}/events`);
      setEvents(data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (botId) {
      load().catch(() => undefined);
    }
  }, [botId]);

  async function onSubmit(values: EventForm) {
    setActionError(null);
    await authFetch(`/bots/${botId}/events`, {
      method: "POST",
      body: JSON.stringify(values)
    });
    reset({ eventType: "MESSAGE_CREATE" });
    await load();
  }

  async function deleteEvent(eventId: string) {
    const confirmed = window.confirm("Delete this event permanently? All versions are removed.");
    if (!confirmed) return;
    setActionError(null);
    try {
      await authFetch(`/events/${eventId}`, { method: "DELETE" });
      await load();
    } catch (error: any) {
      setActionError(error?.message ?? "Failed to delete event.");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((evt) => evt.name.toLowerCase().includes(q) || evt.description.toLowerCase().includes(q));
  }, [events, query]);

  return (
    <div className="space-y-4">
      <section className="dash-panel dash-animate-in p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="dash-subtitle">Custom Events</p>
            <h2 className="dash-title">Event Manager</h2>
            <p className="mt-1 text-sm dash-muted">Build workflows for bot runtime events.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-44 bg-white/5 motion-soft"
            />
            <Button variant="outline" size="sm" asChild>
              <a href={`/bots/${botId}`}>Back</a>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <section className="dash-panel dash-animate-in p-5" style={{ animationDelay: "70ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="dash-subtitle">Configured Events</p>
              <h3 className="text-2xl font-display">Active Events</h3>
            </div>
            <Badge className="bg-white/10 text-fog/70 border-white/20">{filtered.length} entries</Badge>
          </div>

          {actionError && <p className="mb-3 text-xs text-rose-200">{actionError}</p>}

          <div className="space-y-3">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`event-skeleton-${index}`}
                  className="dash-panel-soft dash-animate-in p-3"
                  style={{ animationDelay: `${120 + index * 45}ms` }}
                >
                  <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-3 w-64 animate-pulse rounded bg-white/5" />
                </div>
              ))}
            {filtered.map((evt, index) => (
              <div
                key={evt.id}
                className="dash-panel-soft motion-soft dash-hover-lift dash-animate-in flex items-center justify-between gap-3 p-3"
                style={{ animationDelay: `${140 + index * 45}ms` }}
              >
                <div>
                  <p className="text-sm font-semibold text-fog">{evt.name}</p>
                  <p className="text-xs dash-muted">{evt.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/10 text-fog/70 border-white/20">{formatEventTypeLabel(evt.eventType)}</Badge>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/bots/${botId}/events/${evt.id}`}>Open</a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-rose-300/25 text-rose-200 hover:bg-rose-500/10"
                    onClick={() => deleteEvent(evt.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {!isLoading && filtered.length === 0 && (
              <div className="dash-panel-soft dash-animate-in p-6 text-center" style={{ animationDelay: "140ms" }}>
                <p className="dash-muted text-sm">No events yet.</p>
              </div>
            )}
          </div>
        </section>

        <section className="dash-panel dash-animate-in p-5" style={{ animationDelay: "110ms" }}>
          <div className="mb-3">
            <p className="dash-subtitle">Create</p>
            <h3 className="text-2xl font-display">New Event</h3>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <Input placeholder="Event name" {...register("name")} />
            <Textarea placeholder="Description" {...register("description")} />
            <Select {...register("eventType")}>
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button type="submit" className="w-full">Create Event</Button>
          </form>
        </section>
      </div>
    </div>
  );
}
