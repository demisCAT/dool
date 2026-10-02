"use client";

import { useOptimistic, useState, useTransition } from "react";

export function ActiveToggle({
  active,
  titleOn,
  titleOff,
  onToggle,
}: {
  active: boolean;
  titleOn: string;
  titleOff: string;
  onToggle: (next: boolean) => Promise<{ error: string | null }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);

  function toggle() {
    const next = !optimisticActive;
    setError(null);
    startTransition(async () => {
      setOptimisticActive(next);
      const res = await onToggle(next);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={optimisticActive}
        disabled={pending}
        onClick={toggle}
        title={optimisticActive ? titleOff : titleOn}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep ${
          optimisticActive ? "bg-pine" : "bg-ink/25"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-chalk shadow transition-transform duration-200 ${
            optimisticActive ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      {error && (
        <p role="alert" className="text-center text-[11px] font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
