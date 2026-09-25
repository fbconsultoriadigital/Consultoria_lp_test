export async function onRequestPost(context) {
  const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbyFW5pcob0YJeJW9hlKmA6VqR1fw8dPYSqbehsZzKz7Mrkf6u7Z84OekBCZCtBYfSzF/exec';

  try {
    const formData = await context.request.formData();

    // Honeypot anti-spam
    if (formData.get('website')) {
      return jsonResponse(
        { success: false, message: 'Envio inválido.' },
        400
      );
    }

    const nome = String(formData.get('nome') || '').trim();
    const whatsapp = String(formData.get('whatsapp') || '').replace(/\D/g, '');
    const necessidade = String(formData.get('necessidade') || '').trim();

    // Validação também no servidor
    if (
      nome.length < 2 ||
      nome.length > 100 ||
      !/^\d{11}$/.test(whatsapp) ||
      !necessidade ||
      necessidade.length > 100
    ) {
      return jsonResponse(
        { success: false, message: 'Dados inválidos.' },
        400
      );
    }

    // Garante que o Apps Script receba apenas os 11 dígitos
    formData.set('whatsapp', whatsapp);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response;

    try {
      response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: formData,
        redirect: 'follow',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Apps Script HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.success !== true) {
      return jsonResponse(
        {
          success: false,
          message: 'O servidor não confirmou o recebimento.'
        },
        502
      );
    }

    return jsonResponse({
      success: true,
      message: 'Lead recebido com sucesso.'
    });

  } catch (error) {
    console.error('Erro ao processar lead:', error);

    return jsonResponse(
      {
        success: false,
        message: 'Não foi possível registrar o lead.'
      },
      502
    );
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}
