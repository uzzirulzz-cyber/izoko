import React, {useEffect,useRef} from 'react'
import {mountPlaybeatLock} from './playbeat-lock.mjs'
interface AdminLoginPageProps {onSuccess:(admin:{email:string;name:string})=>void;onCancel:()=>void}
export const AdminLoginPage:React.FC<AdminLoginPageProps>=({onSuccess})=>{
 const host=useRef<HTMLDivElement>(null)
 const callback=useRef(onSuccess);callback.current=onSuccess
 useEffect(()=>mountPlaybeatLock(host.current,async(pin:string)=>{
  const base=(import.meta as any).env?.VITE_API_BASE||''
  const response=await fetch(`${base}/api/auth/admin/shared-pin`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})})
  const data=await response.json()
  if(!response.ok||!data?.token)throw Error(data?.error||'Unable to unlock workspace.')
  localStorage.setItem('playbeat_admin_token',data.token)
  localStorage.setItem('playbeat_admin_session',JSON.stringify({...data.admin,ts:Date.now()}))
  callback.current(data.admin)
 }),[])
 return <div ref={host} style={{minHeight:'100vh',background:'#03060b'}}/>
}
