export function getReferralCode() {

const params = new URLSearchParams(window.location.search);

const ref = params.get("ref");

if(ref){
localStorage.setItem("onyx_referral",ref);
}

return ref;

}
