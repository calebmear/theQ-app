'use client';
import { ReceiptText } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import imageCompression from 'browser-image-compression';

export default function FloatingReceiptButton() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);

  const [memo, setMemo] = useState('');
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  function showToast(message: string) {
    setToastMessage(message);
  
    window.setTimeout(() => {
      setToastMessage('');
    }, 3000);
  }

  useEffect(() => {
    let scrollTimer: number | undefined;
  
    function handleScroll() {
      setIsScrolling(true);
  
      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
      }
  
      scrollTimer = window.setTimeout(() => {
        setIsScrolling(false);
      }, 350);
    }
  
    window.addEventListener('scroll', handleScroll, { passive: true });
  
    return () => {
      window.removeEventListener('scroll', handleScroll);
  
      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
      }
    };
  }, []);

  async function saveReceipt() {
    if (!receiptFile) return;
  
    setSavingReceipt(true);
  
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      if (!user) {
        alert('You must be signed in to save receipts.');
        return;
      }
  
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', user.id)
        .single();
  
        const compressedReceiptFile = await imageCompression(receiptFile, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
        
        const safeFileName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const filePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('Receipts')
          .upload(filePath, compressedReceiptFile, {
            contentType: receiptFile.type,
          });
  
      if (uploadError) {
        alert(`Receipt upload failed: ${uploadError.message}`);
        return;
      }
  
      const { data: savedReceipt, error: insertError } = await supabase
  .from('receipts')
  .insert({
    uploaded_by: user.id,
    uploaded_by_username: profile?.username ?? null,
    memo: memo.trim() || null,
    file_name: receiptFile.name,
    file_path: filePath,
    file_type: receiptFile.type,
  })
  .select('id')
  .single();

if (insertError) {
  alert(`Receipt save failed: ${insertError.message}`);
  return;
}

setReceiptFile(null);
setReceiptPreview('');
setMemo('');

showToast('Receipt saved. Sending to QuickBooks...');

fetch('/.netlify/functions/send-receipt-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    receiptId: savedReceipt.id,
  }),
})
.then(async (response) => {
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.error
        ? typeof result.error === 'string'
          ? result.error
          : JSON.stringify(result.error)
        : 'QuickBooks send failed'
    );
  }

  showToast('Receipt sent to QuickBooks.');
})
.catch((error) => {
  console.error('Receipt email failed:', error);
  showToast(`QuickBooks failed: ${error.message}`);
});
    } finally {
      setSavingReceipt(false);
  
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
  className={`flex h-14 w-12 items-center justify-center rounded-l-full bg-[#009be5] pl-1 text-white shadow-lg transition-opacity duration-200 hover:bg-[#007bb8] ${
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


<textarea
  value={memo}
  onChange={(e) => setMemo(e.target.value)}
  placeholder="Memo or note..."
  className="mt-4 w-full rounded-lg border p-3 text-sm"
  rows={3}
/>
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
  onClick={saveReceipt}
  disabled={savingReceipt}
  className="flex-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
>
  {savingReceipt ? 'Saving...' : 'Save Receipt'}
</button>
            </div>
          </div>
        </div>

)}

      {toastMessage && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 right-4 z-[70] rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white shadow-lg md:left-auto md:right-6 md:w-80">
          {toastMessage}
        </div>
      )}
    </>
  );
}