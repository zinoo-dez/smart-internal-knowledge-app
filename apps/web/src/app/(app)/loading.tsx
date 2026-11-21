import React from 'react';

export default function LoadingPage() {
  return (
    <div
      role="status"
      aria-label="Loading workspace"
      className="min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4 py-12"
    >
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
      <p className="text-xs font-medium text-slate-500">Loading workspace...</p>
    </div>
  );
}
