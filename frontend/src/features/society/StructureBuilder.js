import { useMemo } from "react";

function computePreview(wings, globalNumbering) {
  const allLabels = [];
  let total = 0;
  for (const w of wings) {
    const wingName = (w.name || "").trim().toUpperCase() || "?";
    const floors = Number(w.floors) || 0;
    const hasGround = Boolean(w.hasGround);
    const groundFlats = Number.isInteger(w.groundFlats) ? w.groundFlats : (hasGround ? 2 : 0);
    const defaultPerFloor = Number.isInteger(w.defaultPerFloor) ? w.defaultPerFloor : 4;
    const perFloorMap = w.perFloorMap || {};
    const numberingMode = w.numberingMode || globalNumbering || "floor_based";
    let seq = 1;
    for (let f = hasGround ? 0 : 1; f <= floors; f += 1) {
      let count;
      if (f === 0) count = groundFlats;
      else count = perFloorMap[String(f)] !== undefined ? Number(perFloorMap[String(f)]) : defaultPerFloor;
      if (!Number.isInteger(count) || count < 0) count = 0;
      total += count;
      for (let door = 1; door <= count; door += 1) {
        if (numberingMode === "sequential") {
          allLabels.push(`${wingName}-${seq++}`);
        } else {
          if (f === 0) allLabels.push(`${wingName}-G${door}`);
          else allLabels.push(`${wingName}-${f}0${door}`);
        }
      }
    }
  }
  return { total, allLabels };
}

