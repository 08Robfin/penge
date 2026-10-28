import type { Metadata,Viewport } from "next";
import "./globals.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Penge – rom for det som betyr noe",description:"En roligere oversikt over økonomien din.",applicationName:"Penge",manifest:"/manifest.webmanifest?v=2",appleWebApp:{capable:true,title:"Penge",statusBarStyle:"default"},icons:{icon:[{url:"/app-icons/penge-favicon-48-v2.png",sizes:"48x48",type:"image/png"},{url:"/app-icons/penge-192-v2.png",sizes:"192x192",type:"image/png"}],apple:[{url:"/app-icons/penge-apple-180-v2.png",sizes:"180x180",type:"image/png"}]}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:[{media:"(prefers-color-scheme: light)",color:"#f5f6f8"},{media:"(prefers-color-scheme: dark)",color:"#111512"}]};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="nb" suppressHydrationWarning><body>{children}</body></html>;}
