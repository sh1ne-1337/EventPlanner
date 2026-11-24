"use client";

import { CalendarDaysIcon, ListIcon, SearchIcon, XIcon } from "lucide-react";
import { debounce } from "nuqs";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { IMPORTANCE_META, IMPORTANCE_VALUES, type Importance } from "../constants";
import { LIST_SCOPES, type ListScope, type View } from "../search-params";
import { useEventsTransition } from "./events-transition";
import { ImportanceDot } from "./importance-badge";
import { useEventsParams } from "./use-events-params";

const SCOPE_LABELS: Record<ListScope, string> = {
  upcoming: "Upcoming",
  past: "Past",
  all: "All time",
};

export function EventsToolbar() {
  const [{ view, q, importance, scope }, setParams] = useEventsParams();
  const { isPending } = useEventsTransition();
  const hasFilters = q !== "" || importance.length > 0;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:w-72">
          <InputGroupAddon>{isPending ? <Spinner /> : <SearchIcon />}</InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Search events…"
            aria-label="Search events"
            value={q}
            maxLength={200}
            onChange={(e) =>
              void setParams(
                { q: e.target.value || null, limit: null },
                { limitUrlUpdates: e.target.value ? debounce(300) : undefined },
              )
            }
          />
          {q && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => void setParams({ q: null, limit: null })}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        <ToggleGroup
          type="multiple"
          variant="outline"
          spacing={0}
          aria-label="Filter by importance"
          value={importance}
          onValueChange={(value) =>
            void setParams({
              importance: value.length ? (value as Importance[]) : null,
              limit: null,
            })
          }
        >
          {IMPORTANCE_VALUES.map((value) => (
            <ToggleGroupItem key={value} value={value} aria-label={IMPORTANCE_META[value].label}>
              <ImportanceDot importance={value} />
              {IMPORTANCE_META[value].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void setParams({ q: null, importance: null, limit: null })}
          >
            <XIcon />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {view === "list" && (
          <Select
            value={scope}
            onValueChange={(value) => void setParams({ scope: value as ListScope, limit: null })}
          >
            <SelectTrigger aria-label="Time range" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIST_SCOPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SCOPE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          aria-label="View"
          value={view}
          onValueChange={(value) => value && void setParams({ view: value as View, limit: null })}
        >
          <ToggleGroupItem value="calendar" aria-label="Calendar view">
            <CalendarDaysIcon />
            Calendar
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <ListIcon />
            List
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
