export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--onyx-bg)",
      color: "white"
    }}>
      <div style={{
        background: "var(--onyx-bg-2)",
        padding: 40,
        borderRadius: 12,
        width: 360
      }}>
        <h2 style={{marginBottom:20}}>Sign In</h2>

        <input
          placeholder="Email"
          style={{
            width:"100%",
            padding:10,
            marginBottom:10,
            background:"var(--onyx-bg)",
            border:"1px solid #222",
            color:"white"
          }}
        />

        <input
          placeholder="Password"
          type="password"
          style={{
            width:"100%",
            padding:10,
            marginBottom:20,
            background:"var(--onyx-bg)",
            border:"1px solid #222",
            color:"white"
          }}
        />

        <button
          style={{
            width:"100%",
            padding:12,
            background:"#4f7cff",
            border:"none",
            color:"white",
            borderRadius:6
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
}
