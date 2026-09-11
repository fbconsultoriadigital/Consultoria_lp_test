/* ========================================
   MENU MOBILE
======================================== */

const menuToggle = document.querySelector('#menu-toggle');
const mainNav = document.querySelector('#main-nav');

if (menuToggle && mainNav) {

  menuToggle.addEventListener('click', () => {

    const isOpen = mainNav.classList.toggle('is-open');

    menuToggle.setAttribute(
      'aria-expanded',
      isOpen ? 'true' : 'false'
    );

    menuToggle.setAttribute(
      'aria-label',
      isOpen ? 'Fechar menu' : 'Abrir menu'
    );

  });

  mainNav.querySelectorAll('a').forEach((link) => {

    link.addEventListener('click', () => {

      mainNav.classList.remove('is-open');

      menuToggle.setAttribute(
        'aria-expanded',
        'false'
      );

      menuToggle.setAttribute(
        'aria-label',
        'Abrir menu'
      );

    });

  });

}


/* ========================================
   RASTREAMENTO DE CTAs - WHATSAPP
======================================== */

const whatsappCTAs = document.querySelectorAll('[data-cta]');

whatsappCTAs.forEach((cta) => {

  cta.addEventListener('click', () => {

    const ctaPosition = cta.dataset.cta;

    // Debug temporário
    console.log('WhatsApp CTA:', ctaPosition);

    // Data Layer preparada para GTM / GA4
    window.dataLayer = window.dataLayer || [];

    window.dataLayer.push({
      event: 'whatsapp_click',
      cta_position: ctaPosition,
      page_location: window.location.href
    });

  });

});
