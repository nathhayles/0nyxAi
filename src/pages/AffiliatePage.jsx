import { useEffect,useState } from "react";
import { supabase } from "../supabaseClient";

export default function AffiliatePage(){

  const [link,setLink] = useState("");

  useEffect(()=>{

    async function load(){

      const { data } = await supabase.auth.getUser();

      if(!data?.user) return;

      const code = data.user.id.slice(0,8);

      setLink("https://onyx-reelz.com/?ref="+code);

    }

    load();

  },[]);

  return(

    <div className="page">

      <h1>Affiliate Program</h1>

      <p>Share your referral link and earn credits when users subscribe.</p>

      <div className="pricing-card">

        <b>Your referral link</b>

        <div style={{marginTop:"8px"}}>{link}</div>

      </div>

    </div>

  )

}
