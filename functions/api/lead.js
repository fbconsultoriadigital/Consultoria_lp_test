export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();

    // Honeypot anti-spam
    if (formData.get('website')) {
      return jsonResponse(
        { success: false, message: 'Envio inválido.' },
        400
      );
    }

    const nome = clean(formData.get('nome'), 100);
    const whatsapp = String(formData.get('whatsapp') || '')
      .replace(/\D/g, '')
      .slice(0, 11);
    const necessidade = clean(formData.get('necessidade'), 100);

    // Validação obrigatória no servidor
    if (
      nome.length < 2 ||
      !/^\d{11}$/.test(whatsapp) ||
      !necessidade
    ) {
      return jsonResponse(
        { success: false, message: 'Dados inválidos.' },
        400
      );
    }

    const submissionId =
      clean(formData.get('submission_id'), 100) ||
      crypto.randomUUID();

    const utmSource = clean(formData.get('utm_source'), 500);
    const utmMedium = clean(formData.get('utm_medium'), 500);
    const utmCampaign = clean(formData.get('utm_campaign'), 500);
    const utmContent = clean(formData.get('utm_content'), 500);
    const utmTerm = clean(formData.get('utm_term'), 500);
    const gclid = clean(formData.get('gclid'), 500);
    const pageUrl = clean(formData.get('page_url'), 2000);

    try {
      await context.env.DB
        .prepare(`
          INSERT INTO leads (
            submission_id,
            nome,
            whatsapp,
            necessidade,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            gclid,
            page_url
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          submissionId,
          nome,
          whatsapp,
          necessidade,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          gclid,
          pageUrl
        )
        .run();

    } catch (error) {
      // submission_id já existente = mesma submissão repetida.
      if (
        String(error?.message || '')
          .toLowerCase()
          .includes('unique')
      ) {
        return jsonResponse({
          success: true,
          duplicate: true,
          message: 'Lead já recebido.'
        });
      }

      throw error;
    }

    return jsonResponse({
      success: true,
      duplicate: false,
      message: 'Lead recebido com sucesso.'
    });

  } catch (error) {
    console.error('Erro ao registrar lead no D1:', error);

    return jsonResponse(
      {
        success: false,
        message: 'Não foi possível registrar o lead.'
      },
      500
    );
  }
}

function clean(value, maxLength) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
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
