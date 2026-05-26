import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function AdminStats(){

const [stats,setStats] = useState({
users:0,
subscriptions:0,
usage:0
})

useEffect(()=>{

async function load(){

const { count:users } = await supabase
.from("users")
.select("*",{ count:"exact", head:true })

const { count:subscriptions } = await supabase
.from("subscriptions")
.select("*",{ count:"exact", head:true })

const { count:usage } = await supabase
.from("usage")
.select("*",{ count:"exact", head:true })

setStats({
users:users || 0,
subscriptions:subscriptions || 0,
usage:usage || 0
})

}

load()

},[])

return(

<div style={{
display:"grid",
gridTemplateColumns:"repeat(3,1fr)",
gap:20,
marginBottom:40
}}>

<div style={{background:"#0c1016",padding:20,borderRadius:12}}>
<h3>Total Users</h3>
<p>{stats.users}</p>
</div>

<div style={{background:"#0c1016",padding:20,borderRadius:12}}>
<h3>Active Subscriptions</h3>
<p>{stats.subscriptions}</p>
</div>

<div style={{background:"#0c1016",padding:20,borderRadius:12}}>
<h3>Usage Records</h3>
<p>{stats.usage}</p>
</div>

</div>

)

}
