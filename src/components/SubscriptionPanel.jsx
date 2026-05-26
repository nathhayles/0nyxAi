import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function SubscriptionPanel(){

const [sub,setSub] = useState(null)

useEffect(()=>{

async function load(){

const { data:userData } = await supabase.auth.getUser()

if(!userData?.user) return

const { data } = await supabase
.from("subscriptions")
.select("*")
.eq("user_id",userData.user.id)
.single()

if(data){
setSub(data)
}

}

load()

},[])

if(!sub) return <div>Loading subscription...</div>

return(

<div style={{marginTop:40}}>

<h2>Subscription</h2>

<div>Plan: {sub.plan}</div>
<div>Status: {sub.status}</div>

</div>

)

}
