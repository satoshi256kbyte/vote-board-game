/**
 * Loading State for Game Detail Screen
 */

export default function GameDetailLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-9 bg-gray-200 rounded w-64 animate-pulse mb-4" />
          <div className="flex items-center gap-4">
            <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
            <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Board Skeleton */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4" />
              <div className="h-96 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* AI Commentary Skeleton */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse mb-4" />
              <div className="space-y-4">
                <div className="h-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-48 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
