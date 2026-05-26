import React, { useState, useEffect } from "react";

const EMOJI_CATEGORIES = {
  "Smileys": ["😀","😂","😍","🥳","😎","🤔","😢","😡","🤩","🥰","😏","🤭","😴","🤯","🥺","😤","🫡","🤑","😇","🥸"],
  "Nature": ["🌟","⭐","🔥","💧","🌈","☀️","🌙","❄️","🌊","🍀","🌸","🌺","🍁","🌴","🦋","🐶","🐱","🦁","🐯","🦊"],
  "Food": ["🍕","🍔","🍟","🌮","🍣","🍜","🍩","🍦","🎂","☕","🧃","🍺","🥂","🍷","🧁","🍫","🍿","🥑","🍓","🍉"],
  "Objects": ["💎","🏆","🎯","🎮","📱","💻","🎵","🎬","📷","🚀","✈️","🏠","💡","🔑","⚡","💰","🎁","🛒","📚","🔮"],
  "Symbols": ["❤️","💙","💚","💛","🧡","💜","🖤","🤍","💯","✅","❌","⭐","🔴","🟡","🟢","🔵","🟣","⚫","⚪","🔶"],
  "Gestures": ["👍","👎","👏","🙌","🤝","✌️","🤞","👊","🤜","💪","🙏","👋","🤙","☝️","👆","👇","👈","👉","🫶","❤️‍🔥"],
};

const SHAPES = [
  { id:"rect",     label:"Rectangle", svg:'<rect x="5" y="5" width="90" height="60" rx="RADIUS" fill="FILL" opacity="OPACITY" stroke="STROKE" stroke-width="STROKEWIDTH"/>',                                                                                          vw:100, vh:70  },
  { id:"circle",   label:"Circle",    svg:'<circle cx="50" cy="50" r="50" fill="FILL" opacity="OPACITY" stroke="STROKE" stroke-width="STROKEWIDTH"/>',                                                                                               vw:100, vh:100 },
  { id:"triangle", label:"Triangle",  svg:'<polygon points="60,0 120,100 0,100" fill="FILL" opacity="OPACITY" stroke="STROKE" stroke-width="STROKEWIDTH"/>',                                                                                         vw:120, vh:100 },
  { id:"star",     label:"Star",      svg:'<polygon points="60,5 75,45 115,45 83,68 95,108 60,83 25,108 37,68 5,45 45,45" fill="FILL" opacity="OPACITY" stroke="STROKE" stroke-width="STROKEWIDTH"/>',                                               vw:120, vh:113 },
  { id:"diamond",  label:"Diamond",   svg:'<polygon points="60,0 120,60 60,120 0,60" fill="FILL" opacity="OPACITY" stroke="STROKE" stroke-width="STROKEWIDTH"/>',                                                                                    vw:120, vh:120 },
  { id:"heart",    label:"Heart",     svg:'<path d="M60,100 C60,100 10,65 10,35 C10,15 25,5 40,5 C50,5 58,10 60,15 C62,10 70,5 80,5 C95,5 110,15 110,35 C110,65 60,100 60,100Z" fill="FILL" opacity="OPACITY" stroke="STROKE" stroke-width="STROKEWIDTH"/>',  vw:120, vh:105 },
  { id:"arrow",    label:"Arrow",     svg:'<polygon points="0,30 70,30 70,10 110,50 70,90 70,70 0,70" fill="FILL" opacity="OPACITY" stroke="STROKE" stroke-width="STROKEWIDTH"/>',                                                                    vw:110, vh:100 },
  { id:"line",     label:"Line",      svg:'<rect width="120" height="6" rx="3" y="27" fill="FILL" opacity="OPACITY" stroke="STROKE" stroke-width="STROKEWIDTH"/>',                                                                                   vw:120, vh:60  },
];

const GIF_TERMS = ["celebration","fire","cool","wow","funny","viral","wave","explosion","confetti","party"];
const POSITIONS = ["top-left","top-center","top-right","middle-left","middle-center","middle-right","bottom-left","bottom-center","bottom-right"];

const inp = { width:"100%", background:"#0f141b", border:"1px solid #2b3442", color:"#e2e8f0", borderRadius:6, padding:"7px 10px", fontSize:12, boxSizing:"border-box", outline:"none" };
const btn = { padding:"6px 10px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", border:"1px solid #2b3442", background:"#1f2937", color:"#94a3b8" };

function makeEl(type, data) {
  return { id: Date.now() + Math.random(), type, position:"middle-center", size:80, opacity:100, ...data };
}

