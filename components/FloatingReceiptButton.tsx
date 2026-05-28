'use client';
import { ReceiptText } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

export default function FloatingReceiptButton() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');

  function openCamera() {
    fileInputRef.current?.click();
  }

  function handleReceiptPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  function closePreview() {
    setReceiptFile(null);
    setReceiptPreview('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleReceiptPhoto}
        className="hidden"
      />

      <button
        type="button"
        onClick={openCamera}
        aria-label="Add receipt"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#009be5] pb-0.5 text-2xl font-medium leading-none text-white shadow-lg hover:bg-[#007bb8]"
        >
  <ReceiptText size={22} strokeWidth={2.5} />
      </button>

      {receiptFile && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40 p-4">
          <div className="w-full rounded-2xl bg-white p-4 text-black shadow-xl">
            <h2 className="text-lg font-bold">Receipt Photo</h2>

            {receiptPreview && (
              <img
                src={receiptPreview}
                alt="Receipt preview"
                className="mt-4 max-h-[55vh] w-full rounded-xl object-contain"
              />
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={closePreview}
                className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  alert('Next step: add memo and send to QuickBooks.');
                }}
                className="flex-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}