import{c}from"./index-Da9ST9XS.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],$=c("chevron-down",l);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],D=c("circle-alert",y);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]],b=c("dollar-sign",h);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],g=c("lock",f),x=e=>Number(e).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),m=e=>{if(!e)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(e.trim()))return e.trim();if(/^\d{2}\/\d{2}\/\d{4}$/.test(e.trim())){const[o,r,s]=e.trim().split("/");return`${s}-${r}-${o}`}const t=e.toLowerCase().match(/(\d{1,2})\s*de\s*([a-záéíóú]+)\s*(?:de\s*)?(\d{4})/i);if(t){const o=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],r=t[1].padStart(2,"0"),s=t[2].normalize("NFD").replace(/[\u0300-\u036f]/g,""),a=o.indexOf(s);if(a!==-1){const i=String(a+1).padStart(2,"0");return`${t[3]}-${i}-${r}`}}const n=new Date(e);return isNaN(n.getTime())?null:n.toLocaleDateString("en-CA")},N=e=>{if(!e)return"-";const t=m(e);if(t){const[n,o,r]=t.split("-");return`${r}/${o}/${n}`}return e},k=e=>{const t=m(e);return t||new Date().toLocaleDateString("en-CA")},w=e=>{if(!e)return"";const t=m(e);if(t&&/^\d{4}-\d{2}-\d{2}$/.test(t)){const n=t.split("-"),o=new Date(n[0],parseInt(n[1])-1,n[2],12,0,0),r=["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"],s=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],a=r[o.getDay()],i=String(o.getDate()).padStart(2,"0"),d=s[o.getMonth()],u=o.getFullYear();return`${a}, ${i} de ${d} ${u}`}return e};export{$ as C,b as D,g as L,k as a,N as b,D as c,w as d,x as f};
