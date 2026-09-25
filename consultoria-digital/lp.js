/* LP isolada: não depende do main.js da página institucional. */
(() => {
  'use strict';

  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyFW5pcob0YJeJW9hlKmA6VqR1fw8dPYSqbehsZzKz7Mrkf6u7Z84OekBCZCtBYfSzF/exec';
  const CANONICAL = 'https://www.filipebuenoconsultoria.com.br/consultoria-digital/';

  const ATTRIBUTION_KEY = 'fb.consultoria.attribution.v2';
  const SUCCESS_KEY = 'fb.consultoria.confirmed.v2';
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

  /* =========================================================
     ATRIBUIÇÃO DE CAMPANHA
     ========================================================= */

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
      : {
          time: Date.now(),
          values: {}
        };

  if (freshCampaign) {
    // Uma nova campanha substitui a anterior, sem misturar atribuições.
    keys.forEach(key => {
      attribution.values[key] = (query.get(key) || '').slice(0, 500);
    });
  }

  keys.forEach(key => {
    form.elements.namedItem(key).value = attribution.values[key] || '';
  });

  // A URL salva exclui parâmetros arbitrários e fragmentos
  // que possam conter PII.
  const pageURL = new URL(CANONICAL);

  keys.forEach(key => {
    if (attribution.values[key]) {
      pageURL.searchParams.set(key, attribution.values[key]);
    }
  });

  form.elements.namedItem('page_url').value = pageURL.href;

  save(ATTRIBUTION_KEY, attribution);

  /* =========================================================
     DATALAYER / GTM
     ========================================================= */

  window.dataLayer = window.dataLayer || [];

  function track(event) {
    // Lista fixa: jamais incluir valores dos campos,
    // URL da query ou FormData.
    window.dataLayer.push({
      event,
      lp_id: 'consultoria_digital',
      form_id: 'lead-form',
      page_location: CANONICAL
    });
  }

  // Reutiliza o contêiner existente.
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

  /* =========================================================
     FORM START
     ========================================================= */

  function start(event) {
    if (
      !started &&
      !confirmed &&
      ['nome', 'whatsapp', 'necessidade'].includes(event.target.name)
    ) {
      started = true;
      track('form_start');
    }
  }

  form.addEventListener('focusin', start);
  form.addEventListener('input', start);
  form.addEventListener('change', start);

  /* =========================================================
     ERROS DOS CAMPOS
     ========================================================= */

  function error(field, message) {
    document.getElementById(`${field.id}-error`).textContent = message;

    if (message) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
  }

  [nome, phone, need].forEach(field => {
    field.addEventListener('input', () => error(field, ''));
  });

  /* =========================================================
     MÁSCARA DO WHATSAPP
     DDD + CELULAR = 11 DÍGITOS
     Exemplo: (11) 99999-9999
     ========================================================= */

  phone.addEventListener('input', () => {
    // Remove qualquer caractere que não seja número
    // e impede mais de 11 dígitos.
    const digits = phone.value
      .replace(/\D/g, '')
      .slice(0, 11);

    if (!digits) {
      phone.value = '';
      return;
    }

    // DDD ainda incompleto.
    if (digits.length <= 2) {
      phone.value = `(${digits}`;
      return;
    }

    const ddd = digits.slice(0, 2);
    const numero = digits.slice(2);

    // Número ainda incompleto.
    if (numero.length <= 5) {
      phone.value = `(${ddd}) ${numero}`;
      return;
    }

    // Formato final: (11) 99999-9999
    phone.value =
      `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
  });

  /* =========================================================
     VALIDAÇÃO
     ========================================================= */

  function validate() {
    const phoneDigits = phone.value.replace(/\D/g, '');

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

    messages.forEach(([field, message]) => {
      error(field, message);
    });

    const invalid = messages.find(([, message]) => message);

    if (invalid) {
      invalid[0].focus();
    }

    return !invalid;
  }

  /* =========================================================
     SUCESSO
     ========================================================= */

  function showSuccess(focus) {
    confirmed = true;
    form.hidden = true;
    status.textContent = '';
    success.hidden = false;

    if (focus) {
      success.focus();
    }
  }

  const previous = read(SUCCESS_KEY);

  if (
    previous &&
    Date.now() - previous.time < TTL
  ) {
    showSuccess(false);
  }

  /* Habilita o formulário somente após o JS estar carregado. */
  fields.disabled = false;

  /* =========================================================
     ENVIO DO LEAD
     ========================================================= */

  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (busy || confirmed) {
      return;
    }

    status.textContent = '';

    /* Honeypot anti-spam */
    if (form.elements.namedItem('website').value) {
      status.textContent = FAILURE;
      status.focus();
      return;
    }

    if (!validate()) {
      return;
    }

    if (navigator.onLine === false) {
      status.textContent = FAILURE;
      status.focus();
      return;
    }

    form.elements.namedItem('submitted_at').value =
      new Date().toISOString();

    const body = new URLSearchParams(
      new FormData(form)
    );

    body.set(
      'nome',
      nome.value.trim()
    );

    /*
      Envia apenas números para o Apps Script.
      Exemplo:
      (11) 99999-9999 → 11999999999
    */
    body.set(
      'whatsapp',
      phone.value.replace(/\D/g, '')
    );

    busy = true;
    fields.disabled = true;

    form.setAttribute(
      'aria-busy',
      'true'
    );

    button.textContent = 'Enviando…';
    status.textContent = 'Enviando…';

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      25000
    );

    try {
      /*
        POST simples, sem preflight.

        Nunca usar no-cors:
        resposta opaca não confirma gravação.
      */
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        body,
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        signal: controller.signal,
        referrerPolicy: 'no-referrer'
      });

      if (
        !response.ok ||
        response.type === 'opaque'
      ) {
        throw new Error(
          'Unconfirmed response'
        );
      }

      const result = await response.json();

      if (result.success !== true) {
        throw new Error(
          'Lead rejected'
        );
      }

      /*
        O servidor confirmou a gravação.
        Só agora consideramos conversão.
      */
      save(SUCCESS_KEY, {
        time: Date.now()
      });

      showSuccess(true);

      /*
        generate_lead só dispara após
        confirmação positiva do Apps Script.
      */
      if (!leadEmitted) {
        leadEmitted = true;
        track('generate_lead');
      }

      form.reset();

    } catch {
      status.textContent = FAILURE;
      status.focus();

      /*
        Sem retry automático:
        o servidor pode ter gravado antes
        de uma eventual falha de rede.
      */

    } finally {
      clearTimeout(timeout);

      busy = false;
      fields.disabled = confirmed;

      form.removeAttribute(
        'aria-busy'
      );

      button.textContent =
        'Quero conversar';
    }
  });
})();
