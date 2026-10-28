export default function ServiceCredit(){
 const name=process.env.NEXT_PUBLIC_SERVICE_PROVIDER_NAME||"Penge";
 const url=process.env.NEXT_PUBLIC_SERVICE_PROVIDER_URL;
 return <span className="service-credit">En tjeneste levert av {url&&/^https:\/\//.test(url)?<a href={url} target="_blank" rel="noopener noreferrer">{name}</a>:<strong>{name}</strong>}</span>;
}
