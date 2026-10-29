let cashfreePromise = null;

export function loadCashfreeScript() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Cashfree) return Promise.resolve(window.Cashfree);

  if (cashfreePromise) return cashfreePromise;

  cashfreePromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => {
      resolve(window.Cashfree);
    };
    script.onerror = () => {
      cashfreePromise = null;
      resolve(null);
    };
    document.body.appendChild(script);
  });

  return cashfreePromise;
}

export async function openCashfreeCheckout({
  paymentSessionId,
  mode = "sandbox",
  onSuccess,
  onFailure,
}) {
  const CashfreeConstructor = await loadCashfreeScript();
  if (!CashfreeConstructor) {
    throw new Error("Failed to load Cashfree payment SDK");
  }

  const cashfree = CashfreeConstructor({
    mode: mode === "production" ? "production" : "sandbox",
  });

  return cashfree
    .checkout({
      paymentSessionId,
      redirectTarget: "_modal",
    })
    .then((result) => {
      if (result.error) {
        if (onFailure) onFailure(result.error);
        return { status: "error", error: result.error };
      }
      if (result.paymentDetails) {
        if (onSuccess) onSuccess(result.paymentDetails);
        return { status: "success", paymentDetails: result.paymentDetails };
      }
      return { status: "pending" };
    });
}
