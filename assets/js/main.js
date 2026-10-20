(function () {
      'use strict';

      // ------------------------------------------------------------------------
      // DATA JADWAL LARI
      // ------------------------------------------------------------------------
      const scheduleRuns = [
        { day: 2, name: 'Selasa', timeStr: '19.15 WIB', hour: 19, minute: 15, location: 'Stadion Atletik', distance: '7K' },
        { day: 4, name: 'Kamis', timeStr: '19.00 WIB', hour: 19, minute: 0, location: 'Pendopo Basecamp Paijo', distance: '5K' },
        { day: 0, name: 'Minggu', timeStr: '05.45 WIB', hour: 5, minute: 45, location: 'CFD Taman Kota', distance: '15K' }
      ];

      // ------------------------------------------------------------------------
      // [A] PERHITUNGAN OTOMATIS: LARI BERIKUTNYA
      // ------------------------------------------------------------------------
      function calculateNextRun() {
        const nextRunEl = document.getElementById('nextRunText');
        if (nextRunEl) {
          nextRunEl.textContent = 'Jadwal lari berikutnya: Dimana saja sesuai mood • Pantau info dadakan di IG @gankkapakmerah';
        }
      }
      calculateNextRun();

      // ------------------------------------------------------------------------
      // [E] WEEK STRIP: AUTO-HIGHLIGHT HARI INI (Animation #3)
      // ------------------------------------------------------------------------
      const todayDayIndex = new Date().getDay(); // 0..6
      const weekCells = document.querySelectorAll('.day-cell');
      weekCells.forEach(cell => {
        if (parseInt(cell.getAttribute('data-day'), 10) === todayDayIndex) {
          cell.classList.add('is-today');
        }
      });

      // ------------------------------------------------------------------------
      // ANIMASI #3: COUNT-UP ANGKA JARAK KM SAAT PANEL JADWAL TERLIHAT
      // ------------------------------------------------------------------------
      let counterTriggered = false;
      const jadwalSection = document.getElementById('jadwal');
      if ('IntersectionObserver' in window && jadwalSection) {
        const counterObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !counterTriggered) {
              counterTriggered = true;
              startDistanceCounters();
            }
          });
        }, { threshold: 0.25 });
        counterObserver.observe(jadwalSection);
      } else {
        startDistanceCounters();
      }

      function startDistanceCounters() {
        const counterEls = document.querySelectorAll('.counter-num');
        const duration = 600; // ms
        const startTime = performance.now();

        function updateCounters(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Easing cubic-bezier(.2,.7,.2,1) approx: 1 - Math.pow(1 - progress, 3)
          const ease = 1 - Math.pow(1 - progress, 3);

          counterEls.forEach(el => {
            const target = parseFloat(el.getAttribute('data-target'));
            const currentVal = (target * ease).toFixed(1);
            el.textContent = currentVal;
          });

          if (progress < 1) {
            requestAnimationFrame(updateCounters);
          } else {
            counterEls.forEach(el => {
              el.textContent = parseFloat(el.getAttribute('data-target')).toFixed(1);
            });
          }
        }
        requestAnimationFrame(updateCounters);
      }

      // ------------------------------------------------------------------------
      // ANIMASI #2: GARIS RUTE SVG MENGIKUTI SCROLL & TITIK PELARI
      // ------------------------------------------------------------------------
      const routePath = document.getElementById('routeActivePath');
      const runnerDot = document.getElementById('runnerDot');
      let totalPathLength = 800;
      if (routePath) {
        totalPathLength = routePath.getTotalLength() || 800;
        routePath.style.strokeDasharray = `${totalPathLength} ${totalPathLength}`;
        routePath.style.strokeDashoffset = totalPathLength;
      }

      // ------------------------------------------------------------------------
      // ANIMASI #6 & #8: MARQUEE ACCELERATION & POLKADOT PARALLAX
      // ------------------------------------------------------------------------
      const marqueeTrack = document.getElementById('marqueeTrack');
      let lastScrollY = window.scrollY;
      let scrollTimeout = null;

      function onScroll() {
        const scrollY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;

        // Animasi #2 Update Garis Rute
        if (routePath && runnerDot) {
          const drawLength = totalPathLength * (1 - progress);
          routePath.style.strokeDashoffset = drawLength;
          runnerDot.setAttribute('cy', (progress * 800).toString());
        }

        // Animasi #8 Polkadot Parallax (15% pergeseran scroll)
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          document.body.style.backgroundPositionY = `${(scrollY * 0.15) % 18}px`;
        }

        // Animasi #6 Kecepatan Marquee Naik Sebentar saat Scroll Cepat
        const delta = Math.abs(scrollY - lastScrollY);
        lastScrollY = scrollY;
        if (delta > 25 && marqueeTrack && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          marqueeTrack.classList.add('fast-scroll');
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            marqueeTrack.classList.remove('fast-scroll');
          }, 450);
        }
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      // ------------------------------------------------------------------------
      // ANIMASI #7: TOMBOL WHATSAPP MENYAPU GARIS FINIS SEBELUM BUKA
      // ------------------------------------------------------------------------
      const waButtons = document.querySelectorAll('.btn-wa-sweep');
      waButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
          const href = this.getAttribute('href');
          if (!href || href.startsWith('#')) return;

          e.preventDefault();
          this.classList.add('sweeping');

          setTimeout(() => {
            this.classList.remove('sweeping');
            window.open(href, '_blank', 'noopener,noreferrer');
          }, 400);
        });
      });

      // ------------------------------------------------------------------------
      // ANIMASI #4: BIB TILT & PIN HOLES SAAT TOUCH / TAP
      // ------------------------------------------------------------------------
      const bibCards = document.querySelectorAll('.bib-card');
      bibCards.forEach(bib => {
        bib.addEventListener('click', function () {
          bibCards.forEach(b => { if (b !== this) b.classList.remove('active'); });
          this.classList.toggle('active');
        });
      });

      // ------------------------------------------------------------------------
      // EVENT: TOGGLE ARSIP KENANGAN
      // ------------------------------------------------------------------------
      const archiveBtn = document.getElementById('archiveToggleBtn');
      const archiveContent = document.getElementById('archiveContent');
      if (archiveBtn && archiveContent) {
        archiveBtn.addEventListener('click', () => {
          const isOpen = archiveContent.classList.toggle('open');
          archiveBtn.setAttribute('aria-expanded', isOpen);
          archiveBtn.querySelector('span').textContent = isOpen ? 'Tutup kenangan' : 'Lihat kenangan';
        });
      }

      // ------------------------------------------------------------------------
      // FAQ: ACCORDION
      // ------------------------------------------------------------------------
      const faqItems = document.querySelectorAll('.faq-item');
      faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        questionBtn.addEventListener('click', () => {
          const wasOpen = item.classList.contains('open');
          faqItems.forEach(i => i.classList.remove('open'));
          if (!wasOpen) {
            item.classList.add('open');
          }
        });
      });

      // ------------------------------------------------------------------------
      // [A2] LIVE TELEMETRY HUD (Stopwatch & Cadence Jitter)
      // ------------------------------------------------------------------------
      const stopwatchEl = document.getElementById('hudStopwatch');
      const cadenceEl = document.getElementById('hudCadence');
      if (stopwatchEl) {
        let baseSeconds = 24 * 60 + 18.4;
        const hudStart = performance.now();
        function updateHudTimer() {
          const elapsed = (performance.now() - hudStart) / 1000;
          const currentTotal = baseSeconds + elapsed;
          const hours = Math.floor(currentTotal / 3600);
          const mins = Math.floor((currentTotal % 3600) / 60);
          const secs = Math.floor(currentTotal % 60);
          const tenths = Math.floor((currentTotal * 10) % 10);
          const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
          stopwatchEl.textContent = timeStr;
          requestAnimationFrame(updateHudTimer);
        }
        requestAnimationFrame(updateHudTimer);
      }

      if (cadenceEl) {
        setInterval(() => {
          const jitter = 173 + Math.floor(Math.random() * 5); // 173..177 SPM
          cadenceEl.textContent = jitter;
        }, 2200);
      }

      // ------------------------------------------------------------------------
      // LIGHTBOX GALERI DENGAN CAMERA SHUTTER FLASH EFFECT
      // ------------------------------------------------------------------------
      const lightboxModal = document.getElementById('lightboxModal');
      const lightboxImg = document.getElementById('lightboxImg');
      const lightboxCaption = document.getElementById('lightboxCaption');
      const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
      const cameraFlash = document.getElementById('cameraFlash');

      window.openLightbox = function (src, caption) {
        if (!lightboxModal) return;

        // Optical Camera Flash Trigger
        if (cameraFlash) {
          cameraFlash.classList.remove('flash-active');
          void cameraFlash.offsetWidth; // Force CSS Reflow
          cameraFlash.classList.add('flash-active');
        }

        setTimeout(() => {
          lightboxImg.src = src;
          lightboxCaption.textContent = caption;
          lightboxModal.classList.add('open');
          document.body.style.overflow = 'hidden';
        }, 120);
      };

      function closeLightbox() {
        if (!lightboxModal) return;
        lightboxModal.classList.remove('open');
        document.body.style.overflow = '';
      }

      if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
      if (lightboxModal) {
        lightboxModal.addEventListener('click', function (e) {
          if (e.target === this) closeLightbox();
        });
      }
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('open')) {
          closeLightbox();
        }
      });

      // ------------------------------------------------------------------------
      // ANIMASI #4+: INTERACTIVE 3D HOLOGRAPHIC TILT PADA BIB CARDS
      // ------------------------------------------------------------------------
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        bibCards.forEach(card => {
          card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const rotateX = -(y / rect.height) * 14;
            const rotateY = (x / rect.width) * 14;
            card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-8px)`;
          });
          card.addEventListener('mouseleave', () => {
            card.style.transform = '';
          });
        });
      }

      // ------------------------------------------------------------------------
      // MAGNETIC BUTTON HOVER EFFECT (Desktop)
      // ------------------------------------------------------------------------
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const magneticElements = document.querySelectorAll('.btn-green, .hero-gabung-pill, .kalcer-stamp-badge');
        magneticElements.forEach(el => {
          el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
            const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
            el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          });
          el.addEventListener('mouseleave', () => {
            el.style.transform = '';
          });
        });
      }

      // ------------------------------------------------------------------------
      // KALCER SCROLL REVEAL ENTRANCE (IntersectionObserver)
      // ------------------------------------------------------------------------
      const revealTargets = document.querySelectorAll('.event-row, .film-card, .cerita-item, .faq-item, .sponsor-logo, .drop-card');
      revealTargets.forEach((target, idx) => {
        target.classList.add('kalcer-reveal');
        target.style.transitionDelay = `${(idx % 4) * 0.08}s`;
      });

      if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              revealObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.15 });

        revealTargets.forEach(el => revealObserver.observe(el));
      } else {
        revealTargets.forEach(el => el.classList.add('is-revealed'));
      }

      // ------------------------------------------------------------------------
      // MODAL RUTE
      // ------------------------------------------------------------------------
      window.openRouteModal = function (title) {
        alert(`${title}\n\nRute detail telah tersinkronisasi dengan grup WhatsApp dan Strava resmi Gank Kapak.`);
      };

      // ------------------------------------------------------------------------
      // MOBILE FULLSCREEN MENU
      // ------------------------------------------------------------------------
      const mobileMenuBtn = document.getElementById('mobileMenuOpenBtn');
      const mobileCloseBtn = document.getElementById('mobileMenuCloseBtn');
      const mobileNavOverlay = document.getElementById('mobileNavOverlay');
      const mobileLinks = document.querySelectorAll('.mobile-nav-link');

      function openMobileMenu() {
        if (mobileNavOverlay) {
          mobileNavOverlay.classList.add('open');
          document.body.style.overflow = 'hidden';
        }
      }

      function closeMobileMenu() {
        if (mobileNavOverlay) {
          mobileNavOverlay.classList.remove('open');
          document.body.style.overflow = '';
        }
      }

      if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileMenu);
      if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeMobileMenu);
      mobileLinks.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mobileNavOverlay && mobileNavOverlay.classList.contains('open')) {
          closeMobileMenu();
        }
      });

      // Auto-scroll jadwal strip to today's card on small screens
      const todayCell = document.querySelector('.day-cell.is-today');
      const weekWrapper = document.querySelector('.week-strip-wrapper');
      if (todayCell && weekWrapper && window.innerWidth <= 768) {
        setTimeout(() => {
          todayCell.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 400);
      }

      // ------------------------------------------------------------------------
      // DYNAMIC STRAVA SYNC LOADER (Papan km dengan Bar & Crown)
      // ------------------------------------------------------------------------
      const leaderboardContainer = document.getElementById('leaderboardRows');
      if (leaderboardContainer && window.fetch) {
        fetch('data/leaderboard.json')
          .then(res => {
            if (!res.ok) throw new Error('Data leaderboard tidak ditemukan');
            return res.json();
          })
          .then(list => {
            if (Array.isArray(list) && list.length > 0) {
              const maxDist = Math.max(...list.map(i => parseFloat(i.distance) || 1));
              leaderboardContainer.innerHTML = list.map((item, idx) => {
                const distVal = parseFloat(item.distance) || 0;
                const percent = maxDist > 0 ? ((distVal / maxDist) * 100).toFixed(1) : 50;
                const isLeader = idx === 0;
                return `
                  <div class="leaderboard-row" data-percent="${percent}">
                    <span class="leaderboard-rank ${isLeader ? 'leader-top' : ''}">
                      ${item.rank} ${isLeader ? '<span class="crown-icon">👑</span>' : ''}
                    </span>
                    <span class="leaderboard-name">${item.name}</span>
                    <span class="leaderboard-km">${item.distance}</span>
                    <div class="leaderboard-bar" style="--bar-fill: ${percent}%;"></div>
                  </div>
                `;
              }).join('');
            }
          })
          .catch(() => {
            // Fallback otomatis menggunakan daftar default
          });
      }

    })();

