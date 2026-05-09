'use client';

import { projects, timeEntries } from '../../../lib/mockData';

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = projects.find((p) => p.id === params.id);

  if (!project) {
    return <div>Project not found.</div>;
  }

  const projectTimeEntries = timeEntries.filter(
    (entry) => entry.projectId === project.id
  );

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-3xl font-bold">
          {project.id} — {project.name}
        </h1>
        <p className="mt-2 text-gray-600">{project.customer}</p>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div><p className="text-sm text-gray-500">Status</p><p className="font-semibold">{project.status}</p></div>
          <div><p className="text-sm text-gray-500">Assigned</p><p className="font-semibold">{project.assignedTo}</p></div>
          <div><p className="text-sm text-gray-500">Progress</p><p className="font-semibold">{project.progress}%</p></div>
          <div><p className="text-sm text-gray-500">Target Completion</p><p className="font-semibold">{project.targetCompletion}</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
  <h2 className="text-2xl font-bold">Add Time Entry</h2>

  <div className="mt-4 grid gap-4 md:grid-cols-2">
    <div>
      <label className="mb-2 block text-sm font-medium">Work Date</label>
      <input
        type="date"
        defaultValue={today}
        className="w-full rounded-lg border p-3"
      />
    </div>

    <div>
  <label className="mb-2 block text-sm font-medium">
    Service Completed
  </label>

  <select
  defaultValue=""
  className="w-full rounded-lg border p-3 text-gray-400"
  onChange={(e) => {
    e.currentTarget.classList.remove('text-gray-400');
    e.currentTarget.classList.add('text-black');
  }}
>
  <option value="" disabled hidden>
    Select Service Completed
  </option>

  <option className="text-black">Mainline</option>
  <option className="text-black">Lateral</option>
  <option className="text-black">Jetter</option>
  <option className="text-black">Traffic Control</option>
</select>
</div>

<div>
  <label className="mb-2 block text-sm font-medium">
    Service Vehicle
  </label>

  <select
  defaultValue=""
  className="w-full rounded-lg border p-3 text-gray-400"
  onChange={(e) => {
    e.currentTarget.classList.remove('text-gray-400');
    e.currentTarget.classList.add('text-black');
  }}
>
  <option value="" disabled hidden>
    Select Service Vehicle
  </option>

  <option className="text-black">
  2016 Ford Van
</option>

<option className="text-black">
  2007 Ford F-150
</option>
</select>
</div>

    <div>
      <label className="mb-2 block text-sm font-medium"># of Hours</label>
      <input
  type="number"
  inputMode="decimal"
  placeholder="Enter hours"
  className="w-full rounded-lg border p-3"
/>
    </div>

    <div className="md:col-span-2">
      <label className="mb-2 block text-sm font-medium">Notes</label>
      <textarea
        placeholder="Add notes about the work completed..."
        className="w-full rounded-lg border p-3"
        rows={4}
      />
    </div>
  </div>

  <button className="mt-4 rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800">
    Submit Time
  </button>
</div>

<div className="rounded-2xl bg-white p-6 shadow">
  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 className="text-2xl font-bold">Time Entry History</h2>
      <p className="text-sm text-gray-600">
        Prior time submissions for this project.
      </p>
    </div>

    <div className="rounded-xl bg-gray-100 px-4 py-3">
      <p className="text-sm text-gray-500">Total Hours</p>
      <p className="text-2xl font-bold">
        {projectTimeEntries.reduce((total, entry) => total + entry.hours, 0)}
      </p>
    </div>
  </div>

  <div className="mt-4 overflow-hidden rounded-xl border">
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-4">Date/Time</th>
          <th className="p-4">User</th>
          <th className="p-4">Hours</th>
          <th className="p-4">Work Completed</th>
          <th className="p-4">Vehicle</th>
          <th className="p-4">Notes</th>
          <th className="p-4">Actions</th>
        </tr>
      </thead>

      <tbody>
        {projectTimeEntries.map((entry) => (
          <tr key={entry.id} className="border-t align-top">
            <td className="p-4">{entry.submittedAt}</td>
            <td className="p-4">{entry.user}</td>
            <td className="p-4">{entry.hours}</td>
            <td className="p-4">{entry.workCompleted}</td>
            <td className="p-4">{entry.vehicle}</td>
            <td className="p-4 max-w-xs text-gray-600">{entry.notes}</td>
            <td className="p-4">
              <div className="flex gap-2">
                <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100">
                  Edit
                </button>
                <button className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
    </div>
  );
}