#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

// ── Load data ────────────────────────────────────────────────────────────────
const raw = JSON.parse(fs.readFileSync('radovangrezo_content.json', 'utf8'));

const byUrl = {};
for (const p of raw) byUrl[p.url] = p;

const home    = byUrl['https://radovangrezo.com/'];
const contact = byUrl['https://radovangrezo.com/?portfolio=contact-me'];
const resume  = byUrl['https://radovangrezo.com/?portfolio=resume'];
const archive = byUrl['https://radovangrezo.com/?portfolio=older-work'];

// ── Portfolio definitions (slug → output file, grid thumbnail index) ─────────
const PORTFOLIOS = [
  { slug: 'dedoles-sk-hamster-time',                                                            file: 'dedoles.html',               thumbIdx: 2  },
  { slug: 'raiffeisen-bank-you-work-hard-for-your-money-we-work-hard-for-you',                 file: 'raiffeisen.html',            thumbIdx: 3  },
  { slug: 'mana-food-evolution',                                                                file: 'mana.html',                  thumbIdx: 4  },
  { slug: 'skoda-lets-reconnect',                                                               file: 'skoda.html',                 thumbIdx: 5  },
  { slug: 'tchibo-like-men-liked-shopping',                                                     file: 'tchibo.html',               thumbIdx: 6  },
  { slug: 't-mobile-cz-laughter',                                                               file: 'tmobile.html',               thumbIdx: 7  },
  { slug: 'league-against-cancer-shadow',                                                       file: 'league-against-cancer.html', thumbIdx: 8  },
  { slug: 'apple',                                                                              file: 'apple.html',                 thumbIdx: 9  },
  { slug: 'help-a-child-with-unicef',                                                           file: 'unicef.html',                thumbIdx: 10 },
  { slug: 'zuno-longterm-creative-concept',                                                     file: 'zuno.html',                  thumbIdx: 11 },
  { slug: 'orion-chocolate-masterpiece',                                                        file: 'orion.html',                 thumbIdx: 12 },
  { slug: 'telekom-deaf-facebook',                                                              file: 'telekom.html',               thumbIdx: 13 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanTitle(title) {
  return title.replace(/ - The Things I Have Done.*$/, '').trim();
}

function cleanText(text) {
  let t = text;
  t = t.replace(/^[\s\S]*?Skip to content\s*/, '');
  t = t.replace(/\s*Post navigation[\s\S]*$/, '');
  t = t.replace(/\s*Toggle Sidebar[\s\S]*$/, '');
  t = t.replace(/\s*Archive View other projects[\s\S]*$/, '');
  t = t.replace(/\s*More Projects[\s\S]*$/, '');
  t = t.replace(/\s*Proudly powered by WordPress[\s\S]*$/, '');
  t = t.replace(/\s*Loading Comments\.\.\.[\s\S]*$/, '');
  return t.trim();
}

function toParagraphs(text) {
  return text
    .split(/\s{2,}|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => `<p>${esc(s)}</p>`)
    .join('\n        ');
}

// Extract categories for a portfolio slug from the home page links array.
// Structure: thumbnail(empty) → [category links] → title link
function extractCategories(links, slug) {
  const url = `https://radovangrezo.com/?portfolio=${slug}`;
  const emptyIdx = links.findIndex(l => l.href === url && l.text === '');
  if (emptyIdx === -1) return [];
  const cats = [];
  for (let i = emptyIdx + 1; i < links.length; i++) {
    if (links[i].href.includes('jetpack-portfolio-type')) {
      cats.push(links[i].text);
    } else {
      break;
    }
  }
  return cats;
}

function videoEmbed(url) {
  let src = url.trim();
  // Normalise YouTube watch → embed
  src = src.replace(
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w\-]+)[^\s]*/,
    'https://www.youtube.com/embed/$1'
  );
  src = src.replace(
    /https?:\/\/youtu\.be\/([\w\-]+)[^\s]*/,
    'https://www.youtube.com/embed/$1'
  );
  // Ensure protocol
  if (src.startsWith('//')) src = 'https:' + src;
  return `<div class="video-wrap"><iframe src="${esc(src)}" frameborder="0" allowfullscreen loading="lazy" title="Embedded video"></iframe></div>`;
}

// ── HTML shell fragments ──────────────────────────────────────────────────────
function nav(active) {
  const items = [
    { label: 'Work',    href: 'index.html',   key: 'work'    },
    { label: 'Resume',  href: 'resume.html',  key: 'resume'  },
    { label: 'Contact', href: 'contact.html', key: 'contact' },
    { label: 'Archive', href: 'archive.html', key: 'archive' },
  ];
  const links = items
    .map(i => `<a href="${i.href}"${i.key === active ? ' class="active"' : ''}>${i.label}</a>`)
    .join('\n        ');
  return `  <header class="site-header">
    <nav class="site-nav">
      <a href="index.html" class="site-logo">Radovan Grezo</a>
      <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <div class="nav-links">
        ${links}
      </div>
    </nav>
  </header>`;
}

