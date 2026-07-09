import { useState } from "react";

export default function LoginPage() {

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  function handleLogin(e){
    e.preventDefault();

    // temporary login logic
    localStorage.setItem("onyx_user","true");

    window.location.href="/create";
  }

  return (

    <div style={{
      minHeight:"100vh",
      background:"var(--onyx-bg)",
      color:"#fff",
      display:"flex",
      alignItems:"center",
      justifyContent:"center"
    }}>

      <form
        onSubmit={handleLogin}
        style={{
          width:380,
          background:"var(--onyx-bg-2)",
          padding:40,
          borderRadius:14,
          border:"1px solid rgba(255,255,255,0.08)"
        }}
      >

        <h2 style={{marginBottom:20}}>Sign In</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          style={{
            width:"100%",
            padding:12,
            marginBottom:12,
            borderRadius:8,
            border:"1px solid rgba(255,255,255,0.1)",
            background:"var(--onyx-bg)",
            color:"#fff"
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          style={{
            width:"100%",
            padding:12,
            marginBottom:20,
            borderRadius:8,
            border:"1px solid rgba(255,255,255,0.1)",
            background:"var(--onyx-bg)",
            color:"#fff"
          }}
        />

        <button
          type="submit"
          style={{
            width:"100%",
            padding:12,
            borderRadius:10,
            border:"none",
            background:"#00d2ff",
            fontWeight:700
          }}
        >
          Sign In
        </button>

      </form>

    </div>

  );

}
