/* LP isolada: não depende do main.js da página institucional. */
(() => {
  'use strict';

  const ENDPOINT = '/api/lead';
  const CANONICAL =
    'https://www.filipebuenoconsultoria.com.br/consultoria-digital/';

  const ATTRIBUTION_KEY = 'fb.consultoria.attribution.v2';
  const SUCCESS_KEY = 'fb.consultoria.confirmed.v2';
  const SUBMISSION_KEY = 'fb.consultoria.submission.v1';
  const TTL = 30 * 60 * 1000;

  const FAILURE =
    'Não foi possível enviar suas informações agora. Tente novamente em instantes.';

  const keys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid'
  ];

  const form = document.getElementById('lead-form');
  const fields = document.getElementById('form-fields');
  const button = document.getElementById('submit-button');
  const status = document.getElementById('form-status');
  const success = document.getElementById('success-message');

  const nome = form.elements.namedItem('nome');
  const phone = form.elements.namedItem('whatsapp');
  const need = form.elements.namedItem('necessidade');

  let busy = false;
  let confirmed = false;
  let started = false;
  let leadEmitted = false;

  function read(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key));
    } catch {
      return null;
    }
  }

  function save(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Formulário funciona sem storage. */
    }
  }

  function remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Formulário funciona sem storage. */
    }
  }

  function createSubmissionId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === 'function'
    ) {
      return window.crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      '-' +
      Math.random().toString(36).slice(2)
    );
  }

  function getSubmissionId() {
    const cached = read(SUBMISSION_KEY);

    if (
      cached &&
      cached.id &&
      cached.time &&
      Date.now() - cached.time >= 0 &&
      Date.now() - cached.time < TTL
    ) {
      return cached.id;
    }

    const submission = {
      id: createSubmissionId(),
      time: Date.now()
    };

    save(SUBMISSION_KEY, submission);
    return submission.id;
  }

  const query = new URLSearchParams(location.search);
  const cached = read(ATTRIBUTION_KEY);
  const freshCampaign = keys.some(key => query.has(key));

  const attribution =
    !freshCampaign &&
    cached &&
    cached.values &&
    typeof cached.values === 'object' &&
    Date.now() - cached.time >= 0 &&
    Date.now() - cached.time < TTL
      ? cached
      : { time: Date.now(), values: {} };

  if (freshCampaign) {
    keys.forEach(key => {
      attribution.values[key] = (query.get(key) || '').slice(0, 500);
    });
  }

  keys.forEach(key => {
    form.elements.namedItem(key).value =
      attribution.values[key] || '';
  });

  const pageURL = new URL(CANONICAL);

  keys.forEach(key => {
    if (attribution.values[key]) {
      pageURL.searchParams.set(
        key,
        attribution.values[key]
      );
    }
  });

  form.elements.namedItem('page_url').value = pageURL.href;
  save(ATTRIBUTION_KEY, attribution);

  window.dataLayer = window.dataLayer || [];

  function track(event) {
    window.dataLayer.push({
      event,
      lp_id: 'consultoria_digital',
      form_id: 'lead-form',
      page_location: CANONICAL
    });
  }

  window.dataLayer.push({
    'gtm.start': Date.now(),
    event: 'gtm.js'
  });

  track('lp_view');

  const gtm = document.createElement('script');
  gtm.async = true;
  gtm.src =
    'https://www.googletagmanager.com/gtm.js?id=GTM-KT8S9VXG';
  document.head.appendChild(gtm);

  function start(event) {
    if (
      !started &&
      !confirmed &&
      ['nome', 'whatsapp', 'necessidade'].includes(
        event.target.name
      )
    ) {
      started = true;
      track('form_start');
    }
  }

  form.addEventListener('focusin', start);
  form.addEventListener('input', start);
  form.addEventListener('change', start);

  function error(field, message) {
    document.getElementById(
      `${field.id}-error`
    ).textContent = message;

    if (message) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
  }

  [nome, phone, need].forEach(field => {
    field.addEventListener('input', () =>
      error(field, '')
    );
  });

  phone.addEventListener('input', () => {
    const digits = phone.value
      .replace(/\D/g, '')
      .slice(0, 11);

    if (!digits) {
      phone.value = '';
      return;
    }

    if (digits.length <= 2) {
      phone.value = `(${digits}`;
      return;
    }

    const ddd = digits.slice(0, 2);
    const numero = digits.slice(2);

    if (numero.length <= 5) {
      phone.value = `(${ddd}) ${numero}`;
      return;
    }

    phone.value =
      `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
  });

  function validate() {
    const phoneDigits =
      phone.value.replace(/\D/g, '');

    const messages = [
      [
        nome,
        nome.value.trim().length < 2 ||
        nome.value.trim().length > 100
          ? 'Informe seu nome (entre 2 e 100 caracteres).'
          : ''
      ],
      [
        phone,
        !/^\d{11}$/.test(phoneDigits)
          ? 'Informe um WhatsApp celular válido com DDD.'
          : ''
      ],
      [
        need,
        !need.value
          ? 'Selecione o que você gostaria de melhorar.'
          : ''
      ]
    ];

    messages.forEach(([field, message]) =>
      error(field, message)
    );

    const invalid =
      messages.find(([, message]) => message);

    if (invalid) invalid[0].focus();

    return !invalid;
  }

  function showSuccess(focus) {
    confirmed = true;
    form.hidden = true;
    status.textContent = '';
    success.hidden = false;

    if (focus) success.focus();
  }

  const previous = read(SUCCESS_KEY);

  if (
    previous &&
    Date.now() - previous.time < TTL
  ) {
    showSuccess(false);
  }

  fields.disabled = false;

  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (busy || confirmed) return;

    status.textContent = '';

    if (form.elements.namedItem('website').value) {
      status.textContent = FAILURE;
      status.focus();
      return;
    }

    if (!validate()) return;

    if (navigator.onLine === false) {
      status.textContent = FAILURE;
      status.focus();
      return;
    }

    form.elements.namedItem('submitted_at').value =
      new Date().toISOString();

    const body =
      new URLSearchParams(new FormData(form));

    body.set('nome', nome.value.trim());
    body.set(
      'whatsapp',
      phone.value.replace(/\D/g, '')
    );

    /*
     * O mesmo ID é reutilizado enquanto o envio não for
     * confirmado. Isso permite repetir uma tentativa sem
     * criar um segundo lead no D1.
     */
    body.set(
      'submission_id',
      getSubmissionId()
    );

    busy = true;
    fields.disabled = true;
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'Enviando…';
    status.textContent = 'Enviando…';

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      15000
    );

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        body,
        credentials: 'same-origin',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(
          `Lead API HTTP ${response.status}`
        );
      }

      const result = await response.json();

      if (result.success !== true) {
        throw new Error('Lead rejected');
      }

      save(SUCCESS_KEY, {
        time: Date.now()
      });

      /*
       * O lead já foi confirmado pelo D1.
       * O próximo envio deverá receber um novo ID.
       */
      remove(SUBMISSION_KEY);

      showSuccess(true);

      if (!leadEmitted) {
        leadEmitted = true;
        track('generate_lead');
      }

      form.reset();

    } catch (error) {
      console.error(
        'Erro ao enviar lead:',
        error
      );

      status.textContent = FAILURE;
      status.focus();

      /*
       * Não removemos SUBMISSION_KEY.
       * Se o usuário tentar novamente, o mesmo ID será
       * enviado e o D1 impedirá duplicidade.
       */

    } finally {
      clearTimeout(timeout);

      busy = false;
      fields.disabled = confirmed;
      form.removeAttribute('aria-busy');
      button.textContent = 'Quero conversar';
    }
  });
})();
