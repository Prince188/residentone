import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useSocietyModalStore from "../../stores/societyModal.store";

// This route now just triggers the popup overlay (per request: no separate page).
// Direct visit to /create-society auto-opens modal and shows backdrop hint.

export default function CreateSocietyPage() {
  const open = useSocietyModalStore((s) => s.open);
  const isOpen = useSocietyModalStore((s) => s.isOpen);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) open();
  }, [open, isOpen]);

  return (
    <div className="flex-grow flex flex-col items-center justify-center bg-surface-container-lowest pt-16 md:pt-24 p-8 text-center">
      <div className="max-w-md">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Create Society</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">Use the overlay to create your society. Wings / Floors / G handling included.</p>
        <button onClick={() => open()} className="mt-6 bg-primary text-on-primary px-6 py-3 rounded-xl font-semibold hover:bg-inverse-surface transition-colors">Open Create Society</button>
        <button onClick={() => navigate("/")} className="mt-3 block mx-auto text-label-md text-primary hover:underline">Back to Home</button>
      </div>
    </div>
  );
}
