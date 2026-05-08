import Link from 'next/link';
import { projects } from '../../lib/mockData';

export default function OperationsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Operations</h1>
      <p className="mt-2 text-gray-600">
        Active assigned projects and current workflow.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-4">Project</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Assigned</th>
              <th className="p-4">Status</th>
              <th className="p-4">Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-t hover:bg-gray-50">
                <td className="p-4">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {project.id} — {project.name}
                  </Link>
                </td>
                <td className="p-4">{project.customer}</td>
                <td className="p-4">{project.assignedTo}</td>
                <td className="p-4">{project.status}</td>
                <td className="p-4">{project.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}