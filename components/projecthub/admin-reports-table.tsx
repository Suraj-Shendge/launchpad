"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, ChevronDown, ChevronUp, CheckCircle2, RotateCcw } from "lucide-react";
import { setReportStatus } from "@/app/admin/reports/actions";

type Report = {
  id:string; comment_id:string; reporter_id:string; reason:string; description:string|null; status:string; created_at:string; resolved_at:string|null;
  projectSlug:string|null; projectName:string|null; commentPreview:string|null; reporterName:string|null; commentAuthorName:string|null;
};

export function AdminReportsTable({reports}:{reports:Report[]}){
  const [openId,setOpenId]=useState<string|null>(null);
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reason</th><th>Report</th><th>Status</th><th>Created</th><th>Case</th></tr></thead><tbody>{reports.map(r=>{
    const open=openId===r.id, resolved=r.status==="resolved";
    return <tr key={r.id}>
      <td><strong>{r.reason||"Unspecified"}</strong><small>{r.description||"No additional description"}</small></td>
      <td><code>{r.comment_id.slice(0,8)}…</code><small>{r.reporterName?"Reported by "+r.reporterName:"Reporter "+r.reporter_id.slice(0,8)+"…"}</small></td>
      <td><span className={"admin-status "+(resolved?"success":"warning")}>{r.status}</span></td>
      <td>{new Date(r.created_at).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
      <td><button type="button" className="admin-text-button" onClick={()=>setOpenId(open?null:r.id)}>{open?<><ChevronUp size={12}/>Close</>:<><ChevronDown size={12}/>Open case</>}</button></td>
    </tr>;
  })}</tbody></table>{reports.map(r=>openId===r.id&&<div className="admin-report-case" key={"case-"+r.id}>
    <div><p className="eyebrow">Case details</p><h3>{r.reason||"Report"} <span className={"admin-status "+(r.status==="resolved"?"success":"warning")}>{r.status}</span></h3></div>
    <div className="admin-report-case-grid"><div><small>Reported comment</small><p>{r.commentPreview||"Comment unavailable."}</p>{r.projectSlug&&<Link href={"/projects/"+r.projectSlug+"#project-comments"} target="_blank">View project <ExternalLink size={12}/></Link>}</div>
      <div><small>Comment author</small><p>{r.commentAuthorName||"Unknown member"}</p><small>Reporter</small><p>{r.reporterName||r.reporter_id.slice(0,8)+"…"}</p>{r.description&&<><small>Additional context</small><p>{r.description}</p></>}</div></div>
    <form action={setReportStatus} className="admin-report-case-actions"><input type="hidden" name="report_id" value={r.id}/><input type="hidden" name="status" value={r.status==="resolved"?"pending":"resolved"}/><button className={r.status==="resolved"?"admin-text-button":"button-primary"} type="submit">{r.status==="resolved"?<><RotateCcw size={13}/>Reopen report</>:<><CheckCircle2 size={13}/>Resolve report</>}</button></form>
  </div>)}</div>;
}
