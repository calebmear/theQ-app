'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUserProfile } from '../../lib/useUserProfile';

import { supabase } from '../../lib/supabaseClient';

type PricingModels = {
  MAIN: string;
  LAT: string;
  JET: string;
  DYE: string;
  SMK: string;
  TRFC: string;
};

type Customer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  pricingModels: PricingModels;
};

type CustomerForm = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  pricingModels: PricingModels;
};

const emptyPricingModels: PricingModels = {
  MAIN: '',
  LAT: '',
  JET: '',
  DYE: '',
  SMK: '',
  TRFC: '',
};

const pricingModelOptions = [
  { code: 'MAIN', label: 'Mainline', choices: ['Per Hour', 'Per Foot'] },
  { code: 'LAT', label: 'Lateral', choices: ['Per Hour', 'Per Lateral'] },
  { code: 'JET', label: 'Jetter', choices: ['Per Hour', 'Per Foot'] },
  { code: 'DYE', label: 'Dye', choices: ['Per Hour'] },
  {
    code: 'SMK',
    label: 'Smoke',
    choices: ['Per Hour', 'Per Mainline Test', 'Per Residence'],
  },
  { code: 'TRFC', label: 'Traffic Control', choices: ['Flat Rate'] },
] as const;

const emptyCustomerForm: CustomerForm = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  pricingModels: emptyPricingModels,
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const { role } = useUserProfile();

const normalizedRole = role ? String(role).trim().toLowerCase() : null;
const canManageCustomers =
  normalizedRole === 'admin' || normalizedRole === 'management';

  const [showCustomerBillingMethods, setShowCustomerBillingMethods] =
    useState(false);
  const [newCustomer, setNewCustomer] =
    useState<CustomerForm>(emptyCustomerForm);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select(
        'id, name, contact_name, phone, email, address, notes, main_pricing_type, lateral_pricing_type, jet_pricing_type, dye_pricing_type, smoke_pricing_type, traffic_control_pricing_type'
      )
      .order('name');

    if (error) {
      console.error('Error loading customers:', error);
      setLoading(false);
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
      pricingModels: {
        MAIN: customer.main_pricing_type ?? '',
        LAT: customer.lateral_pricing_type ?? '',
        JET: customer.jet_pricing_type ?? '',
        DYE: customer.dye_pricing_type ?? '',
        SMK: customer.smoke_pricing_type ?? '',
        TRFC: customer.traffic_control_pricing_type ?? '',
      },
    }));

    setCustomers(formattedCustomers);
    setLoading(false);
  }

  function formatPhone(value: string) {
    if (!value) return 'No phone saved';

    const digits = value.replace(/\D/g, '');

    if (digits.length !== 10) {
      return value;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  async function saveCustomer() {

    if (!canManageCustomers) return;

    if (
      !newCustomer.name.trim() ||
      !newCustomer.contactName.trim() ||
      !newCustomer.phone.trim() ||
      !newCustomer.email.trim() ||
      !newCustomer.address.trim() ||
      
      Object.values(newCustomer.pricingModels).some((value) => !value)
    ) {
      alert('Please complete all required customer fields.');
      return;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: newCustomer.name,
        contact_name: newCustomer.contactName,
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address,
        notes: newCustomer.notes,
        main_pricing_type: newCustomer.pricingModels.MAIN,
        lateral_pricing_type: newCustomer.pricingModels.LAT,
        jet_pricing_type: newCustomer.pricingModels.JET,
        dye_pricing_type: newCustomer.pricingModels.DYE,
        smoke_pricing_type: newCustomer.pricingModels.SMK,
        traffic_control_pricing_type: newCustomer.pricingModels.TRFC,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving customer:', error);
      alert(error.message);
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
      pricingModels: {
        MAIN: data.main_pricing_type ?? '',
        LAT: data.lateral_pricing_type ?? '',
        JET: data.jet_pricing_type ?? '',
        DYE: data.dye_pricing_type ?? '',
        SMK: data.smoke_pricing_type ?? '',
        TRFC: data.traffic_control_pricing_type ?? '',
      },
    };

    setCustomers(
      [...customers, customer].sort((a, b) => a.name.localeCompare(b.name))
    );

    setNewCustomer(emptyCustomerForm);
    setShowCustomerBillingMethods(false);
    setShowCustomerForm(false);
  }

  if (loading) {
    return <div className="text-black">Loading customers...</div>;
  }

  return (
    <div className="space-y-6 text-black">
      <div className="border-b border-gray-200 pb-4">
        <p className="text-center text-sm text-gray-600">
          Customer directory, contact details, and profiles.
        </p>

        {canManageCustomers && (
  <div className="mt-3">
    <button
      type="button"
      onClick={() => {
        setShowCustomerBillingMethods(false);
        setShowCustomerForm(true);
      }}
      className="w-full rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
    >
      + Add Customer
    </button>
  </div>
)}
      </div>

      <div className="space-y-3">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="rounded-xl border bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <Link
                href={`/customers/${customer.id}?from=/customers&fromLabel=Customers`}
                className="min-w-0 flex-1"
              >
                <h2 className="truncate font-bold">{customer.name}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {customer.contactName || 'No contact saved'} •{' '}
                  {formatPhone(customer.phone)}
                </p>

                <div className="mt-2 hidden text-sm text-gray-600 md:block">
                  {customer.email && <p>{customer.email}</p>}
                  {customer.address && <p>{customer.address}</p>}
                </div>
              </Link>

              <span className="text-xl text-gray-400">›</span>
            </div>
          </div>
        ))}

        {customers.length === 0 && (
          <div className="rounded-xl border border-dashed bg-white p-4 text-center text-sm text-gray-500">
            No customers found.
          </div>
        )}
      </div>

      {canManageCustomers && showCustomerForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8">
          <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold">Add Customer</h2>

            <div className="mt-4 grid flex-1 gap-4 overflow-y-auto pr-1">
              <input
                required
                type="text"
                placeholder="Customer name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="text"
                placeholder="Contact name"
                value={newCustomer.contactName}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    contactName: e.target.value,
                  })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="tel"
                placeholder="Phone"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="email"
                placeholder="Email"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="text"
                placeholder="Mailing address"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <div className="rounded-lg border p-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowCustomerBillingMethods(!showCustomerBillingMethods)
                  }
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-sm font-medium">Billing Methods</span>

                  <span className="text-xl leading-none text-gray-500">
                    {showCustomerBillingMethods ? '⌄' : '›'}
                  </span>
                </button>

                {showCustomerBillingMethods && (
                  <div className="mt-3 grid gap-3">
                    {pricingModelOptions.map((option) => (
                      <div
                        key={option.code}
                        className="grid gap-2 md:grid-cols-[120px_1fr]"
                      >
                        <div className="flex items-baseline gap-2">
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs font-medium text-gray-500">
                            {option.code}
                          </p>
                        </div>

                        <select
                          value={newCustomer.pricingModels[option.code]}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              pricingModels: {
                                ...newCustomer.pricingModels,
                                [option.code]: e.target.value,
                              },
                            })
                          }
                          className={`rounded-lg border p-3 ${
                            newCustomer.pricingModels[option.code]
                              ? 'text-black'
                              : 'text-gray-400'
                          }`}
                        >
                          <option value="" disabled hidden>
                            Select pricing
                          </option>

                          {option.choices.map((choice) => (
                            <option
                              key={choice}
                              value={choice}
                              className="text-black"
                            >
                              {choice}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
    </div>
  );
}
