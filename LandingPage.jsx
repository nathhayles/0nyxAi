import { Link } from "react-router-dom";

export default function LandingPage() {
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
        padding:"24px 60px",
        borderBottom:"1px solid rgba(255,255,255,0.06)"
      }}>
        <div style={{fontWeight:700,fontSize:20}}>
          ONYX
        </div>

        <div style={{display:"flex",gap:30}}>
          <Link to="/pricing" style={{color:"white"}}>Pricing</Link>
          <Link to="/terms" style={{color:"white"}}>Terms</Link>
          <a href="/login" style={{color:"white"}}>Sign In</a>
        </div>
      </nav>

      <div style={{
        padding:"120px 60px",
        maxWidth:900
      }}>

        <h1 style={{
          fontSize:64,
          marginBottom:20
        }}>
          AI Video Creation
        </h1>

        <p style={{
          opacity:.7,
          fontSize:20,
          maxWidth:600
        }}>
          Generate scripts, visuals, voiceovers and publish-ready videos
          with a powerful AI assisted editor.
        </p>

        <Link
          to="/create"
          style={{
            display:"inline-block",
            marginTop:40,
            padding:"14px 28px",
            background:"#4f7cff",
            borderRadius:8,
            color:"white",
            textDecoration:"none",
            fontWeight:600
          }}
        >
          Create Reel
        </Link>

      </div>

    </div>
  );
}

