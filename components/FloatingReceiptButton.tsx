'use client';
import { ReceiptText } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

export default function FloatingReceiptButton() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);

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

  useEffect(() => {
    let scrollTimer: ReturnType<typeof window.setTimeout>;
  
    function handleScroll() {
      setIsScrolling(true);
  
      window.clearTimeout(scrollTimer);
  
      scrollTimer = window.setTimeout(() => {
        setIsScrolling(false);
      }, 350);
    }
  
    window.addEventListener('scroll', handleScroll, { passive: true });
  
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.clearTimeout(scrollTimer);
    };
  }, []);

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
  className={`flex h-16 w-16 items-center justify-center rounded-full bg-[#009be5] text-white shadow-xl transition-opacity duration-200 hover:bg-[#007bb8] ${
    isScrolling ? 'opacity-25' : 'opacity-100'
  }`}
>
  <ReceiptText size={28} strokeWidth={2.5} />
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