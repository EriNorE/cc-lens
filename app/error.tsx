"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-8">
      <h2 className="text-lg font-mono text-foreground">
        Something went wrong
      </h2>
      <p className="text-sm text-muted-foreground font-mono max-w-md text-center">
        An unexpected error occurred while loading this page.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-mono border border-border rounded hover:border-primary/40 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