export default function StructureBuilder({ wings, globalNumbering, onChangeWings, setGlobalNumbering }) {
  const { total, allLabels } = useMemo(() => computePreview(wings, globalNumbering), [wings, globalNumbering]);
  const previewSlice = allLabels.slice(0, 12);
  const remaining = allLabels.length - previewSlice.length;

  const updateWing = (idx, patch) => {
    const next = wings.map((w, i) => (i === idx ? { ...w, ...patch } : w));
    onChangeWings(next);
  };

  const updatePerFloorMap = (wingIdx, floorKey, value) => {
    const wing = wings[wingIdx];
    const nextMap = { ...(wing.perFloorMap || {}) };
    if (value === "" || value === null) delete nextMap[String(floorKey)];
    else nextMap[String(floorKey)] = Number(value);
    updateWing(wingIdx, { perFloorMap: nextMap });
  };

  const addWing = () => {
    const nextChar = String.fromCharCode(65 + wings.length);
    onChangeWings([...wings, { name: nextChar, floors: 4, hasGround: false, groundFlats: 2, defaultPerFloor: 4, numberingMode: globalNumbering, perFloorMap: {} }]);
  };

  const removeWing = (idx) => {
    if (wings.length === 1) return;
    onChangeWings(wings.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-label-md font-semibold text-on-surface">Wings &amp; Floors</p>
          <p className="text-body-sm text-on-surface-variant">Configure wings, G and per-floor flats. G=2 rest=4 is handled via per-floor override.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-label-sm font-semibold text-on-surface-variant">Numbering</label>
          <select value={globalNumbering} onChange={(e) => setGlobalNumbering(e.target.value)} className="border border-outline-variant rounded-lg px-3 py-2 text-body-sm bg-white">
            <option value="floor_based">101, 102 (Floor-based)</option>
            <option value="sequential">1, 2, 3 (Sequential)</option>
          </select>
        </div>
      </div>

      {wings.map((w, idx) => {
        const floors = Number(w.floors) || 0;
        const showAdvanced = w.showAdvanced;
        return (
          <div key={idx} className="border border-outline-variant/40 rounded-2xl p-4 bg-surface-container-low/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-label-sm font-semibold">Wing</label>
                  <input value={w.name} onChange={(e) => updateWing(idx, { name: e.target.value.toUpperCase().slice(0, 10) })} className="w-14 border border-outline-variant rounded-lg px-2 py-1.5 text-body-sm bg-white text-center font-bold" placeholder="A" />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-label-sm">Floors</label>
                  <input type="number" min="1" max="100" value={w.floors} onChange={(e) => updateWing(idx, { floors: Number(e.target.value) })} className="w-16 border border-outline-variant rounded-lg px-2 py-1.5 text-body-sm bg-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-label-sm">Per floor</label>
                  <input type="number" min="0" max="50" value={w.defaultPerFloor} onChange={(e) => updateWing(idx, { defaultPerFloor: Number(e.target.value) })} className="w-14 border border-outline-variant rounded-lg px-2 py-1.5 text-body-sm bg-white text-center" />
                </div>
              </div>
              <button type="button" onClick={() => removeWing(idx)} className="w-7 h-7 rounded-full hover:bg-error-container flex items-center justify-center text-on-surface-variant hover:text-error transition-colors" aria-label="Remove wing"><span className="material-symbols-outlined text-[16px]">close</span></button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={Boolean(w.hasGround)} onChange={(e) => updateWing(idx, { hasGround: e.target.checked })} className="accent-primary" />
                <span className="text-body-sm">Ground floor has flats</span>
              </label>
              {w.hasGround && (
                <div className="flex items-center gap-1.5">
                  <label className="text-label-sm">G flats</label>
                  <input type="number" min="0" max="50" value={w.groundFlats} onChange={(e) => updateWing(idx, { groundFlats: Number(e.target.value) })} className="w-14 border border-outline-variant rounded-lg px-2 py-1 text-body-sm bg-white text-center" />
                  <span className="text-body-sm text-on-surface-variant">(G floors handle 2 vs 4 case)</span>
                </div>
              )}
              <button type="button" onClick={() => updateWing(idx, { showAdvanced: !showAdvanced })} className="ml-auto text-label-sm font-semibold text-primary hover:underline">{showAdvanced ? "Hide per-floor" : "Vary per floor"}</button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {w.hasGround && (
                  <div className="border border-outline-variant/30 rounded-xl px-2 py-2 bg-white flex flex-col gap-1">
                    <span className="text-label-sm font-bold text-center">G</span>
                    <input type="number" min="0" max="50" value={w.perFloorMap?.["0"] !== undefined ? w.perFloorMap["0"] : w.groundFlats} onChange={(e) => updatePerFloorMap(idx, "0", e.target.value)} className="border border-outline-variant rounded-lg px-1 py-1 text-body-sm text-center" />
                  </div>
                )}
                {Array.from({ length: floors }, (_, i) => i + 1).map((floor) => (
                  <div key={floor} className="border border-outline-variant/30 rounded-xl px-2 py-2 bg-white flex flex-col gap-1">
                    <span className="text-label-sm font-bold text-center">{floor}</span>
                    <input type="number" min="0" max="50" value={w.perFloorMap?.[String(floor)] !== undefined ? w.perFloorMap[String(floor)] : w.defaultPerFloor} onChange={(e) => updatePerFloorMap(idx, String(floor), e.target.value)} className="border border-outline-variant rounded-lg px-1 py-1 text-body-sm text-center" />
                  </div>
                ))}
              </div>
            )}
            <div className="text-label-sm text-on-surface-variant">Wing <b>{w.name || "?"}</b> → {(() => {
              let c = 0;
              for (let f = w.hasGround ? 0 : 1; f <= floors; f += 1) {
                const v = f === 0 ? w.groundFlats : (w.perFloorMap?.[String(f)] !== undefined ? Number(w.perFloorMap[String(f)]) : Number(w.defaultPerFloor));
                c += Number(v) || 0;
              }
              return `${c} units`;
            })()}</div>
          </div>
        );
      })}

      <button type="button" onClick={addWing} className="w-full border-2 border-dashed border-outline-variant rounded-xl py-2.5 text-label-md font-semibold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-[18px]">add</span> Add Wing</button>

      <div className="border border-primary/20 bg-primary/5 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-label-sm font-semibold text-on-surface">Total units (auto): <span className="font-bold text-primary">{total}</span></span>
          <span className="text-label-sm text-on-surface-variant capitalize">{globalNumbering === "sequential" ? "Sequential 1..N" : "Floor 101.. "}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {previewSlice.map((lbl) => (
            <span key={lbl} className="bg-white border border-outline-variant/40 rounded-full px-2.5 py-1 text-label-sm font-medium">{lbl}</span>
          ))}
          {remaining > 0 && <span className="bg-white border border-outline-variant/40 rounded-full px-2.5 py-1 text-label-sm">+{remaining} more</span>}
          {allLabels.length === 0 && <span className="text-body-sm text-on-surface-variant">No units — check per-floor counts</span>}
        </div>
        <p className="text-body-sm text-on-surface-variant mt-2">Example: G=2 rest=4 with 10 floors → {`G:2 + 10×4 = 42`} — preview shows <code>A-G1, A-G2, A-101..</code></p>
      </div>
    </div>
  );
}

export function computeStructureTotal(wings, globalNumbering) {
  return computePreview(wings, globalNumbering);
}
