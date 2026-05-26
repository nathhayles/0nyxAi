import "../styles/navbar.css";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";

export default function Navbar(){

  const [session,setSession] = useState(null);

  useEffect(()=>{

    supabase.auth.getSession().then(({data})=>{
      setSession(data.session);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session)=>{
        setSession(session);
      });

    return ()=>listener.subscription.unsubscribe();

  },[]);

  async function logout(){
    await supabase.auth.signOut();
    window.location.href="/login";
  }

  return(

    <div className="nav">

      <div className="logo">ONYX</div>

      <div className="menu">

        <Link to="/dashboard">Projects</Link>
        <Link to="/video-to-reel">🎬 Video to Reel</Link>
        <Link to="/music">🎵 Music Studio</Link>
        <Link to="/pricing">Pricing</Link>
        {session && <Link to="/earn">Earn</Link>}
        <Link to="/terms">Terms</Link>
        {session && <Link to="/branding">Branding</Link>}
        <Link to="/account">Account</Link>

        {session ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <Link to="/login">Login</Link>
        )}

      </div>

    </div>

  )
}
