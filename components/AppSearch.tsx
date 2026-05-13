'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';

type CustomerResult = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type ProjectResult = {
  id: string;
  project_number: string;
  status: string | null;
  project_location: string | null;
  pricing_type: string | null;
  customer_id: string | null;
  customers:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

export default function AppSearch() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [projects, setProjects] = useState<ProjectResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function loadResults() {
      const term = search.trim();

      if (term.length < 2) {
        setCustomers([]);
        setProjects([]);
        setSearching(false);
        return;
      }

      setSearching(true);

      const customerSearch = supabase
        .from('customers')
        .select('id, name, contact_name, phone, email, address')
        .or(
          `name.ilike.%${term}%,contact_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,address.ilike.%${term}%`
        )
        .limit(6);

      const projectSearch = supabase
        .from('projects')
        .select(
          `
          id,
          project_number,
          status,
          project_location,
          pricing_type,
          customer_id,
          customers (
            name
          )
        `
        )
        .or(
          `project_number.ilike.%${term}%,project_location.ilike.%${term}%,status.ilike.%${term}%,pricing_type.ilike.%${term}%`
        )
        .limit(8);

      const [customerResponse, projectResponse] = await Promise.all([
        customerSearch,
        projectSearch,
      ]);

      if (customerResponse.error) {
        console.error('Error searching customers:', customerResponse.error);
      }

      if (projectResponse.error) {
        console.error('Error searching projects:', projectResponse.error);
      }

      const customerMatches = customerResponse.data ?? [];
      let projectMatches = projectResponse.data ?? [];

      

      setCustomers(customerMatches);
      setProjects(projectMatches);
      setSearching(false);
    }

    const timeout = window.setTimeout(loadResults, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  function openProject(projectNumber: string) {
    setSearch('');
    setShowResults(false);
    router.push(`/projects/${encodeURIComponent(projectNumber)}`);
  }

  function openCustomer(customerId: string) {
    setSearch('');
    setShowResults(false);
    router.push(`/customers/${customerId}`);
  }

  function customerNameForProject(project: ProjectResult) {
    const customer = Array.isArray(project.customers)
      ? project.customers[0]
      : project.customers;

    return customer?.name ?? 'No customer saved';
  }

  const hasResults = customers.length > 0 || projects.length > 0;

  return (
    <div className="relative min-w-0 flex-1 md:mt-4 md:w-full">
      <input
        type="text"
        placeholder="Search THEQ..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />

      {showResults && search.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-auto rounded-xl border bg-white shadow-xl">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Search Results</p>
            <p className="text-xs text-gray-500">
              Projects and customers matching "{search.trim()}"
            </p>
          </div>

          {searching && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
          )}

          {!searching && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No results found.
            </div>
          )}

          {!searching && projects.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">
                Projects
              </p>

              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openProject(project.project_number)}
                  className="w-full border-t px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{project.project_number}</p>
                      <p className="text-sm text-gray-600">
                        {customerNameForProject(project)}
                      </p>
                      {project.project_location && (
                        <p className="text-xs text-gray-500">
                          {project.project_location}
                        </p>
                      )}
                    </div>

                    {project.status && (
                      <span className="rounded-full border px-2 py-1 text-xs font-medium text-gray-600">
                        {project.status}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching && customers.length > 0 && (
            <div className="border-t py-2">
              <p className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">
                Customers
              </p>

              {customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => openCustomer(customer.id)}
                  className="w-full border-t px-4 py-3 text-left hover:bg-gray-50"
                >
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-sm text-gray-600">
                    {customer.contact_name || 'No contact saved'}
                    {customer.phone ? ` • ${customer.phone}` : ''}
                  </p>
                  {customer.email && (
                    <p className="text-xs text-gray-500">{customer.email}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
