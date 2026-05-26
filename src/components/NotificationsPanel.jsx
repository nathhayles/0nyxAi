import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function NotificationsPanel(){

const [notes,setNotes] = useState([])

useEffect(()=>{

async function load(){

const { data:userData } = await supabase.auth.getUser()

if(!userData?.user) return

const { data } = await supabase
.from("notifications")
.select("*")
.eq("user_id",userData.user.id)
.order("created_at",{ascending:false})

if(data){
setNotes(data)
}

}

load()

},[])

return(

<div style={{marginTop:40}}>

<h2>Notifications</h2>

{notes.length===0 && <p>No notifications</p>}

{notes.map(n=>(
<div key={n.id} style={{
marginTop:10,
padding:15,
background:"#0c1016",
borderRadius:10
}}>
<strong>{n.title}</strong>
<div>{n.message}</div>
</div>
))}

</div>

)

}
