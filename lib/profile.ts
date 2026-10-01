export type ProfileRole="member"|"founder"|"entrepreneur"|"celebrity";

export type ProfileTier={
 role:ProfileRole;
 label:string;
 badgeLabel:string;
 badgeClass:string;
 isVerified:boolean;
};

export function getProfileTier(publishedProjectCount:number,verificationTier:string|null|undefined,githubConnected=false):ProfileTier{
 const adminRole=verificationTier&&verificationTier!=="none"?verificationTier:null;
 if(adminRole==="celebrity")return {role:"celebrity",label:"Dev / Tech Community",badgeLabel:"Verified Dev / Tech Community",badgeClass:"is-celebrity",isVerified:true};
 if(adminRole==="entrepreneur")return {role:"entrepreneur",label:"Entrepreneur",badgeLabel:"Verified Entrepreneur",badgeClass:"is-entrepreneur",isVerified:true};
 if(adminRole==="founder")return {role:"founder",label:"Founder",badgeLabel:"Verified Founder",badgeClass:"is-founder",isVerified:true};
 if(adminRole==="member")return {role:"member",label:"Member",badgeLabel:"Verified Member",badgeClass:"is-member",isVerified:true};
 if(publishedProjectCount>10)return {role:"entrepreneur",label:"Entrepreneur",badgeLabel:"Verified Entrepreneur",badgeClass:"is-entrepreneur",isVerified:githubConnected};
 if(publishedProjectCount>=1)return {role:"founder",label:"Founder",badgeLabel:"Verified Founder",badgeClass:"is-founder",isVerified:githubConnected};
 return {role:"member",label:"Member",badgeLabel:"Verified Member",badgeClass:"is-member",isVerified:githubConnected};
}
