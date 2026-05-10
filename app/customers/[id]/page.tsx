import { customers, projects } from '../../../lib/mockData';

export default function CustomerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const customer = customers.find((c) => c.id === params.id);

  if (!customer) {
    return <div>Customer not found.</div>;
  }

  const customerProjects = projects.filter(
    (project) => project.customer === customer.name
  );

  return (
    <div className="space-y-6 text-black">
      <div>
        <h1 className="text-3xl font-bold">{customer.name}</h1>
        <p className="mt-2 text-gray-600">Customer profile and project log.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
        <h2 className="text-xl font-bold">Customer Info</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            className="rounded-lg border p-3"
            defaultValue={customer.name}
          />
          <input
            className="rounded-lg border p-3"
            defaultValue={customer.contactName}
          />
          <input
            className="rounded-lg border p-3"
            defaultValue={customer.phone}
          />
          <input
            className="rounded-lg border p-3"
            defaultValue={customer.email}
          />
          <input
            className="rounded-lg border p-3 md:col-span-2"
            defaultValue={customer.address}
          />

          <textarea
            className="rounded-lg border p-3 md:col-span-2"
            rows={4}
            defaultValue={customer.notes}
          />
        </div>

        <button className="mt-4 rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800">
          Save Customer
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
        <h2 className="text-xl font-bold">Customer Projects</h2>

        <div className="mt-4 space-y-3">
          {customerProjects.map((project) => (
            <a
              key={project.id}
              href={`/projects/${encodeURIComponent(project.id)}`}
              className="block rounded-xl border p-4 hover:bg-gray-50"
            >
              <p className="text-sm text-gray-500">{project.id}</p>
              <h3 className="font-bold">{project.name}</h3>
              <p className="text-sm text-gray-600">
                {project.status} • {project.progress}%
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
