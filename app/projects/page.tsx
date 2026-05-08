import Link from 'next/link';
import { projects } from '../../lib/mockData';

export default function ProjectsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Projects</h1>
      <p className="mt-2 text-gray-600">
        Master project list.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="rounded-2xl bg-white p-6 shadow hover:shadow-md"
          >
            <p className="text-sm text-gray-500">{project.id}</p>
            <h2 className="mt-2 text-xl font-bold">{project.name}</h2>
            <p className="mt-1 text-gray-600">{project.customer}</p>
            <p className="mt-4 text-sm font-semibold">
              {project.status} • {project.progress}%
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}