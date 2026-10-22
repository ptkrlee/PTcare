export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 const configured=!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT&&process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.PUSH_WEBHOOK_SECRET);
 return res.status(200).json({configured,publicKey:configured?process.env.VAPID_PUBLIC_KEY:null});
}
