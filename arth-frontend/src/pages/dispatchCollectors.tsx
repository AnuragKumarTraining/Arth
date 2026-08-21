import { useState, useEffect } from 'react';
import { Navbar } from '../components/navbar';

export interface Collector {
  id: string;
  name: string;
  employeeId: string;
  branch: string;
  zone: string;
  phone: string;
  status: 'AVAILABLE' | 'DISPATCHED' | 'ON_DUTY';
}

const INITIAL_COLLECTORS: Collector[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    employeeId: 'COL-101',
    branch: 'Arth Main Branch, Bengaluru',
    zone: 'Indiranagar Zone',
    phone: '+91 98765 43210',
    status: 'AVAILABLE',
  },
  {
    id: '2',
    name: 'Amit Sharma',
    employeeId: 'COL-102',
    branch: 'Arth Main Branch, Bengaluru',
    zone: 'Koramangala Zone',
    phone: '+91 98123 45678',
    status: 'AVAILABLE',
  },
];

export default function DispatchCollectors() {
  const [collectors, setCollectors] = useState<Collector[]>(INITIAL_COLLECTORS);
  const [activeDispatch, setActiveDispatch] = useState<{
    collector: Collector;
    timestamp: number;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger dispatch animation
  const handleDispatch = (collector: Collector) => {
    setCollectors((prev) =>
      prev.map((c) => (c.id === collector.id ? { ...c, status: 'DISPATCHED' } : c))
    );

    setActiveDispatch({
      collector,
      timestamp: Date.now(),
    });

    setToastMessage(`Dispatching ${collector.name} to ${collector.zone}...`);
  };

  // Handle animation completion
  useEffect(() => {
    if (!activeDispatch) return;

    const timer = setTimeout(() => {
      setToastMessage(
        `${activeDispatch.collector.name} has arrived at ${activeDispatch.collector.zone}.`
      );

      setCollectors((prev) =>
        prev.map((c) =>
          c.id === activeDispatch.collector.id ? { ...c, status: 'ON_DUTY' } : c
        )
      );

      setActiveDispatch(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeDispatch]);


  return (
    <div className="min-h-screen bg-slate-50 relative pb-36">
      <Navbar />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dispatch Collectors</h1>
            <p className="text-sm text-slate-600">
              Manage field collection officers for Arth Main Branch, Bengaluru.
            </p>
          </div>

          <button
            onClick={() => setCollectors(INITIAL_COLLECTORS)}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-medium rounded hover:bg-slate-700 transition-colors shadow-sm self-start sm:self-auto"
          >
            Reset Statuses
          </button>
        </div>

        {/* Status Feedback Toast */}
        {toastMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-slate-900 text-white text-xs font-medium border border-slate-800 flex items-center justify-between shadow-sm animate-fadeIn">
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white underline font-semibold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Collector Cards List (2 Collectors Only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {collectors.map((collector) => {
            const isCurrentlyDispatching = activeDispatch?.collector.id === collector.id;
            const initials = collector.name
              .split(' ')
              .map((n) => n[0])
              .join('');

            return (
              <div
                key={collector.id}
                className={`bg-white rounded-lg border p-6 flex flex-col justify-between shadow-sm ${isCurrentlyDispatching
                  ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{collector.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">{collector.employeeId}</p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${collector.status === 'DISPATCHED'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : collector.status === 'ON_DUTY'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                    >
                      {collector.status === 'DISPATCHED'
                        ? 'En Route'
                        : collector.status === 'ON_DUTY'
                          ? 'On Duty'
                          : 'Available'}
                    </span>
                  </div>

                  {/* Branch & Zone Info */}
                  <div className="space-y-1.5 mb-4 text-xs">
                    <div className="text-slate-600 font-medium">
                      <span className="text-slate-400">Branch:</span> {collector.branch}
                    </div>
                    <div className="text-slate-600 font-medium">
                      <span className="text-slate-400">Assigned Zone:</span> {collector.zone}
                    </div>
                    <div className="text-slate-500 font-mono">
                      <span className="text-slate-400">Phone:</span> {collector.phone}
                    </div>
                  </div>
                </div>

                {/* Dispatch Button */}
                <button
                  onClick={() => handleDispatch(collector)}
                  disabled={isCurrentlyDispatching}
                  className={`w-full py-2.5 px-4 rounded text-xs font-semibold transition-colors shadow-sm ${isCurrentlyDispatching
                    ? 'bg-amber-600 text-white opacity-80 cursor-wait'
                    : collector.status === 'ON_DUTY' || collector.status === 'DISPATCHED'
                      ? 'bg-slate-800 text-white hover:bg-slate-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isCurrentlyDispatching ? 'Dispatching...' : 'Dispatch Collector'}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* RUNNING CARTOON DISPATCH TRACK (FIXED AT THE BOTTOM) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white border-t border-slate-800 shadow-2xl h-24 flex flex-col justify-between">
        {/* Track Label */}
        <div className="px-6 pt-2 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>Dispatch Control Track &bull; Arth Main Branch, Bengaluru</span>
          <span>
            {activeDispatch
              ? `Running: ${activeDispatch.collector.name} (${activeDispatch.collector.zone})`
              : 'Standby'}
          </span>
        </div>

        {/* Road Track Surface */}
        <div className="relative w-full h-14 bg-slate-950 flex items-center border-t border-slate-800">
          {/* Track Road Line */}
          <div className="absolute inset-0 flex items-center px-4 opacity-30">
            <div className="w-full h-0.5 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Left Endpoint */}
          <div className="absolute left-4 bottom-2 z-20 bg-slate-800 px-2.5 py-1 rounded text-[11px] font-semibold text-slate-300 border border-slate-700">
            Arth Main Branch, Bengaluru
          </div>

          {/* Right Endpoint */}
          <div className="absolute right-4 bottom-2 z-20 bg-slate-800 px-2.5 py-1 rounded text-[11px] font-semibold text-slate-300 border border-slate-700">
            Destination Location
          </div>

          {/* CARTOON RUNNER SVG ANIMATING LEFT TO RIGHT */}
          {activeDispatch && (
            <div
              key={activeDispatch.timestamp}
              className="absolute bottom-2 z-30 flex items-center"
              style={{
                animation: 'cartoonRun 3s ease-in-out forwards',
              }}
            >
              {/* Cartoon Figure Structure */}
              <div className="relative flex flex-col items-center">
                {/* Name Tag */}
                <div className="absolute -top-7 bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                  {activeDispatch.collector.name}
                </div>

                {/* SVG Cartoon Character */}
                <div className="w-12 h-12 relative transform -scale-x-100">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
                    {/* Cap */}
                    <path d="M 30 30 Q 50 10 70 30 Z" fill="#2563eb" />
                    <rect x="25" y="28" width="50" height="5" rx="2" fill="#1d4ed8" />

                    {/* Face */}
                    <circle cx="50" cy="40" r="18" fill="#fde047" />
                    <circle cx="43" cy="38" r="3" fill="#0f172a" />
                    <circle cx="57" cy="38" r="3" fill="#0f172a" />
                    <path d="M 43 47 Q 50 54 57 47" fill="none" stroke="#0f172a" strokeWidth="2" />

                    {/* Shirt Body */}
                    <path d="M 32 55 L 68 55 L 62 80 L 38 80 Z" fill="#1e40af" />
                    <rect x="44" y="60" width="12" height="10" rx="2" fill="#3b82f6" />

                    {/* Briefcase */}
                    <rect x="65" y="58" width="18" height="14" rx="2" fill="#15803d" stroke="#86efac" strokeWidth="1" />

                    {/* Left Leg */}
                    <line x1="42" y1="80" x2="25" y2="96" stroke="#0f172a" strokeWidth="6" strokeLinecap="round">
                      <animate attributeName="x2" values="25;65;25" dur="0.25s" repeatCount="indefinite" />
                      <animate attributeName="y2" values="96;85;96" dur="0.25s" repeatCount="indefinite" />
                    </line>

                    {/* Right Leg */}
                    <line x1="58" y1="80" x2="75" y2="96" stroke="#0f172a" strokeWidth="6" strokeLinecap="round">
                      <animate attributeName="x2" values="75;35;75" dur="0.25s" repeatCount="indefinite" />
                      <animate attributeName="y2" values="85;96;85" dur="0.25s" repeatCount="indefinite" />
                    </line>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animation Keyframe */}
      <style>{`
        @keyframes cartoonRun {
          0% {
            left: 5%;
          }
          100% {
            left: 82%;
          }
        }
      `}</style>
    </div>
  );
}
