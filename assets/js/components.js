class SiteHeader extends HTMLElement {
  connectedCallback() {
    const active = (this.getAttribute('active') || '').trim().toLowerCase();

    this.innerHTML = `
      <div class="site-header-wrap">
        <div class="site-header-inner">
          <a class="brand-pill" href="index.html" aria-label="Go to Home">F1 RECAP</a>
          <button class="site-nav-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">MENU</button>
          <nav class="site-nav" aria-label="Primary navigation">
            <a href="index.html" data-nav="home">Home</a>
            <a href="f1-recap-dashboard.html" data-nav="recap">Recap Studio</a>
            <a href="data-guide.html" data-nav="data">Data Guide</a>
            <a href="about.html" data-nav="about">About</a>
          </nav>
        </div>
      </div>
    `;

    const nav = this.querySelector('.site-nav');
    const toggle = this.querySelector('.site-nav-toggle');
    const activeLink = this.querySelector(`[data-nav="${active}"]`);

    if (activeLink) {
      activeLink.classList.add('active');
    }

    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    const year = new Date().getFullYear();
    this.innerHTML = `
      <footer class="site-footer">
        <div class="site-footer-inner">
          <span>F1 Recap Studio</span>
          <span>Telemetry-first race storytelling</span>
          <span>© ${year}</span>
        </div>
      </footer>
    `;
  }
}

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
