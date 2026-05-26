import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function Admin(){

const [users,setUsers] = useState([])
const [stats,setStats] = useState({
users:0,
subscriptions:0,
usage:0
})

useEffect(()=>{

async function load(){

const { data:usersData } = await supabase
.from("users")
.select("*")

setUsers(usersData || [])

const { count:userCount } = await supabase
.from("users")
.select("*",{count:"exact",head:true})

const { count:subCount } = await supabase
.from("subscriptions")
.select("*",{count:"exact",head:true})

const { count:usageCount } = await supabase
.from("usage")
.select("*",{count:"exact",head:true})

setStats({
users:userCount || 0,
subscriptions:subCount || 0,
usage:usageCount || 0
})

}

load()

},[])

async function grantCredits(userId){
const amount = prompt("Credits to grant:")
if(!amount) return
await supabase.from("subscriptions").update({credits:amount}).eq("user_id",userId)
alert("Credits updated")
}

async function promoteUser(userId){
await supabase.from("users").update({role:"admin"}).eq("id",userId)
alert("User promoted")
}

async function disableUser(userId){
await supabase.from("users").update({disabled:true}).eq("id",userId)
alert("User disabled")
}

return(

<div style={{background:"#06070a",color:"#fff",padding:40,minHeight:"100vh"}}>

<h1>Admin Panel</h1>

<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,marginBottom:40}}>

<div style={{background:"#0c1016",padding:20,borderRadius:10}}>
<h3>Total Users</h3>
<p>{stats.users}</p>
</div>

<div style={{background:"#0c1016",padding:20,borderRadius:10}}>
<h3>Active Subscriptions</h3>
<p>{stats.subscriptions}</p>
</div>

<div style={{background:"#0c1016",padding:20,borderRadius:10}}>
<h3>Usage Records</h3>
<p>{stats.usage}</p>
</div>

</div>

<h2>Users</h2>

<table style={{width:"100%",marginTop:20}}>
<thead>
<tr>
<th>Username</th>
<th>User ID</th>
<th>Role</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{users.map(u => (
<tr key={u.id}>
<td>{u.username}</td>
<td>{u.id}</td>
<td>{u.role}</td>
<td>
{u.role !== "superadmin" && (
<>
<button onClick={() => grantCredits(u.id)}>Credits</button>
<button onClick={() => promoteUser(u.id)}>Role</button>
<button onClick={() => disableUser(u.id)}>Disable</button>
</>
)}
</td>
</tr>
))}

</tbody>
</table>

</div>

)

}
