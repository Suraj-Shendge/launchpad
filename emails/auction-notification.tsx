import { Body, Button, Container, Heading, Html, Preview, Text } from "@react-email/components";

export function AuctionNotificationEmail({title,message,actionUrl}:{title:string;message:string;actionUrl:string}){
  return <Html lang="en"><Preview>{title} — ProjectHub</Preview>
    <Body style={{fontFamily:"Arial,Helvetica,sans-serif",background:"#f5f4f0",padding:"40px 12px",margin:0,color:"#171715"}}>
      <Container style={{maxWidth:"560px",margin:"0 auto",background:"#fffefb",border:"1px solid #deddd7",borderRadius:"24px",padding:"34px"}}>
        <Text style={{fontSize:20,fontWeight:800,letterSpacing:"-0.05em",margin:"0 0 6px"}}>Project<span style={{fontWeight:400}}>Hub</span></Text>
        <Text style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:"#8a877f",margin:"0 0 24px"}}>Auction alert</Text>
        <Heading style={{fontSize:30,letterSpacing:"-0.045em",lineHeight:1.05,margin:"0 0 12px"}}>{title}</Heading>
        <Text style={{fontSize:13,lineHeight:1.65,color:"#73716a",margin:"0 0 22px"}}>{message}</Text>
        <Button href={actionUrl} style={{background:"#171715",color:"#fff",borderRadius:999,padding:"13px 18px",fontSize:12,fontWeight:700}}>View auction</Button>
        <Text style={{fontSize:10,lineHeight:1.6,color:"#99968e",margin:"24px 0 0"}}>You are receiving this because you have activity on a ProjectHub auction.</Text>
      </Container>
    </Body>
  </Html>;
}

