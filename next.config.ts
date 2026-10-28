import type { NextConfig } from "next";
const config: NextConfig = {
 output:"standalone",
 poweredByHeader:false,
 serverExternalPackages:["@node-rs/argon2","pg"],
 async headers(){return [{source:"/:path*",headers:[
 {key:"X-Content-Type-Options",value:"nosniff"},
 {key:"Referrer-Policy",value:"no-referrer"},
 {key:"X-Frame-Options",value:"DENY"},
 {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
 ]},...["/","/api/:path*","/privacy","/email/:path*"].map(source=>({source,headers:[{key:"Cache-Control",value:"private, no-store"}]}))];}
}; export default config;
