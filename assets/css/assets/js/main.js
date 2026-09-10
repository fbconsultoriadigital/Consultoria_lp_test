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

  mainNav.querySelectorAll('a').forEach(link => {

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