export default function ElementsPanel({ scenes, setScenes, activeScene }) {
  const [tab, setTab]               = useState("emoji");
  const [emojiCat, setEmojiCat]     = useState("Smileys");
  const [gifSearch, setGifSearch]   = useState("");
  const [gifs, setGifs]             = useState([]);
  const [gifsLoading, setGifsLoading] = useState(false);
  const [shapeColor, setShapeColor] = useState("#7c3aed");
  const [shapeOpacity, setShapeOpacity] = useState(80);
  const [shapeBorderColor, setShapeBorderColor] = useState("#ffffff");
  const [shapeBorderWidth, setShapeBorderWidth] = useState(0);
  const [shapeRadius, setShapeRadius] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  const resolvedScene = (activeScene !== null && activeScene !== undefined) ? activeScene : (scenes?.[0]?.id ?? 0);
  const scene    = scenes?.find(s => s.id === resolvedScene);
  const elements = scene?.elements || [];
  const selectedEl = elements.find(e => e.id === selectedId);

  function updateScene(fn) {
    setScenes(prev => prev.map(s => s.id === resolvedScene ? { ...s, ...fn(s) } : s));
  }
  function addEl(el)          { updateScene(s => ({ elements: [...(s.elements||[]), el] })); }
  function updateEl(id, ch)   { updateScene(s => ({ elements: (s.elements||[]).map(e => e.id===id ? {...e,...ch} : e) })); }
  function removeEl(id)       { updateScene(s => ({ elements: (s.elements||[]).filter(e => e.id!==id) })); if(selectedId===id) setSelectedId(null); }

  function svgUrl(shape) {
    const svg = shape.svg
      .replace(/FILL/g, shapeColor)
      .replace(/OPACITY/g, (shapeOpacity/100).toFixed(2))
      .replace(/STROKE/g, shapeBorderColor)
      .replace(/STROKEWIDTH/g, shapeBorderWidth)
      .replace(/RADIUS/g, shape.id === "rect" ? shapeRadius : 0);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${shape.vw} ${shape.vh}">${svg}</svg>`)}`;
  }

  async function searchGifs(q) {
    if (!q) return;
    setGifsLoading(true);
    try {
      const r = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh&q=${encodeURIComponent(q)}&limit=20&rating=g`);
      const d = await r.json();
      setGifs(d.data || []);
    } catch { setGifs([]); }
    setGifsLoading(false);
  }

  useEffect(() => { searchGifs("celebration"); }, []);

  if (!scene) return <div style={{padding:16,color:"#475569",fontSize:12,textAlign:"center"}}>No scene selected.</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* Tab bar */}
      <div style={{display:"flex",borderBottom:"1px solid #1f2937",flexShrink:0}}>
        {[["emoji","😀 Emoji"],["shapes","⬛ Shapes"],["gif","GIF"]].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"9px 4px",fontSize:11,fontWeight:700,cursor:"pointer",border:"none",
            background:tab===k?"#1e1b4b":"transparent", color:tab===k?"#a78bfa":"#475569",
            borderBottom:tab===k?"2px solid #7c3aed":"2px solid transparent"}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Emoji tab ── */}
      {tab==="emoji" && (
        <div style={{flex:1,overflowY:"auto",padding:"10px 8px"}}>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
            {Object.keys(EMOJI_CATEGORIES).map(cat => (
              <button key={cat} onClick={()=>setEmojiCat(cat)} style={{...btn,fontSize:10,padding:"3px 8px",
                background:emojiCat===cat?"rgba(124,58,237,0.2)":"#1f2937",
                color:emojiCat===cat?"#a78bfa":"#64748b",
                borderColor:emojiCat===cat?"#7c3aed":"#2b3442"}}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
            {EMOJI_CATEGORIES[emojiCat].map(em => (
              <button key={em} onClick={()=>addEl(makeEl("emoji",{content:em,size:48}))}
                style={{fontSize:22,padding:"6px",borderRadius:6,cursor:"pointer",border:"1px solid #1f2937",background:"#111827"}}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Shapes tab ── */}
      {tab==="shapes" && (
        <div style={{flex:1,overflowY:"auto",padding:"10px 8px"}}>
          <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>Color</div>
              <input type="color" value={shapeColor} onChange={e=>setShapeColor(e.target.value)}
                style={{width:36,height:30,border:"none",borderRadius:4,cursor:"pointer"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>Opacity {shapeOpacity}%</div>
              <input type="range" min={10} max={100} value={shapeOpacity} onChange={e=>setShapeOpacity(Number(e.target.value))} style={{width:"100%"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>Border Color</div>
              <input type="color" value={shapeBorderColor} onChange={e=>setShapeBorderColor(e.target.value)}
                style={{width:36,height:30,border:"none",borderRadius:4,cursor:"pointer"}}/>
            </div>
            <div style={{flex:2}}>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>Border {shapeBorderWidth}px</div>
              <input type="range" min={0} max={20} value={shapeBorderWidth} onChange={e=>setShapeBorderWidth(Number(e.target.value))} style={{width:"100%"}}/>
            </div>
            <div style={{flex:2}}>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>Radius {shapeRadius}px</div>
              <input type="range" min={0} max={50} value={shapeRadius} onChange={e=>setShapeRadius(Number(e.target.value))} style={{width:"100%"}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
            {SHAPES.map(shape => (
              <div key={shape.id} onClick={()=>addEl(makeEl("shape",{content:svgUrl(shape),shapeId:shape.id,color:shapeColor,borderColor:shapeBorderColor,borderWidth:shapeBorderWidth,radius:shapeRadius,size:80}))}
                style={{padding:"10px 8px",borderRadius:8,cursor:"pointer",background:"#111827",border:"1px solid #1f2937",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <img src={svgUrl(shape)} style={{width:50,height:38,objectFit:"contain"}} alt={shape.label}/>
                <div style={{fontSize:10,color:"#64748b"}}>{shape.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GIF tab ── */}
      {tab==="gif" && (
        <div style={{flex:1,overflowY:"auto",padding:"10px 8px"}}>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <input value={gifSearch} onChange={e=>setGifSearch(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&searchGifs(gifSearch)}
              placeholder="Search GIFs..." style={{...inp,flex:1}}/>
            <button onClick={()=>searchGifs(gifSearch)} style={{...btn,padding:"7px 12px"}}>🔍</button>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
            {GIF_TERMS.map(t=>(
              <button key={t} onClick={()=>{setGifSearch(t);searchGifs(t);}} style={{...btn,fontSize:10,padding:"3px 8px"}}>{t}</button>
            ))}
          </div>
          {gifsLoading
            ? <div style={{color:"#94a3b8",fontSize:12,textAlign:"center",padding:20}}>Loading...</div>
            : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {gifs.map(g=>(
                  <div key={g.id} onClick={()=>addEl(makeEl("gif",{content:g.images.fixed_height.url,size:100}))}
                    style={{borderRadius:6,overflow:"hidden",cursor:"pointer",border:"1px solid #1f2937"}}>
                    <img src={g.images.fixed_height_small.url} style={{width:"100%",display:"block"}} alt={g.title}/>
                  </div>
                ))}
                {!gifs.length&&<div style={{color:"#94a3b8",fontSize:12,gridColumn:"1/-1",textAlign:"center",padding:20}}>No GIFs found</div>}
              </div>
          }
        </div>
      )}

      {/* ── Elements on scene ── */}
      {elements.length>0 && (
        <div style={{borderTop:"1px solid #1f2937",padding:"10px 8px",flexShrink:0,maxHeight:220,overflowY:"auto"}}>
          <div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,fontWeight:700}}>
            On Scene ({elements.length})
          </div>
          {elements.map((el,idx)=>(
            <div key={el.id} onClick={()=>setSelectedId(el.id===selectedId?null:el.id)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,marginBottom:3,cursor:"pointer",
                background:selectedId===el.id?"rgba(124,58,237,0.15)":"#111827",
                border:selectedId===el.id?"1px solid rgba(124,58,237,0.4)":"1px solid #1f2937"}}>
              <span style={{fontSize:14,flexShrink:0}}>{el.type==="emoji"?el.content:el.type==="shape"?"⬛":"GIF"}</span>
              <span style={{flex:1,fontSize:11,color:"#64748b"}}>{el.type} {idx+1}</span>
              <button onClick={e=>{e.stopPropagation();removeEl(el.id);}}
                style={{...btn,padding:"2px 6px",fontSize:10,color:"#f87171",borderColor:"rgba(239,68,68,0.3)"}}>✕</button>
            </div>
          ))}
          {selectedEl && (
            <div style={{marginTop:8,padding:"8px",background:"#0c1016",borderRadius:8,border:"1px solid #1f2937"}}>
              <div style={{fontSize:10,color:"#475569",marginBottom:8,fontWeight:700,textTransform:"uppercase"}}>Edit</div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Size: {selectedEl.size}px</div>
                <input type="range" min={20} max={300} value={selectedEl.size}
                  onChange={e=>updateEl(selectedEl.id,{size:Number(e.target.value)})} style={{width:"100%"}}/>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Opacity: {selectedEl.opacity}%</div>
                <input type="range" min={10} max={100} value={selectedEl.opacity}
                  onChange={e=>updateEl(selectedEl.id,{opacity:Number(e.target.value)})} style={{width:"100%"}}/>
              </div>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>Position</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
                {POSITIONS.map(p=>(
                  <button key={p} onClick={()=>updateEl(selectedEl.id,{position:p})}
                    style={{...btn,fontSize:8,padding:"4px 2px",textAlign:"center",
                      background:selectedEl.position===p?"rgba(124,58,237,0.2)":"#1f2937",
                      color:selectedEl.position===p?"#a78bfa":"#475569",
                      borderColor:selectedEl.position===p?"#7c3aed":"#2b3442"}}>
                    {p.replace("-"," ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
