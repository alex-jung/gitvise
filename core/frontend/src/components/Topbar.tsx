export function Topbar({ org }: { org?: string }) {
  return (
    <header className="h-12 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {org && (
          <>
            <span>org:</span>
            <span className="text-white font-medium">{org}</span>
          </>
        )}
      </div>
      <button className="text-gray-500 hover:text-white transition-colors text-lg">
        ⚙
      </button>
    </header>
  );
}
