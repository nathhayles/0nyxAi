"use client";

import { useState } from "react";
import { buildScenesFromScript } from "../../lib/sceneEngine";

export default function CreatePage(){

  const [script,setScript] = useState("");
  const [theme,setTheme] = useState("cinematic");
  const [loading,setLoading] = useState(false);

  function handleGenerate(){

    if(!script.trim()) return;

    setLoading(true);

    try{

      const scenes = buildScenesFromScript(script,theme);

      localStorage.setItem(
        "onyx_create_payload",
        JSON.stringify({ scenes })
      );

      window.location.href="/editor";

    }catch{

      alert("Generation failed");

    }

  }

  return (
    <div style={{padding:40,maxWidth:900,margin:"auto"}}>

      <h1>Create Reel</h1>

      <textarea
        value={script}
        onChange={(e)=>setScript(e.target.value)}
        rows={10}
        style={{width:"100%",marginBottom:20}}
        placeholder="Paste script here..."
      />

      <div style={{marginBottom:20}}>
        <select value={theme} onChange={(e)=>setTheme(e.target.value)}>
          <option value="cinematic">Cinematic</option>
          <option value="luxury">Luxury</option>
          <option value="dark">Dark</option>
          <option value="motivational">Motivational</option>
          <option value="documentary">Documentary</option>
          <option value="business">Business</option>
          <option value="viral">Viral</option>
          <option value="minimal">Minimal</option>
          <option value="travel">Travel</option>
          <option value="realestate">Real Estate</option>
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{padding:"10px 20px"}}
      >
        {loading ? "Generating..." : "Generate"}
      </button>

    </div>
  );
}
