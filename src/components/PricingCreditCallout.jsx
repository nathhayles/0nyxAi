import './PricingCreditCallout.css';

export default function PricingCreditCallout() {
  return (
    <section className="pcc" aria-label="How Onyx pricing works">
      <div className="pcc__eyebrow">Simple, honest pricing</div>
      <p className="pcc__title">
        No subscription. <span className="pcc__grad">Pay only for what you make.</span>
      </p>
      <p className="pcc__sub">
        Onyx is free to use. You only pay for AI generation and downloads, so you decide
        how much AI goes into every reel.
      </p>
      <div className="pcc__grid">
        <div className="pcc__item">
          <b>Start for next to nothing</b>
          <span>Build reels from stock images and stock voiceover at almost no cost, then add AI wherever you want more.</span>
        </div>
        <div className="pcc__item">
          <b>Bring yours or create it</b>
          <span>Upload and sequence your own video and voiceover, or generate video, voiceover, music and full music videos with AI.</span>
        </div>
        <div className="pcc__item">
          <b>Zero-risk generations</b>
          <span>Failed generations are refunded automatically, and you're only charged when a generation succeeds.</span>
        </div>
      </div>
    </section>
  );
}
