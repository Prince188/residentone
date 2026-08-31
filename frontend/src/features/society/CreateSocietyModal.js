import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerSociety, extractApiError, extractFieldErrors } from "../../lib/societies";
import SocietyFormFields, { validateSocietyForm, toApiPayload, EMPTY_SOCIETY_FORM } from "./SocietyFormFields";
import StructureBuilder, { computeStructureTotal } from "./StructureBuilder";
import useSocietyModalStore from "../../stores/societyModal.store";

function SuccessPanel({ result, onClose }) {
  return (
    <div className="w-full text-center py-2">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-fixed">
        <span className="material-symbols-outlined text-[36px] text-on-tertiary-fixed">check_circle</span>
      </div>
      <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Registration Submitted</h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">Your society has been submitted. Our team will review and activate it.</p>
      {result?.societyId && (
        <div className="mb-4 inline-flex flex-col items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-low px-6 py-4">
          <span className="text-label-sm uppercase tracking-widest text-outline">Registration ID</span>
          <span className="text-body-md font-semibold text-on-surface break-all">{result.societyId}</span>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-3 py-0.5 text-label-sm font-semibold capitalize text-on-secondary-fixed">Status: {result.status}</span>
        </div>
      )}
      <button onClick={onClose} className="mt-2 bg-inverse-surface text-white font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-primary transition-colors">Done</button>
    </div>
  );
}

export default function CreateSocietyModal() {
  const isOpen = useSocietyModalStore((s) => s.isOpen);
  const close = useSocietyModalStore((s) => s.close);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [values, setValues] = useState(EMPTY_SOCIETY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null);
  const [wings, setWings] = useState([{ name: "A", floors: 4, hasGround: true, groundFlats: 2, defaultPerFloor: 4, numberingMode: "floor_based", perFloorMap: {}, showAdvanced: false }]);
  const [globalNumbering, setGlobalNumbering] = useState("floor_based");

  const societyType = values.societyType;
  const isApartmentLike = societyType === "apartment" || societyType === "mixed";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // reset on close after animation
      const t = setTimeout(() => {
        setStep(1);
        setResult(null);
        setFormError("");
        setErrors({});
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (formError) setFormError("");
  };

  const handleNext = () => {
    const validationErrors = validateSocietyForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (isApartmentLike) setStep(2);
    else handleSubmit();
  };

  const buildStructure = () => {
    if (!isApartmentLike) return null;
    const cleaned = wings.map((w) => {
      const { showAdvanced, ...rest } = w;
      // Normalize: ensure floors int, etc.
      return {
        name: String(rest.name).trim().toUpperCase(),
        floors: Number(rest.floors),
        hasGround: Boolean(rest.hasGround),
        groundFlats: Number(rest.groundFlats),
        defaultPerFloor: Number(rest.defaultPerFloor),
        numberingMode: rest.numberingMode || globalNumbering,
        perFloorMap: rest.perFloorMap || {},
      };
    }).filter((w) => w.name && w.floors > 0);
    if (cleaned.length === 0) return null;
    return { wings: cleaned, numberingMode: globalNumbering };
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormError("");
    const validationErrors = validateSocietyForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStep(1);
      return;
    }
    if (isApartmentLike) {
      const structure = buildStructure();
      if (!structure || structure.wings.length === 0) {
        setFormError("Please configure at least one wing.");
        return;
      }
      const { total } = computeStructureTotal(structure.wings, structure.numberingMode);
      if (total <= 0) {
        setFormError("Wing configuration yields 0 units. Check per-floor counts.");
        return;
      }
    }
    setLoading(true);
    try {
      const structure = buildStructure();
      const payload = toApiPayload(values);
      if (structure) payload.structure = structure;
      const response = await registerSociety(payload);
      setResult(response.data.data);
      setStep(3);
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setErrors((prev) => ({ ...prev, ...fieldErrors }));
      setFormError(extractApiError(err, "Something went wrong while submitting your registration. Please try again."));
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClose = () => {
    close();
  };

  const structurePreview = buildStructure();
  const computedTotal = structurePreview ? computeStructureTotal(structurePreview.wings, structurePreview.numberingMode).total : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <button aria-label="Close" onClick={handleOverlayClose} className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" tabIndex={-1} />
      <div className="relative bg-white rounded-[24px] shadow-[0_24px_64px_-24px_rgba(0,23,75,0.4)] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-outline-variant/20">
        <div className="flex items-center justify-between px-6 sm:px-7 py-4 border-b border-outline-variant/20 shrink-0">
          <div>
            <h2 className="text-title-lg font-bold text-on-surface leading-none">Create Society</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">{step === 3 ? "All done" : isApartmentLike && step === 2 ? "Step 2 of 2 — Wings & Floors" : isApartmentLike ? "Step 1 of 2 — Society Details" : "Society Details"}</p>
          </div>
          <button onClick={handleOverlayClose} className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"><span className="material-symbols-outlined text-[22px]">close</span></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 sm:px-7 py-6" style={{ scrollbarGutter: "stable" }}>
          {step === 3 ? (
            <SuccessPanel result={result} onClose={() => { close(); navigate("/"); }} />
          ) : step === 2 ? (
            <div className="space-y-4">
              <StructureBuilder wings={wings} globalNumbering={globalNumbering} onChangeWings={setWings} setGlobalNumbering={setGlobalNumbering} />
              {formError && <div className="rounded-lg border border-error-container bg-error-container/40 px-4 py-3"><p className="text-body-sm text-error">{formError}</p></div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-outline-variant font-semibold hover:bg-surface-container transition-colors">Back</button>
                <button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 bg-primary text-on-primary font-semibold py-3 rounded-xl hover:bg-inverse-surface disabled:opacity-60 transition-colors">{loading ? "Submitting..." : `Create ${computedTotal ? `(${computedTotal} units)` : ""}`}</button>
              </div>
              <p className="text-center text-label-sm text-outline">Units will be auto-created as <code>A-G1, A-G2, A-101…</code> or <code>A-1, A-2…</code> based on numbering.</p>
            </div>
          ) : (
            <div>
              {formError && <div className="mb-4 rounded-lg border border-error-container bg-error-container/40 px-4 py-3"><p className="text-body-sm text-error">{formError}</p></div>}
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">Society Information</p>
              <SocietyFormFields values={values} errors={errors} onChange={handleChange} disabled={loading} />
              {isApartmentLike && computedTotal !== null && <p className="mt-3 text-body-sm text-on-surface-variant">Wing preview: <b>{computedTotal} units</b> will be created. You can adjust in next step.</p>}
              <button type="button" onClick={handleNext} disabled={loading} className="mt-6 w-full bg-primary text-on-primary font-semibold py-3 rounded-xl hover:bg-inverse-surface disabled:opacity-60 transition-colors">{isApartmentLike ? "Next — Wings & Floors" : loading ? "Submitting..." : "Submit Registration"}</button>
              <p className="mt-3 text-center text-label-sm text-outline">Will remain in review until approved by ResidentOne team.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
