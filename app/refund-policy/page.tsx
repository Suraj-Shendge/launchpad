import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";

export default function RefundPolicy(){
  return <div><Navbar/><main className="legal-page section">
    <p className="eyebrow">Legal</p>
    <h1 className="section-title">Refund policy.</h1>
    <div className="legal-copy">
      <p>This policy applies to paid ProjectHub promotions and homepage auction payments.</p>
      <h2>Featured promotions</h2>
      <p>Featured promotion payments are eligible for a refund when ProjectHub cannot activate the purchased placement because of a ProjectHub technical or operational failure.</p>
      <p>Once a featured placement has been successfully activated, payments are non-refundable for change of mind, lack of expected traffic, engagement, leads, conversions or ranking, or because a creator no longer wants the placement.</p>
      <h2>Homepage auction payments</h2>
      <p>A winning bidder receives a 15-minute payment window after the auction is settled. No payment is due merely for placing a bid.</p>
      <p>If the winning bidder does not complete payment within that window, the payment claim expires and the second-highest eligible bidder may receive a new 15-minute opportunity to pay their bid and claim the placement.</p>
      <p>An auction payment is eligible for a refund when ProjectHub successfully receives the payment but cannot provide the purchased homepage placement because of a ProjectHub technical or operational failure. A bidder who simply does not complete checkout has no refund claim because no completed payment has been made.</p>
      <h2>Duplicate or incorrect charges</h2>
      <p>If you believe you were charged more than once for the same placement, or were charged for a payment that was not successfully completed or was no longer eligible, contact ProjectHub support with the Razorpay order or payment ID so the transaction can be reviewed.</p>
      <h2>How refunds are processed</h2>
      <p>Approved refunds are initiated through the payment provider and are returned to the original payment method used for the transaction. The time for the funds to appear can depend on the payment method and financial institution.</p>
      <h2>Policy changes</h2>
      <p>ProjectHub may update this policy when its paid products, auction rules or payment arrangements change. The version published on this page applies to transactions made after the effective version is published.</p>
    </div>
  </main><Footer/></div>
}
