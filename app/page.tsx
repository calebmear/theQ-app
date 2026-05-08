export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold">
          Revenue & Operations Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Phase 1 Frontend Prototype
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">Revenue</h2>
            <p className="mt-2 text-3xl font-bold">$142,500</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">Active Projects</h2>
            <p className="mt-2 text-3xl font-bold">18</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">Pending Submissions</h2>
            <p className="mt-2 text-3xl font-bold">7</p>
          </div>
        </div>
      </div>
    </main>
  );
}