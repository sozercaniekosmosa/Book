import axios from "axios";
import path from "path";
import {readFileAsync, writeFileAsync} from "../filesystem.js";
import OpenAI from "openai";
import {config} from "dotenv";
import glob from "../../../front/src/glob.js";
import {generateUID} from "../utils.js";

const {parsed} = config();
const {FOLDER_ID, OAUTH_TOKEN, ARLIAI_API_KEY, MISTRAL_API_KEY} = parsed;

export async function yandexGPT(prompt, text, folder_id) {
    const iam_token = await getIAM();
    const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

    const promptData = {
        modelUri: `gpt://${folder_id}/yandexgpt/rc`,//
        completionOptions: {stream: false, "temperature": 0, "maxTokens": "15000"},
        messages: [{role: "system", "text": prompt ?? "Упрости текст до 30 слов"}, {role: "user", text}]
    }
    try {
        const {data} = await axios.post(url, promptData, {
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${iam_token}`},
            params: {folderId: folder_id},
        })

        return data.result.alternatives.map(({message: {text}}) => text).join('\n')
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export async function arliGPT(prompt, text, arliai_api_key) {
    try {
        const {data} = await axios.post("https://api.arliai.com/v1/chat/completions", {
            model: "Mistral-Nemo-12B-Instruct-2407",
            messages: [
                {role: "system", content: prompt},
                {role: "user", content: text}
            ]
            , repetition_penalty: 1.1, temperature: 0.7, top_p: 0.9, top_k: 40, max_tokens: 1024, stream: false
        }, {
            headers: {
                "Authorization": `Bearer ${arliai_api_key}`, "Content-Type": "application/json"
            }
        })
        return data.choices.map(({message: {content}}) => content).join('\n');
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export async function getImageOpenAPI(prompt: string, arrImage: string[], param: any, api_key: string) {

    try {
        if (arrImage?.length > 3) throw 'Too many images > 3';

        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: api_key,
        });

        const model = "google/gemini-2.5-flash-image"
        // const model = "google/gemini-2.5-flash-image-preview"

        let content: any = [
            {
                type: 'text',
                text: `${prompt}. Merge the two attached images into a single cohesive scene based on the text.`
            }
        ];

        if (arrImage)
            content = [...content, ...arrImage.map(base64DataUri => ({
                type: 'image_url',
                image_url: {url: base64DataUri}, // Base64 Data URI
            }))]


        let image_config: any = {aspect_ratio: param?.aspect_ratio ?? '1:1'};

        const response = await openai.chat.completions.create({
            model: model,
            messages: [{role: 'user', content}],
            /*@ts-ignore*/
            image_config
            // image_config: {
            //     aspect_ratio: '4:3', // Например: '16:9', '1:1', '9:16'
            // }
        });

        const message = response.choices[0].message;
        const generatedImages = (message as any).images;

        if (generatedImages && generatedImages.length > 0) {
            console.log('Generated Image URL (Base64/URL):', generatedImages[0].image_url.url.substring(0, 50) + '...');
            return generatedImages[0].image_url.url;
        } else {
            console.log('Text Response:', message.content);
            return 'Image generation request sent, but no image URL found.';
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', error.response?.data || error.message);
        } else {
            console.error('Unexpected error:', error);
        }
        throw error;
    }
}

export async function OpenAPI(system: string, user: string, progressID: string, api_key: string) {

    try {
        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: api_key,
            // defaultHeaders: {
            //     'X-Title': 'Book',
            //     'HTTP-Referer': 'google-vertex', // или 'google-ai-studio'
            // },
            defaultHeaders: {
                'HTTP-Referer': 'agent-' + generateUID(), // Your app's URL
                'X-Title': 'id-' + generateUID(),
            },
        });

        // плохие
        // const model = "thedrummer/cydonia-24b-v4.1"//..s
        // const model = "openai/gpt-4.1-nano"//..s
        // const model = "qwen/qwq-32b"//..s

        // тестим
        // const model = "anthropic/claude-haiku-4.5"//..s
        const model = "google/gemini-2.0-flash-001"//..s
        // const model = "google/gemini-2.5-flash-lite-preview-09-2025"//..s
        // const model = "google/gemini-2.5-flash-lite"//..s

        console.log(model);

        const response = await openai.chat.completions.create({
            model,
            messages: system && user ? [
                {role: "system", content: system},
                {role: "user", content: user}
            ] : [
                {role: "user", content: system ?? user}
            ],

            // extra_body: {
            //     provider: {
            //         only: ["google-vertex"] // Явно указываем использовать только Google Vertex AI
            //     }
            // },

            stream: true, // в потоке

            // temperature: .5, // В диапазоне от 0 до 2 (по умолчанию – 1.0). Более высокое значение делает ответы более креативными и непредсказуемыми, низкое — более детерминированными
            // top_p: 0.95, // От 0 до 1.0 (по умолчанию — 0.95). Альтернатива температуре: регулировка разнообразия текста
            // n: 1,
            // frequency_penalty: 1, // от -2.0 до 2.0, штраф за повторяемость слов
            // presence_penalty: 1.5, // от -2.0 до 2.0, поощрение упоминания новых тем

            // response_format: {"type": "json_object"},
        });


        // const result = response.choices[0].message.content;
        let result = '';
        for await (const chunk of response) {
            const part: string | null = chunk.choices[0].delta?.content ?? null;
            result += part;
            glob.ws && (glob.ws as WebSocket).send(JSON.stringify({
                type: 'gpt-progress' + (progressID ? '-' + progressID : ''),
                data: result
            }));
        }

        // console.log(result);
        return result.startsWith('\`\`\`json') ? result.substring(7, result.length - 4) : result;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', error.response?.data || error.message);
        } else {
            console.error('Unexpected error:', error);
        }
        throw error;
    }
}

export async function mistralGPT(prompt, text, mistral_api_key) {

    const url = 'https://api.mistral.ai/v1/chat/completions ';

    const data = {
        // model: 'mistral-large-latest',
        model: 'mistral-medium-2505',
        messages: prompt && text ? [
            {role: "system", content: prompt},
            {role: "user", content: text}
        ] : [
            {role: "user", content: prompt ?? text}
        ],
        response_format: {"type": "json_object"}
    };

    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${mistral_api_key}`,
    };

    try {
        const response = await axios.post(url, data, {headers});
        console.log(response.data);

        return response.data.choices.map(({message: {content}}) => content).join('\n');

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', error.response?.data || error.message);
        } else {
            console.error('Unexpected error:', error);
        }
        throw error;
    }
}


export async function mistralGPT2(prompt, text, mistral_api_key) {
    try {
        const {data} = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: 'mistral-large-latest',//'mistral-small-latest',
            messages: [
                {role: "system", content: prompt},
                {role: "user", content: text}
            ],
        }, {
            headers: {
                'Content-Type': 'application/json', 'Authorization': `Bearer ${mistral_api_key}`  // Замените на ваш API ключ
            }
        });

        return data.choices.map(({message: {content}}) => content).join('\n');
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export async function yandexToSpeech({text, path, voice = 'marina', speed = 1.4, folder_id, oauth_token}) {
    try {
        const iam_token = await getIAM(oauth_token);
        const url = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';

        const {data} = await axios({
            method: 'POST', url, headers: {
                'Authorization': `Bearer ${iam_token}`
            }, responseType: 'arraybuffer',  // Получаем данные как бинарный массив
            // @ts-ignore
            data: new URLSearchParams({
                text, lang: 'ru-RU', voice,
                //voice: 'jane', // voice: 'ermil',
                // voice: 'filipp',
                // voice: 'lera',
                speed, folderId: folder_id, format: 'mp3', sampleRateHertz: '48000'
            })
        })

        await writeFileAsync(`./public/public/${path}/speech.mp3`, data);
        console.log('Аудиофайл успешно создан.');
    } catch (error) {
        console.log(error)
        throw error;
    }
}

let iamToken, dtExpMs;
const getIAM = async (oauth_token = null) => { //для работы нужен AIM для его получения нужен OAUTH его можно взять тут: https://oauth.yandex.ru/verification_code
    let expiresAt, dtNowMs = (new Date()).getTime();
    const filePath = path.join('./', 'iam.json');

    if (dtExpMs && dtExpMs > dtNowMs) return iamToken; //dtExpMs-заиничен и время не истекло, то выход

    if (!dtExpMs) {//dtExpMs - не заиничен
        try {
            const raw = await readFileAsync(filePath);
            ({iamToken, expiresAt} = JSON.parse(raw.toString()));
            dtExpMs = (new Date(expiresAt)).getTime();
        } catch (error) {
            console.log(error)
        }
    }

    if (dtExpMs && dtExpMs > dtNowMs) return iamToken; //если файл есть и время не истекло, то выход

    try {
        const resp = await axios.post('https://iam.api.cloud.yandex.net/iam/v1/tokens', {yandexPassportOauthToken: oauth_token})
        console.log(resp)
        const {data} = resp;
        ({iamToken, expiresAt} = data);
        await writeFileAsync(filePath, JSON.stringify(data))

    } catch (error) {
        console.log(error)
    }

    return iamToken;
}