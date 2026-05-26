export default function Accounts() {
  return (
    <div className="page">
      <h1>Accounts</h1>

      <p className="hint">
        Account connections mount here next (Meta / TikTok / etc).
      </p>

      <div
        style={{
          background:"#161922",
          border:"1px solid #2a2f3a",
          borderRadius:"12px",
          padding:"14px",
          marginTop:"12px"
        }}
      >
        <div><b>Status:</b> Screen mounted.</div>

        <div style={{color:"#9aa0aa",marginTop:"6px"}}>
          Next wiring step: connect actual integrations.
        </div>
      </div>
    </div>
  );
}
