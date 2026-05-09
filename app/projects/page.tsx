'use client';

import { useState } from 'react';
import { customers as mockCustomers, projects } from '../../lib/mockData';

type Customer = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

const emptyCustomer: Customer = {
  id: '',
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

export default function ProjectsPage() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    mockCustomers[0]?.id ?? ''
  );
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState<Customer>(emptyCustomer);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ??
    filteredCustomers[0];

  const selectedCustomerProjects = selectedCustomer
    ? projects.filter((project) => project.customer === selectedCustomer.name)
    : [];

  function openAddCustomer() {
    setCustomerForm(emptyCustomer);
    setEditingCustomer(false);
    setShowAddCustomer(true);
  }

  function openEditCustomer(customer: Customer) {
    setCustomerForm(customer);
    setEditingCustomer(true);
    setShowAddCustomer(true);
  }

  function saveCustomer() {
    if (!customerForm.name.trim()) return;

    if (editingCustomer) {
      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          customer.id === customerForm.id ? customerForm : customer
        )
      );
      setSelectedCustomerId(customerForm.id);
    } else {
      const newCustomer = {
        ...customerForm,
        id: `cust-${Date.now()}`,
      };

      setCustomers((currentCustomers) => [...currentCustomers, newCustomer]);
      setSelectedCustomerId(newCustomer.id);
    }

    setShowAddCustomer(false);
    setCustomerForm(emptyCustomer);
    setEditingCustomer(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="mt-2 text-gray-600">
            Search customers, review customer profiles, and start project setup.
          </p>
        </div>

        <button
          onClick={openAddCustomer}
          className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
        >
          Add Customer
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Customer Search</h2>

          <input
            type="text"
            placeholder="Search customers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-4 w-full rounded-lg border p-3"
          />

          <div className="mt-4 space-y-2">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomerId(customer.id)}
                className={`w-full rounded-lg border p-4 text-left hover:bg-gray-50 ${
                  selectedCustomer?.id === customer.id
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200'
                }`}
              >
                <p className="font-semibold">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.contactName}</p>
              </button>
            ))}

            {filteredCustomers.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                No customers found.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {selectedCustomer ? (
            <>
              <div className="rounded-2xl bg-white p-6 shadow">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedCustomer.name}
                    </h2>
                    <p className="mt-1 text-gray-600">
                      {selectedCustomer.contactName}
                    </p>
                  </div>

                  <button
                    onClick={() => openEditCustomer(selectedCustomer)}
                    className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                  >
                    Edit Customer
                  </button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedCustomer.phone}</p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">{selectedCustomer.address}</p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Customer Notes</p>
                    <p className="font-medium">{selectedCustomer.notes}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-2xl font-bold">Customer Projects</h2>

                  <button className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800">
                    Add Project
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4">Project ID</th>
                        <th className="p-4">Project</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Progress</th>
                        <th className="p-4">Target Completion</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedCustomerProjects.map((project) => (
                        <tr key={project.id} className="border-t">
                          <td className="p-4 font-medium">{project.id}</td>
                          <td className="p-4">{project.name}</td>
                          <td className="p-4">{project.status}</td>
                          <td className="p-4">{project.progress}%</td>
                          <td className="p-4">{project.startdateofservice}</td>
                        </tr>
                      ))}

                      {selectedCustomerProjects.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-4 text-center text-gray-500"
                          >
                            No projects found for this customer yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-gray-500">
                Select a customer to view details.
              </p>
            </div>
          )}
        </div>
      </div>

      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold">
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Customer name"
                value={customerForm.name}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    name: event.target.value,
                  })
                }
                className="rounded-lg border p-3"
              />

              <input
                type="text"
                placeholder="Contact name"
                value={customerForm.contactName}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    contactName: event.target.value,
                  })
                }
                className="rounded-lg border p-3"
              />

              <input
                type="email"
                placeholder="Email"
                value={customerForm.email}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    email: event.target.value,
                  })
                }
                className="rounded-lg border p-3"
              />

              <input
                type="tel"
                placeholder="Phone"
                value={customerForm.phone}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    phone: event.target.value,
                  })
                }
                className="rounded-lg border p-3"
              />

              <input
                type="text"
                placeholder="Address"
                value={customerForm.address}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    address: event.target.value,
                  })
                }
                className="rounded-lg border p-3 md:col-span-2"
              />

              <textarea
                placeholder="Customer notes"
                value={customerForm.notes}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    notes: event.target.value,
                  })
                }
                className="rounded-lg border p-3 md:col-span-2"
                rows={4}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddCustomer(false)}
                className="rounded-lg border px-5 py-3 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={saveCustomer}
                className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
