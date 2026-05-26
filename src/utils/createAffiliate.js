import { supabase } from "../supabaseClient"
import { generateReferralCode } from "./generateReferral"

export async function createAffiliate(userId){

const { data } = await supabase
.from("affiliate_links")
.select("*")
.eq("user_id",userId)
.single()

if(data) return data

const code = generateReferralCode(userId)

const { data:newLink } = await supabase
.from("affiliate_links")
.insert({
user_id:userId,
ref_code:code
})
.select()
.single()

return newLink

}
