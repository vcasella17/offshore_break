"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  indexPlayers,
  searchPlayers,
  type PickerPlayer,
} from "@/lib/searchPlayers";

const ACCENTS = {
  coral: {
    input: "focus:border-[#D85F46] focus:ring-[#D85F46]/25",
    row: "border-[#D85F46]",
  },
  teal: {
    input: "focus:border-[#59B3AD] focus:ring-[#59B3AD]/25",
    row: "border-[#59B3AD]",
  },
} as const;

type PlayerPickerProps = {
  players: PickerPlayer[];
  label: string;
  /** Adds a hidden form field with this name that holds the chosen player's id. */
  name?: string;
  /** Controlled value (a player id). Leave undefined and the picker manages itself. */
  value?: string | number | null;
  /** Starting player when uncontrolled. */
  defaultValue?: string | number | null;
  onChange?: (player: PickerPlayer | null) => void;
  placeholder?: string;
  maxResults?: number;
  /** Focus and highlight color. */
  accent?: keyof typeof ACCENTS;
};

function labelFor(player: PickerPlayer): string {
  return player.team ? `${player.name} · ${player.team}` : player.name;
}

export default function PlayerPicker({
  players,
  label,
  name,
  value,
  defaultValue = null,
  onChange,
  placeholder = "Search by name or team…",
  maxResults = 50,
  accent = "coral",
}: PlayerPickerProps) {
  const colors = ACCENTS[accent];
  const inputId = useId();
  const listId = `${inputId}-list`;
  const activeRef = useRef<HTMLLIElement>(null);

  const index = useMemo(() => indexPlayers(players), [players]);

  // the chosen player: controlled by `value`, or remembered here
  const [internalId, setInternalId] = useState<string | null>(
    defaultValue === null ? null : String(defaultValue),
  );
  const selectedId =
    value !== undefined ? (value === null ? null : String(value)) : internalId;

  const selected = useMemo(
    () =>
      selectedId === null
        ? null
        : (players.find((player) => String(player.id) === selectedId) ?? null),
    [players, selectedId],
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false); // true once the person types
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(
    () => (open ? searchPlayers(index, editing ? query : "", maxResults) : []),
    [index, open, editing, query, maxResults],
  );

  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  // keep the highlighted row visible while arrowing through a long list
  useEffect(() => {
    if (open) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function close() {
    setOpen(false);
    setEditing(false);
    setQuery("");
    setActive(0);
  }

  function choose(player: PickerPlayer | null) {
    if (value === undefined) {
      setInternalId(player ? String(player.id) : null);
    }
    onChange?.(player);
    close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = results.length;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else if (count) setActive((activeIndex + 1) % count);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      else if (count) setActive((activeIndex - 1 + count) % count);
    } else if (event.key === "Enter") {
      // only swallow Enter while choosing, so a surrounding form can still submit
      if (open && results[activeIndex]) {
        event.preventDefault();
        choose(results[activeIndex]);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        close();
      }
    }
  }

  const inputValue = editing ? query : selected ? labelFor(selected) : "";

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="mb-2 block font-mono text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results.length ? `${inputId}-opt-${activeIndex}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={inputValue}
          onChange={(event) => {
            setEditing(true);
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={(event) => {
            setOpen(true);
            event.currentTarget.select();
          }}
          onClick={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
          className={`h-12 w-full border border-[#1A2842]/30 bg-white pl-4 pr-11 text-base text-[#1A2842] outline-none transition placeholder:text-[#687384] focus:ring-2 ${colors.input}`}
        />

        {selected && !editing && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(null)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-xl leading-none text-[#687384] transition hover:text-[#D85F46]"
          >
            ×
          </button>
        )}
      </div>

      {name && <input type="hidden" name={name} value={selectedId ?? ""} />}

      <p className="sr-only" aria-live="polite">
        {open ? `${results.length} players` : ""}
      </p>

      {open &&
        (results.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto border border-[#1A2842]/20 bg-white shadow-[0_12px_30px_rgba(26,40,66,0.12)]"
          >
            {results.map((player, i) => {
              const isActive = i === activeIndex;
              const isSelected = String(player.id) === selectedId;

              return (
                <li
                  key={String(player.id)}
                  id={`${inputId}-opt-${i}`}
                  ref={isActive ? activeRef : undefined}
                  role="option"
                  aria-selected={isSelected}
                  // keep focus in the input so choosing doesn't trigger blur first
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(player)}
                  className={`flex cursor-pointer items-center justify-between border-l-2 px-4 py-2.5 text-[#1A2842] ${
                    isActive
                      ? `${colors.row} bg-[#F8F3EA]`
                      : "border-transparent"
                  } ${isSelected ? "font-bold" : ""}`}
                >
                  <span className="truncate">{player.name}</span>
                  {player.team && (
                    <span className="ml-3 shrink-0 font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#1F7A74]">
                      {player.team}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div
            id={listId}
            className="absolute left-0 right-0 z-30 mt-1 border border-[#1A2842]/20 bg-white px-4 py-3 text-sm text-[#687384] shadow-[0_12px_30px_rgba(26,40,66,0.12)]"
          >
            No players match “{query}”.
          </div>
        ))}
    </div>
  );
}
