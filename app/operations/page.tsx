'use client';

import Link from 'next/link';
import { useState } from 'react';
import { customers, projects } from '../../lib/mockData';

export default function OperationsPage() {
  const [customerSearch, setCustomerSearch] = useState('');

  const filteredCustomers = customers.filter((customer) => {
    const search = customerSearch.toLowerCase();

    return (
      customer.name.toLowerCase().includes(search) ||
      customer.contact.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6 text-black">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations</h1>
          <p className="mt-2 text-gray-600">
            Manage customers, projects, and active work.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="rounded-lg border bg-white px-4 py-3 font-medium shadow-sm hover:bg-gray-50">
            + Add Customer
          </button>

          <button className="rounded-lg bg-black px-4 py-3 font-medium text-white shadow-sm hover:bg-gray-800">
            + Add Project
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
        <h2 className="text-xl font-bold">Customer Log</h2>
        <p className="mt-1 text-sm text-gray-600">
          Search existing customers before creating a new project.
        </p>

        <input
          type="text"
          placeholder="Search by customer, contact, phone, or email..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          className="mt-4 w-full rounded-lg border p-3"
        />

        {customerSearch && (
          <div className="mt-4 space-y-3">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-500">{customer.id}</p>
                    <h3 className="font-bold">{customer.name}</h3>
                    <p className="text-sm text-gray-600">
                      {customer.contact} • {customer.phone}
                    </p>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                  </div>

                  <Link
                    href={`/customers/${customer.id}`}
                    className="rounded-lg border px-4 py-2 text-center text-sm font-medium hover:bg-gray-50"
                  >
                    Open Profile
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-gray-600">
                No matching customers found. Use + Add Customer to create one.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
        <h2 className="text-xl font-bold">Active Projects</h2>

        <div className="mt-4 space-y-3 md:hidden">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-xl border p-4"
            >
              <p className="text-sm text-gray-500">{project.id}</p>
              <h3 className="mt-1 font-bold">{project.name}</h3>
              <p className="text-sm text-gray-600">{project.customer}</p>
              <div className="mt-3 flex justify-between text-sm">
                <span>{project.status}</span>
                <span className="font-semibold">{project.progress}%</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 hidden overflow-hidden rounded-xl border md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
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
    </div>
  );
}