const FOOTER = `  <footer class="site-footer">
    <div class="footer-inner">
      <p class="footer-name">Radovan Grezo</p>
      <p class="footer-bio">Creative Director &amp; Copywriter. Based in Prague. Owner of Somebody&amp;Somebody agency</p>
      <p class="footer-contact"><a href="contact.html">Get in touch</a></p>
    </div>
  </footer>`;

const NAV_SCRIPT = `  <script>
    const toggle = document.querySelector('.nav-toggle');
    const links  = document.querySelector('.nav-links');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      links.classList.toggle('open', !open);
    });
  </script>`;

function page(title, active, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${nav(active)}
${body}
${FOOTER}
${NAV_SCRIPT}
</body>
</html>`;
}

// ── Ensure output directory ───────────────────────────────────────────────────
const SITE = 'site';
if (!fs.existsSync(SITE)) fs.mkdirSync(SITE);

// ── 1. index.html ─────────────────────────────────────────────────────────────
{
  const cards = PORTFOLIOS.map(p => {
    const pd = byUrl[`https://radovangrezo.com/?portfolio=${p.slug}`];
    if (!pd) return '';
    const title = cleanTitle(pd.title);
    const thumb = home.images[p.thumbIdx] || '';
    const cats  = extractCategories(home.links, p.slug);
    const catHtml   = cats.length ? `<p class="card-cats">${cats.map(esc).join(' &middot; ')}</p>` : '';
    const thumbHtml = thumb
      ? `<div class="card-thumb"><img src="${esc(thumb)}" alt="${esc(title)}" loading="lazy"></div>`
      : `<div class="card-thumb card-thumb--empty"></div>`;
    return `    <a href="${esc(p.file)}" class="card">
      ${thumbHtml}
      <div class="card-body">
        ${catHtml}
        <h3 class="card-title">${esc(title)}</h3>
      </div>
    </a>`;
  }).join('\n');

  const body = `  <main>
    <section class="hero">
      <div class="hero-inner">
        <h1 class="hero-title">I'm Rad And You Can Be Too</h1>
        <p class="hero-sub">Licensed accountant turned advertising Creative Director and Copywriter. True story.</p>
        <p class="hero-agencies">Saatchi&amp;Saatchi &middot; Publicis &middot; Jung von Matt/Spree &middot; AKQA &middot; Cutwater SF &middot; Ogilvy &middot; Fallon &middot; GREY &middot; BBDO &middot; BBH &middot; Apple</p>
        <p class="hero-location">Based in Prague. Owner of Somebody&amp;Somebody agency</p>
      </div>
    </section>
    <section class="portfolio-grid-section">
      <div class="section-inner">
        <div class="portfolio-grid">
${cards}
        </div>
      </div>
    </section>
  </main>`;

  fs.writeFileSync(
    path.join(SITE, 'index.html'),
    page('Radovan Grezo – Creative Director Portfolio', 'work', body)
  );
  console.log('✓ index.html');
}

