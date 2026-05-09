'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { projects as mockProjects } from '../../lib/mockData';
import { supabase } from '../../lib/supabaseClient';

type Customer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
};

type Project = {
  id: string;
  name: string;
  customer: string;
  assignedTo: string;
  status: string;
  progress: number;
  startdateofservice: string;
  notes?: string;
};

type Employee = {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
};


export default function OperationsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [customerSearch, setCustomerSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const [newProject, setNewProject] = useState({
    id: '',
    name: '',
    customerId: '',
    assignedToId: '',
    status: 'Active',
    progress: 0,
    startdateofservice: today,
    notes: '',
  });

  useEffect(() => {
    async function loadEmployees() {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role, active')
        .eq('active', true)
        .order('name');
  
      if (error) {
        console.error('Error loading employees:', error);
        return;
      }
  
      setEmployees(data ?? []);
    }
  
    loadEmployees();
  }, []);

  useEffect(() => {
    async function loadCustomers() {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, contact_name, phone, email, address, notes')
        .order('name');
  
      if (error) {
        console.error('Error loading customers:', error);
        return;
      }
  
      const formattedCustomers: Customer[] = (data ?? []).map((customer) => ({
        id: customer.id,
        name: customer.name,
        contactName: customer.contact_name ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        notes: customer.notes ?? '',
      }));
  
      setCustomers(formattedCustomers);
    }
  
    loadCustomers();
  }, []);

  
  const filteredCustomers = customers.filter((customer) => {
    const search = customerSearch.toLowerCase();

    return (
      customer.name.toLowerCase().includes(search) ||
      customer.contactName.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search)
    );
  });

  async function saveCustomer() {
    if (!newCustomer.name.trim()) return;
  
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: newCustomer.name,
        contact_name: newCustomer.contactName,
        phone: newCustomer.phone,
        email: newCustomer.email,
      })
      .select()
      .single();
  
    if (error) {
      console.error('Error saving customer:', error);
      return;
    }
  
    const customer: Customer = {
      id: data.id,
      name: data.name,
      contactName: data.contact_name ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      address: data.address ?? '',
      notes: data.notes ?? '',
    };
  
    setCustomers([...customers, customer]);
  
    setNewCustomer({
      name: '',
      contactName: '',
      phone: '',
      email: '',
    });
  
    setShowCustomerForm(false);
  }

  async function saveProject() {
    if (!newProject.id.trim() || !newProject.customerId) {
      return;
    }
  
    const { data, error } = await supabase
      .from('projects')
      .insert({
        project_number: newProject.id,
        customer_id: newProject.customerId,
        assigned_to: newProject.assignedToId || null,
        status: newProject.status,
        progress: Number(newProject.progress),
        service_start_date: newProject.startdateofservice,
        notes: newProject.notes,
      })
      .select()
      .single();
  
    if (error) {
      console.error('Error saving project:', error);
      return;
    }
  
    const selectedCustomer = customers.find(
      (customer) => customer.id === newProject.customerId
    );
  
    const selectedEmployee = employees.find(
      (employee) => employee.id === newProject.assignedToId
    );
  
    const project: Project = {
      id: data.project_number,
      name: data.project_number,
      customer: selectedCustomer?.name ?? '',
      assignedTo: selectedEmployee?.name ?? '',
      status: data.status ?? 'Active',
      progress: Number(data.progress ?? 0),
      startdateofservice: data.service_start_date ?? '',
      notes: data.notes ?? '',
    };
  
    setProjects([...projects, project]);
  
    setNewProject({
      id: '',
      name: '',
      customerId: '',
      assignedToId: '',
      status: 'Active',
      progress: 0,
      startdateofservice: today,
      notes: '',
    });
  
    setShowProjectForm(false);
  }
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
          <button
            type="button"
            onClick={() => setShowCustomerForm(true)}
            className="rounded-lg border bg-white px-4 py-3 font-medium shadow-sm hover:bg-gray-50"
          >
            + Add Customer
          </button>

          <button
            type="button"
            onClick={() => setShowProjectForm(true)}
            className="rounded-lg bg-black px-4 py-3 font-medium text-white shadow-sm hover:bg-gray-800"
          >
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
                    {customer.contactName} • {customer.phone}
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

      {showCustomerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold">Add Customer</h2>

            <div className="mt-4 grid gap-4">
              <input
                type="text"
                placeholder="Customer name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                type="text"
                placeholder="Contact name"
                value={newCustomer.contactName}
onChange={(e) =>
  setNewCustomer({ ...newCustomer, contactName: e.target.value })
}
                className="rounded-lg border p-3"
              />

              <input
                type="tel"
                placeholder="Phone"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                type="email"
                placeholder="Email"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
                className="rounded-lg border p-3"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCustomerForm(false)}
                className="rounded-lg border px-5 py-3 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveCustomer}
                className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold">Add Project</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Customer
                </label>
                <select
  value={newProject.customerId}
  onChange={(e) =>
    setNewProject({ ...newProject, customerId: e.target.value })
  }
  className="w-full rounded-lg border p-3"
>
  <option value="" disabled hidden>
    Select customer
  </option>

  {customers.map((customer) => (
    <option key={customer.id} value={customer.id}>
      {customer.name}
    </option>
  ))}
</select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Project ID / PO Number
                </label>
                <input
                  type="text"
                  placeholder="Enter project ID or PO number"
                  value={newProject.id}
                  onChange={(e) =>
                    setNewProject({ ...newProject, id: e.target.value })
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
  <label className="mb-2 block text-sm font-medium">
    Assigned To
  </label>

  <select
  value={newProject.assignedToId}
  onChange={(e) =>
    setNewProject({ ...newProject, assignedToId: e.target.value })
  }
  className="w-full rounded-lg border p-3"
>
  <option value="" disabled hidden>
    Select Technician
  </option>

  {employees.map((employee) => (
    <option key={employee.id} value={employee.id}>
      {employee.name}
    </option>
  ))}
</select>
</div>

              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <select
                  value={newProject.status}
                  onChange={(e) =>
                    setNewProject({ ...newProject, status: e.target.value })
                  }
                  className="w-full rounded-lg border p-3"
                >
                  <option>Active</option>
                  <option>Scheduled</option>
                  <option>Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Service Start Date
                </label>
                <input
                  type="date"
                  value={newProject.startdateofservice}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      startdateofservice: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="rounded-lg border px-5 py-3 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveProject}
                className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
