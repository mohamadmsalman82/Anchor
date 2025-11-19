interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="rounded-2xl bg-white shadow-sm p-12 border border-slate-100 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-4">
            <svg
              className="w-10 h-10 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
          {description && (
            <p className="text-slate-600 mb-4">{description}</p>
          )}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
            <span>Coming Soon</span>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-6">
          We're working hard to bring you this feature. Stay tuned!
        </p>
      </div>
    </div>
  );
}

