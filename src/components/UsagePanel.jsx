import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function UsagePanel(){

const [usage,setUsage] = useState(null)

useEffect(()=>{

async function load(){

const { data:userData } = await supabase.auth.getUser()

if(!userData?.user) return

const { data } = await supabase
.from("usage")
.select("*")
.eq("user_id",userData.user.id)
.single()

if(data){
setUsage(data)
}

}

load()

},[])

if(!usage) return <div>Loading usage...</div>

return(

<div style={{marginTop:40}}>

<h2>Usage</h2>

<div>Renders Used: {usage.renders_count}</div>
<div>Storage Used: {usage.storage_used} bytes</div>

</div>

)

}
