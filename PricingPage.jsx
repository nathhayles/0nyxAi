import React, { useState } from "react";

// =============================
// Pricing Card
// =============================
const PricingCard = ({ plan, price, desc, features, highlighted }) => {
  return (
    <div className={`card ${highlighted ? "card-highlight" : ""}`}>
      {highlighted && <div className="badge">Most Popular</div>}

      <h3>{plan}</h3>
      <p className="desc">{desc}</p>

      <div className="price">{price}</div>

      <ul>
        {features.map((f, i) => (
          <li key={i}>✔ {f}</li>
        ))}
      </ul>

      <button className="cta">Start Now</button>
    </div>
  );
};

// =============================
// Feature Table
// =============================
const FeatureTable = () => {
  return (
    <div className="table-wrap">
      <h2>Compare Plans</h2>

      <table>
        <thead>
          <tr>
            <th>Features</th>
            <th>Starter</th>
            <th>Creator</th>
            <th>Pro</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>AI Storyboard</td>
            <td>✔</td>
            <td>✔</td>
            <td>✔</td>
          </tr>
          <tr>
            <td>Stock Media</td>
            <td>✔</td>
            <td>✔</td>
            <td>✔</td>
          </tr>
          <tr>
            <td>Voiceovers</td>
            <td>Basic</td>
            <td>Premium</td>
            <td>Premium</td>
          </tr>
          <tr>
            <td>Watermark</td>
            <td>Yes</td>
            <td>No</td>
            <td>No</td>
          </tr>
          <tr>
            <td>Credits / Month</td>
            <td>100</td>
            <td>500</td>
            <td>2000</td>
          </tr>
          <tr>
            <td>Priority Queue</td>
            <td>❌</td>
            <td>✔</td>
            <td>✔</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// =============================
// Add-ons
// =============================
const AddOns = () => {
  const items = [
    { title: "Extra Credits", desc: "Scale your output instantly" },
    { title: "Premium Voices", desc: "Unlock high-quality narration" },
    { title: "Render Boost", desc: "Faster processing priority" },
  ];

  return (
    <div className="addons">
      <h2>Boost Your Workflow</h2>

      <div className="addons-grid">
        {items.map((a, i) => (
          <div key={i} className="addon">
            <h4>{a.title}</h4>
            <p>{a.desc}</p>
            <button>Add</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================
// MAIN PAGE
// =============================
export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="pricing">
      {/* HERO */}
      <div className="hero">
        <h1>Simple, scalable pricing</h1>
        <p>Create, edit and publish AI videos faster than ever.</p>

        <div className="toggle">
          <span>Monthly</span>

          <div
            className={`switch ${yearly ? "active" : ""}`}
            onClick={() => setYearly(!yearly)}
          >
            <div className="knob" />
          </div>

          <span>Yearly</span>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid">
        <PricingCard
          plan="Starter"
          desc="Perfect to get started"
          price={yearly ? "$15/mo" : "$19/mo"}
          features={[
            "AI storyboard",
            "Stock media",
            "Basic voiceovers",
            "Watermarked exports",
            "100 credits",
          ]}
        />

        <PricingCard
          plan="Creator"
          desc="For serious creators"
          price={yearly ? "$29/mo" : "$39/mo"}
          highlighted
          features={[
            "No watermark",
            "Premium voiceovers",
            "Priority rendering",
            "500 credits",
          ]}
        />

        <PricingCard
          plan="Pro / Agency"
          desc="Scale your content business"
          price={yearly ? "$79/mo" : "$99/mo"}
          features={[
            "Unlimited brands",
            "Batch generation",
            "Priority AI queue",
            "2000 credits",
          ]}
        />
      </div>

      {/* TABLE */}
      <FeatureTable />

      {/* ADDONS */}
      <AddOns />
    </div>
  );
}

/* =============================
CSS
============================= */

.pricing {
  background: #ffffff;
  color: #111;
  padding: 60px 20px;
  font-family: system-ui;
}

.hero {
  text-align: center;
  margin-bottom: 60px;
}

.hero h1 {
  font-size: 42px;
}

.hero p {
  opacity: 0.7;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 60px;
}

.card {
  padding: 30px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 15px 40px rgba(0,0,0,0.05);
  position: relative;
  transition: 0.3s;
}

.card:hover {
  transform: translateY(-6px);
}

.card-highlight {
  border: 2px solid #6C47FF;
}

.badge {
  position: absolute;
  top: -12px;
  right: 12px;
  background: #6C47FF;
  color: white;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.price {
  font-size: 28px;
  margin: 15px 0;
}

.cta {
  background: #6C47FF;
  color: white;
  border: none;
  padding: 10px;
  width: 100%;
  border-radius: 8px;
  margin-top: 15px;
}

.toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.switch {
  width: 50px;
  height: 26px;
  background: #ddd;
  border-radius: 20px;
  position: relative;
  cursor: pointer;
}

.switch.active {
  background: #6C47FF;
}

.knob {
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: 0.3s;
}

.switch.active .knob {
  left: 26px;
}

.table-wrap {
  margin-bottom: 60px;
}

.table-wrap table {
  width: 100%;
  border-collapse: collapse;
}

.table-wrap th, .table-wrap td {
  padding: 12px;
  border-bottom: 1px solid #eee;
  text-align: center;
}

.addons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.addon {
  padding: 20px;
  border-radius: 12px;
  background: #f8f8ff;
  text-align: center;
}
