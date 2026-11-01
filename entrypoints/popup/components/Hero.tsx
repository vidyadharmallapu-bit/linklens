type HeroProps = {
  onBrowseClick?: () => void;
};

export function Hero({ onBrowseClick }: HeroProps) {
  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      <div className="hero-eyebrow">
        <span className="hero-pill">LINKLENS FOR CHROME</span>
      </div>
      <h1 id="hero-heading" className="hero-title">
        Your images, <br />
        <span className="hero-title-accent">one link away.</span>
      </h1>
      <p className="hero-description">
        Store, organize and share your images effortlessly.
      </p>
    </section>
  );
}
