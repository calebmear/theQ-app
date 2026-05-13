'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { supabase } from '../../../lib/supabaseClient';

type Customer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  mainPricingType: string;
  lateralPricingType: string;
  jetPricingType: string;
};

type Project = {
  id: string;
  project_number: string;
  status: string;
  service_start_date: string | null;
  project_location: string | null;
};

export default function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectView, setProjectView] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomer() {
      const { data, error } = await supabase
        .from('customers')
        .select(
          'id, name, contact_name, phone, email, address, notes, main_pricing_type, lateral_pricing_type, jet_pricing_type'
        )
                .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error loading customer:', error);
        setLoading(false);
        return;
      }

      setCustomer({
        id: data.id,
        name: data.name,
        contactName: data.contact_name ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        address: data.address ?? '',
        notes: data.notes ?? '',
        mainPricingType: data.main_pricing_type ?? '',
        lateralPricingType: data.lateral_pricing_type ?? '',
        jetPricingType: data.jet_pricing_type ?? '',
      });
      

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_number, status, service_start_date, project_location')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false });

      if (projectError) {
        console.error('Error loading customer projects:', projectError);
      }

      setProjects(projectData ?? []);
      setLoading(false);
    }

    loadCustomer();
  }, [params.id]);

  function formatPhone(value: string) {
    if (!value) return 'No phone saved';

    const digits = value.replace(/\D/g, '');

    if (digits.length !== 10) {
      return value;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function formatDate(value: string | null) {
    if (!value) return 'No date saved';

    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  if (loading) {
    return <div className="text-black">Loading customer...</div>;
  }

  const activeProjects = projects.filter((project) =>
  ['Active', 'Scheduled'].includes(project.status)
);

const completedProjects = projects.filter(
  (project) => project.status === 'Completed'
);

const visibleProjects =
  projectView === 'active' ? activeProjects : completedProjects;


  if (!customer) {
    return <div className="text-black">Customer not found.</div>;
  }

  return (
    <div className="space-y-6 text-black">
      <div className="text-sm text-gray-500">
        <Link href="/customers" className="hover:text-black hover:underline">
          Customers
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-700">{customer.name}</span>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
  <div className="border-b pb-3">
    <p className="text-xs font-medium uppercase text-gray-500">Customer</p>
    <h1 className="mt-1 text-xl font-bold">{customer.name}</h1>
  </div>

  <div className="grid gap-3 py-3 md:grid-cols-[1fr_220px] md:gap-4 md:py-4">
  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm md:gap-x-4 md:gap-y-3">
      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Contact</p>
        <p className="mt-1 font-semibold">{customer.contactName || 'No contact saved'}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Phone</p>
        <p className="mt-1 font-semibold">{formatPhone(customer.phone)}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Address</p>
        <p className="mt-1 font-semibold">{customer.address || 'No address saved'}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Email</p>
        <p className="mt-1 font-semibold break-words">{customer.email || 'No email saved'}</p>
      </div>
    </div>

    <div className="space-y-4 border-t pt-4 text-sm md:border-l md:border-t-0 md:pl-4 md:pt-0">
    <div>
      <p className="text-xs font-medium uppercase text-gray-500">
        Pricing Models
      </p>

      <div className="mt-2 grid grid-cols-[56px_1fr] gap-x-4 gap-y-1">
        <span className="font-semibold">MAIN</span>
        <span className="text-gray-600">
          {customer.mainPricingType || 'Not set'}
        </span>

        <span className="font-semibold">LAT</span>
        <span className="text-gray-600">
          {customer.lateralPricingType || 'Not set'}
        </span>

        <span className="font-semibold">JET</span>
        <span className="text-gray-600">
          {customer.jetPricingType || 'Not set'}
        </span>
      </div>
    </div>

    <div className="border-t pt-4">
      <p className="text-xs font-medium uppercase text-gray-500">
        Customer Notes
      </p>
      <p className="mt-1 text-sm text-gray-700">
        {customer.notes || 'No notes saved'}
      </p>
    </div>
  </div>
</div>

  {customer.notes && (
    <div className="border-t pt-4">
      <p className="text-xs font-medium uppercase text-gray-500">Notes</p>
      <p className="mt-1 text-sm text-gray-700">{customer.notes}</p>
    </div>
  )}
</div>






<div className="rounded-2xl bg-white p-6 shadow">
<div>
  <h2 className="text-xl font-bold">Customer Project History</h2>

  <div className="mt-3 flex justify-center">
    <div className="inline-flex w-fit rounded-lg border bg-white p-1 shadow-sm">

      <button
        type="button"
        onClick={() => setProjectView('active')}
        className={`w-28 rounded-md px-4 py-2 text-sm font-medium ${
          projectView === 'active'
            ? 'bg-black text-white'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        Active
      </button>

      <button
        type="button"
        onClick={() => setProjectView('completed')}
        className={`rounded-md px-4 py-2 text-sm font-medium ${
          projectView === 'completed'
            ? 'bg-black text-white'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        Completed
      </button>
    </div>
  </div>
  </div>

  <div className="mt-4 space-y-3">
    {visibleProjects.map((project) => (
      <Link
        key={project.id}
        href={`/projects/${encodeURIComponent(project.project_number)}`}
        className="block rounded-xl border p-4 hover:bg-gray-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{project.project_number}</p>
            <p className="mt-1 text-sm text-gray-600">
              {project.project_location || 'No project location saved'}
            </p>
          </div>

          <span className="rounded-full border px-2 py-1 text-xs font-medium text-gray-600">
            {project.status}
          </span>
        </div>

        <p className="mt-3 text-sm text-gray-600">
  {projectView === 'active' ? 'Last service' : 'Service completed'}:{' '}
  {formatDate(project.service_start_date)}
</p>
      </Link>
    ))}

    {visibleProjects.length === 0 && (
      <div className="rounded-xl border border-dashed p-4 text-center text-sm text-gray-500">
        {projectView === 'active'
          ? 'No active projects found for this customer.'
          : 'No completed projects found for this customer.'}
      </div>
    )}
  </div>
</div>

    </div>
  );
}
