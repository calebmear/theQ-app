export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">
          Revenue & Operations Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Phase 1 Frontend Prototype
        </p>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-gray-500">Revenue</p>

          <p className="mt-2 text-4xl font-bold text-black">
            $142,500
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-gray-500">
            Active Projects
          </p>

          <p className="mt-2 text-4xl font-bold text-black">
            18
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-gray-500">
            Pending Submissions
          </p>

          <p className="mt-2 text-4xl font-bold text-black">
            7
          </p>
        </div>
      </div>
    </div>
  );
}