// ── 2. resume.html ────────────────────────────────────────────────────────────
{
  const body = `  <main>
    <div class="page-inner">

      <div class="resume-hero">
        <div class="resume-hero-text">
          <p class="page-label">Radovan's Famous</p>
          <h1>Resume</h1>
          <p class="resume-tagline">A certified accountant turned integrated Creative Director and Copywriter. True story.</p>
        </div>
        <div class="resume-portrait">
          <img src="${esc(resume.images[0])}" alt="Radovan Grezo" class="portrait">
        </div>
      </div>

      <hr class="accent-rule">

      <section class="resume-section">
        <h2 class="resume-section-title">About</h2>
        <ul class="resume-bullets">
          <li>Great at building client relationships and nurturing junior talent</li>
          <li>Only happy when producing a lot of work — the bigger the impact on a brand, the happier</li>
          <li>Bad at creating ghost ads to win Lions</li>
          <li>English &amp; German to Slovakian translator</li>
        </ul>
      </section>

      <section class="resume-section">
        <h2 class="resume-section-title">Experience</h2>

        <div class="resume-entry">
          <div class="resume-entry-meta">
            <span class="resume-years">2020 – today</span>
            <span class="resume-company">Somebody&amp;Somebody, CZ</span>
          </div>
          <div class="resume-entry-body">
            <p class="resume-role">Owner, Creative Director</p>
            <p>We made the Dedoles hamsters and due to popular client demand, we had to start our own agency. So we did.</p>
          </div>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-meta">
            <span class="resume-years">2013 – 2022</span>
            <span class="resume-company">Apple, UK</span>
          </div>
          <div class="resume-entry-body">
            <p class="resume-role">Freelance Creative Director</p>
            <p>Not able to talk about the role, responsibilities and more due to very neatly worded NDAs.</p>
          </div>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-meta">
            <span class="resume-years">2014 – today</span>
            <span class="resume-company">Freelance</span>
          </div>
          <div class="resume-entry-body">
            <p class="resume-role">Creative Director, Copywriter</p>
            <p>Edelman.ergo Berlin, Fallon, BBH London, Cutwater SF, Jung von Matt/Spree, VCCP, TAG:, OLIVER.agency, AKQA, MotherTongue</p>
            <p>The big TV shoots. The little Instagram posts. And anything in between.</p>
            <p class="resume-brands-label">Brands:</p>
            <ul class="resume-bullets">
              <li>Dove, Google, Nike, ŠKODA AUTO, Magnum, Olympus, Hyundai</li>
              <li>Rexona, Avon, AXE/Lynx, Signal, Emirates Airlines, Austrian Airlines</li>
              <li>Honda, Electrolux, Intel, M&amp;Ms and many more</li>
            </ul>
          </div>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-meta">
            <span class="resume-years">2013</span>
            <span class="resume-company">SinnerSchrader, CZ/DE</span>
          </div>
          <div class="resume-entry-body">
            <p class="resume-role">Creative Director, Digital</p>
            <p>Global digital AOR for ŠKODA AUTO. Responsible for smooth sailing of all global digital campaigns for the VW group brand. Liaised with traditional, media, and CRM agencies across ŠKODA's global roster to make every campaign feel like one voice — not four agencies.</p>
          </div>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-meta">
            <span class="resume-years">2010 – 2012</span>
            <span class="resume-company">Saatchi&amp;Saatchi Slovakia</span>
          </div>
          <div class="resume-entry-body">
            <p class="resume-role">Creative Director, Digital</p>
            <p>Promoted to Creative Director only 6 months after joining as Senior Copywriter. Led a team of 10 across digital and traditional campaigns for clients spanning financial to FMCG. Won the EURO Effie for the international launch of ZUNO bank's brand.</p>
          </div>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-meta">
            <span class="resume-years">2008 – 2010</span>
            <span class="resume-company">Publicis/Saatchi&amp;Saatchi Austria</span>
          </div>
          <div class="resume-entry-body">
            <p class="resume-role">Senior English Copywriter</p>
            <p>T-Mobile's international creative team during the era of the famous <em>Life is for sharing</em> platform — which pioneered real-life event stunts and candid camera campaigns.</p>
          </div>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-meta">
            <span class="resume-years">2004 – 2008</span>
            <span class="resume-company">Ogilvy Slovakia</span>
          </div>
          <div class="resume-entry-body">
            <p class="resume-role">Associate Creative Director</p>
            <p>First serious client-facing responsibility on the agency's second largest account. Successfully defended the AOR title in a multi-stage pitch — the two weeks Radovan learned what 3 hours of sleep feels like.</p>
          </div>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-meta">
            <span class="resume-years">2002 – 2004</span>
            <span class="resume-company">Freelance</span>
          </div>
          <div class="resume-entry-body">
            <p class="resume-role">Copywriter</p>
            <p>Doing whatever whoever would pay Radovan to do.</p>
          </div>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-meta">
            <span class="resume-years">2000 – 2002</span>
            <span class="resume-company">GREY Slovakia</span>
          </div>
          <div class="resume-entry-body">
            <p class="resume-role">Junior Copywriter</p>
            <p>Doing whatever whoever at the agency would tell Radovan to do.</p>
          </div>
        </div>

      </section>

      <section class="resume-section">
        <h2 class="resume-section-title">Awards</h2>
        <ul class="resume-awards">
          <li><span class="award-count">1×</span> EURO Effie</li>
          <li><span class="award-count">2×</span> MIDAS Awards</li>
          <li><span class="award-count">1×</span> PIAF</li>
          <li><span class="award-count">5×</span> Effie</li>
          <li><span class="award-count">9×</span> Zlatý klinec</li>
          <li><span class="award-count">2×</span> Zlatá pecka</li>
        </ul>
      </section>

    </div>
  </main>`;

  fs.writeFileSync(
    path.join(SITE, 'resume.html'),
    page('Resume – Radovan Grezo', 'resume', body)
  );
  console.log('✓ resume.html');
}

