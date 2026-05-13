'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';

type SearchCustomer = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type SearchProject = {
  id: string;
  project_number: string;
  status: string | null;
  project_location: string | null;
  customers: { name: string } | { name: string }[] | null;
};

export default function AppSearch() {
  const [searchValue, setSearchValue] = useState('');
  const [searchCustomers, setSearchCustomers] = useState<SearchCustomer[]>([]);
  const [searchProjects, setSearchProjects] = useState<SearchProject[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    async function runSearch() {
      const value = searchValue.trim();

      if (value.length < 2) {
        setSearchCustomers([]);
        setSearchProjects([]);
        setShowSearchModal(false);
        return;
      }

      const [customerResult, projectResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, contact_name, phone, email, address')
          .or(
            `name.ilike.%${value}%,contact_name.ilike.%${value}%,phone.ilike.%${value}%,email.ilike.%${value}%,address.ilike.%${value}%`
          )
          .limit(5),

        supabase
          .from('projects')
          .select(`
            id,
            project_number,
            status,
            project_location,
            customers (
              name
            )
          `)
          .or(
            `project_number.ilike.%${value}%,status.ilike.%${value}%,project_location.ilike.%${value}%`
          )
          .limit(5),
      ]);

      if (customerResult.error) {
        console.error('Customer search error:', customerResult.error);
      }

      if (projectResult.error) {
        console.error('Project search error:', projectResult.error);
      }

      setSearchCustomers(customerResult.data ?? []);
      setSearchProjects(projectResult.data ?? []);
      setShowSearchModal(true);
    }

    const timeout = window.setTimeout(runSearch, 250);

    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  function closeSearch() {
    setShowSearchModal(false);
    setSearchValue('');
  }

  return (
    <div className="relative min-w-0 flex-1 md:mt-4 md:w-full">
      <input
        type="text"
        placeholder="Search projects, customers, addresses..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={() => {
          if (searchValue.trim().length >= 2) {
            setShowSearchModal(true);
          }
        }}
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />

{showSearchModal && (
  <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border bg-white p-3 text-black shadow-xl">
    <div className="space-y-4">
      {searchProjects.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">
            Projects
          </p>

          <div className="mt-2 space-y-1">
            {searchProjects.map((project) => {
              const customer = Array.isArray(project.customers)
                ? project.customers[0]
                : project.customers;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${encodeURIComponent(
                    project.project_number
                  )}`}
                  onClick={closeSearch}
                  className="block rounded-lg p-2 hover:bg-gray-50"
                >
                  <p className="font-semibold">{project.project_number}</p>

                  {(customer?.name || project.status) && (
                    <p className="text-xs text-gray-500">
                      {[customer?.name, project.status]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {searchCustomers.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">
            Customers
          </p>

          <div className="mt-2 space-y-1">
            {searchCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                onClick={closeSearch}
                className="block rounded-lg p-2 hover:bg-gray-50"
              >
                <p className="font-semibold">{customer.name}</p>

                {(customer.contact_name || customer.phone) && (
                  <p className="text-xs text-gray-500">
                    {[customer.contact_name, customer.phone]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {searchProjects.length === 0 && searchCustomers.length === 0 && (
        <p className="p-2 text-sm text-gray-500">No results found.</p>
      )}
    </div>
  </div>
)}

    </div>
  );
}
