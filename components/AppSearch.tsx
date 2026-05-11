'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function AppSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchValue = searchParams.get('q') ?? '';

  function updateSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      params.set('q', value);
    } else {
      params.delete('q');
    }

    const query = params.toString();

    router.replace(query ? `/operations?${query}` : '/operations');
  }

  return (
    <input
      type="text"
      placeholder="Search projects, customers, addresses..."
      value={searchValue}
      onChange={(e) => updateSearch(e.target.value)}
      className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm md:mt-4 md:w-full"
    />
  );
}