// ── 3. contact.html ───────────────────────────────────────────────────────────
{
  const emailLink = { href: 'mailto:hello@radovangrezo.com', text: 'hello@radovangrezo.com' };
  const phoneLink = { href: 'tel:+420773633362', text: '+420 773 633 362' };
  const linkedin  = contact.links.find(l => l.href.includes('linkedin'));

  const socialRows = [emailLink, phoneLink, linkedin].filter(Boolean).map(l => {
    const label = (l.text || '').replace(/>>/g, '').trim() || 'Email';
    return `<li><a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(label)}</a></li>`;
  }).join('\n            ');

  const contactImg = contact.images[0]
    ? `<img src="${esc(contact.images[0])}" alt="Contact Radovan Grezo" loading="lazy" class="contact-img">`
    : '';

  const body = `  <main>
    <div class="page-inner">
      <div class="page-header">
        <p class="page-label">I Dare You To</p>
        <h1>Contact me</h1>
        <hr class="accent-rule">
      </div>
      <div class="contact-layout">
        <div class="contact-copy">
          <p class="contact-tagline">Based in Prague.<br>Owner of Somebody&amp;Somebody agency</p>
          <ul class="contact-links">
            ${socialRows}
          </ul>
        </div>
        <div class="contact-image">
          ${contactImg}
        </div>
      </div>
    </div>
  </main>`;

  fs.writeFileSync(
    path.join(SITE, 'contact.html'),
    page('Contact – Radovan Grezo', 'contact', body)
  );
  console.log('✓ contact.html');
}

// ── 4. Portfolio pages ────────────────────────────────────────────────────────
for (const p of PORTFOLIOS) {
  const pd = byUrl[`https://radovangrezo.com/?portfolio=${p.slug}`];
  if (!pd) { console.log(`  ⚠ No data for ${p.slug}`); continue; }

  const title    = cleanTitle(pd.title);
  const text     = cleanText(pd.text);
  const cats     = extractCategories(home.links, p.slug);
  const catHtml  = cats.length ? `<p class="project-cats">${cats.map(esc).join(' &middot; ')}</p>` : '';
  const metaHtml = pd.meta_description ? `<p class="project-desc">${esc(pd.meta_description)}</p>` : '';
  const paragraphs = toParagraphs(text);

  const uniqueImages = [...new Set(pd.images)];
  const imagesHtml = uniqueImages.length
    ? `<div class="project-images">\n        ` +
      uniqueImages.map(src => `<figure class="project-image"><img src="${esc(src)}" alt="${esc(title)}" loading="lazy"></figure>`).join('\n        ') +
      `\n      </div>`
    : '';

  const videosHtml = pd.videos.length
    ? `<div class="project-videos">\n        ` +
      pd.videos.map(v => videoEmbed(v)).join('\n        ') +
      `\n      </div>`
    : '';

  const body = `  <main>
    <div class="page-inner">
      <div class="project-header">
        <a href="index.html" class="back-link">&larr; All Work</a>
        ${catHtml}
        <h1>${esc(title)}</h1>
        ${metaHtml}
        <hr class="accent-rule">
      </div>
      <div class="prose">
        ${paragraphs}
      </div>
      ${videosHtml}
      ${imagesHtml}
    </div>
  </main>`;

  fs.writeFileSync(path.join(SITE, p.file), page(`${title} – Radovan Grezo`, 'work', body));
  console.log(`✓ ${p.file}`);
}

// ── 5. archive.html ───────────────────────────────────────────────────────────
{
  const text       = cleanText(archive.text);
  const paragraphs = toParagraphs(text);

  const uniqueImages = [...new Set(archive.images)];
  const imagesHtml = uniqueImages.length
    ? `<div class="project-images">\n      ` +
      uniqueImages.map(src => `<figure class="project-image"><img src="${esc(src)}" alt="Archive" loading="lazy"></figure>`).join('\n      ') +
      `\n    </div>`
    : '';

  const videosHtml = archive.videos.length
    ? `<div class="project-videos">\n      ` +
      archive.videos.map(v => videoEmbed(v)).join('\n      ') +
      `\n    </div>`
    : '';

  const body = `  <main>
    <div class="page-inner">
      <div class="page-header">
        <h1>More &amp; Older Work</h1>
        <hr class="accent-rule">
      </div>
      <div class="prose">
        ${paragraphs}
      </div>
      ${videosHtml}
      ${imagesHtml}
    </div>
  </main>`;

  fs.writeFileSync(
    path.join(SITE, 'archive.html'),
    page('More & Older Work – Radovan Grezo', 'archive', body)
  );
  console.log('✓ archive.html');
}

console.log(`\n✅  Site built → /${SITE}/`);
