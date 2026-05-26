import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function SupportPanel(){

const [tickets,setTickets] = useState([])

useEffect(()=>{

async function load(){

const { data:userData } = await supabase.auth.getUser()

if(!userData?.user) return

const { data } = await supabase
.from("support_tickets")
.select("*")
.eq("user_id",userData.user.id)
.order("created_at",{ascending:false})

if(data){
setTickets(data)
}

}

load()

},[])

return(

<div style={{marginTop:40}}>

<h2>Support Tickets</h2>

{tickets.length === 0 && <p>No tickets yet</p>}

{tickets.map(t=>(
<div key={t.id} style={{
padding:15,
marginTop:10,
background:"#0c1016",
borderRadius:10
}}>
<strong>{t.subject}</strong>
<div>Status: {t.status}</div>
</div>
))}

</div>

)

}
