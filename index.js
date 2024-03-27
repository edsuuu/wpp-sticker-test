const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const commander = require('commander')
const axios = require('axios')
const urlRegex = require('url-regex')

const STICKER_COMMAND = "/st"
const STICKER_HELP = "/duvida"

const MediaType = {
    Image: { contentType: "image/jpeg", fileName: "image.jpg" },
    Video: { contentType: "video/mp4", fileName: "video.mp4" }
}

// Parse command line arguments
commander
    .usage('[OPTIONS]...')
    .option('-d, --debug', 'Show debug logs', false)
    .option('-c, --chrome <value>', 'Use an installed Chrome Browser')
    .option('-f, --ffmpeg <value>', 'Use a different ffmpeg')
    .parse(process.argv)

const options = commander.opts()

const log_debug = options.debug ? console.log : () => { }
const puppeteerConfig = !options.chrome ? {} : { executablePath: options.chrome, args: ['--no-sandbox'] }
// const ffmpegPath = options.ffmpeg ? options.ffmpeg : undefined

// Inicialize WhatsApp Web client
const client = new Client({
    authStrategy: new LocalAuth(),
    ffmpegPath: 'C:\\Users\\edson.dasilva.ext\\Documents\\github\\wpp-sticker\\ffm\\bin\\ffmpeg.exe', // Substitua com o caminho correto
    puppeteer: puppeteerConfig,
})

log_debug("Inicializando o QRCODE/Projeto...")

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const generateSticker = async (msg, sender) => {
    log_debug("Processing message ", msg.type, JSON.stringify(msg.body, null, 4))
    await msg.reply("Processando a figurinha, aguarde alguns segundos...⏳")

    if (msg.type === "image") {
        const { data } = await msg.downloadMedia()
        await sendMediaSticker(sender, MediaType.Image, data)
    } else if (msg.type === "video") {
        const { data } = await msg.downloadMedia()
        await sendMediaSticker(sender, MediaType.Video, data)
    } else if (msg.type === "chat") {
        let url = msg.body.split(" ").reduce((acc, elem) => acc ? acc : (urlRegex().test(elem) ? elem : false), false)
        if (url) {
            log_debug("URL:", url)
            try {
                let { data, headers } = await axios.get(url, { responseType: 'arraybuffer' })
                data = Buffer.from(data).toString('base64');
                let mediaType;
                if (headers['content-type'].includes("image")) {
                    mediaType = MediaType.Image;
                } else if (headers['content-type'].includes("video")) {
                    mediaType = MediaType.Video;
                } else {
                    msg.reply("❌ Erro, Tipo de mídia não suportado!");
                    return;
                }
                await sendMediaSticker(sender, mediaType, data);
            } catch (error) {
                console.error(error);
                msg.reply("❌ Erro ao processar a URL!");
            }
        } else {
            msg.reply("❌ Erro, URL inválida!")
        }
    }
}

const sendMediaSticker = async (sender, type, data) => {
    const fileName = type === MediaType.Image ? "image.jpg" : "video.mp4";
    const media = new MessageMedia(type.contentType, data, fileName);
    await client.sendMessage(sender, media, { sendMediaAsSticker: true })
}

client.on('qr', qr => {
    qrcode.generate(qr, { small: true })
})

client.on('ready', () => {
    console.log('Wpp-Sticker is ready!')
})

client.on('message_create', async msg => {
    if (msg.body.split(" ").includes(STICKER_COMMAND)) {
        log_debug("User:", client.info.wid.user, "To:", msg.to, "From:", msg.from)
        const sender = msg.from.startsWith(client.info.wid.user) ? msg.to : msg.from
        try {
            await generateSticker(msg, sender)
        } catch (e) {
            console.error(e);
            msg.reply("❌ Erro ao gerar Sticker!")
        }
    }
})

client.on('message_create', message => {
	if(message.body === STICKER_HELP) {
		message.reply(`
        ====================================
        
        *COMO GERAR AS FIGURINHAS*
        
        Envie sua imagem e na legenda,
        coloque o comando informado abaixo
        para poder gerar sua Figurinha.

        ======================
        *COMANDO PARA GERAR AS FIGURINHAS*

        /st

        ====================================
        *PARA QUAL ARQUIVOS TEM SUPORTE*
        *PARA GERAR O STICKER ?* 
        
        IMAGENS, VIDEO E GIFS
        
        "PARA LINKS AINDA ESTA SEM SUPORTE"
        
        ====================================

            *Faça sua Figurinha*

        `);
	}
});

client.initialize()
