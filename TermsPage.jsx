export default function TermsPage() {
  return (
    <div style={{
      background:"#0b0f19",
      minHeight:"100vh",
      color:"white",
      fontFamily:"-apple-system"
    }}>

      <nav style={{
        display:"flex",
        justifyContent:"space-between",
        padding:"24px 60px"
      }}>

        <div style={{fontWeight:700}}>ONYX</div>

        <div style={{display:"flex",gap:"30px"}}>
          <a href="/">Home</a>
          <a href="/pricing">Pricing</a>
          <a href="/login">Sign In</a>
        </div>

      </nav>

      <div style={{padding:"120px 60px",maxWidth:800}}>

        <h1>Terms & Conditions</h1>

        <p style={{opacity:.7,marginTop:20}}>
          Users may not generate illegal, explicit, impersonation,
          or harmful content using the Onyx platform.
        </p>

        <p style={{opacity:.7}}>
          All generated content is the responsibility of the user.
        </p>

      </div>

    </div>
  );
}
