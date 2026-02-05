import React from "react";
import { useCredits } from "../state/CreditsContext.jsx";
import { usePricingModal } from "../state/usePricingModal";
import { PricingModal } from "../components/PricingModal";

export default function Pricing() {
  const { credits } = useCredits();
  const { open, openModal, closeModal } = usePricingModal();

  return (
    <section className="pricingWrap">
      <h1>Pricing</h1>
      <p className="sub">
        Simple pricing based on export time. <b>1 credit = 1 second.</b>
      </p>

      <div className="plans">
        <Plan
          title="Free"
          price="$0"
          bullets={[
            "120 credits",
            "Watermarked exports",
            "Up to 60s per export",
          ]}
          cta="Start Editing"
        />

        <Plan
          title="Starter"
          price="$12 / month"
          bullets={[
            "1,200 credits (~20 min)",
            "No watermark",
            "1080p exports",
          ]}
          cta="Upgrade"
          highlight
          onClick={openModal}
        />

        <Plan
          title="Pro"
          price="$29 / month"
          bullets={[
            "6,000 credits (~100 min)",
            "No watermark",
            "4K exports",
          ]}
          cta="Upgrade"
          onClick={openModal}
        />
      </div>

      <div className="creditsNow">
        Credits available: <b>{credits}</b>
      </div>

      <PricingModal open={open} onClose={closeModal} />
    </section>
  );
}

function Plan({ title, price, bullets, cta, highlight, onClick }) {
  return (
    <div className={`plan ${highlight ? "highlight" : ""}`}>
      <h3>{title}</h3>
      <div className="price">{price}</div>
      <ul>
        {bullets.map(b => <li key={b}>{b}</li>)}
      </ul>
      <button className="cta" onClick={onClick}>{cta}</button>
    </div>
  );
}
