"use client";

import { useOptimistic, useState, useTransition } from "react";

type Direction = "up" | "down";

export function OrderButtons({
  label,
  first,
  last,
  onMove,
}: {
  /** Texto del elemento, para los aria-label ("Subir Papas fritas"). */
  label: string;
  first: boolean;
  last: boolean;
  onMove: (direction: Direction) => Promise<{ error: string | null }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useOptimistic({ first, last });

  function move(direction: Direction) {
    setError(null);
    startTransition(async () => {
      setOptimistic(
        direction === "up"
          ? { first: optimistic.first, last: false }
          : { first: false, last: optimistic.last }
      );
      const res = await onMove(direction);
      if (res.error) setError(res.error);
    });
  }

  const buttonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-ink/15 text-ink/70 transition-colors hover:border-pine hover:text-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink/15 disabled:hover:text-ink/70";

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => move("up")}
        disabled={pending || optimistic.first}
        aria-label={`Subir ${label}`}
        title="Subir"
        className={buttonClass}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={pending || optimistic.last}
        aria-label={`Bajar ${label}`}
        title="Bajar"
        className={buttonClass}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {error && (
        <p role="alert" className="text-center text-[11px] font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
