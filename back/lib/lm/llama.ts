import {fileURLToPath} from "url";
import path from "path";
import chalk from "chalk";
import {getLlama, LLamaChatPromptOptions, LlamaChatResponseChunk, LlamaChatSession, resolveModelFile} from "node-llama-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDirectory = path.join(__dirname, ".", "models");


const llama = await getLlama();

console.log(chalk.yellow("Resolving model file..."));
const modelPath = await resolveModelFile(
    "hf:mradermacher/DeepSeek-R1-Distill-Qwen-14B-GGUF:Q4_K_M",
    modelsDirectory
);

console.log(chalk.yellow("Loading model..."));
const model = await llama.loadModel({
    modelPath,
    // defaultContextFlashAttention: true
});

console.log(chalk.yellow("Creating context..."));
const context = await model.createContext();

const session = new LlamaChatSession({
    contextSequence: context.getSequence()
});
console.log();


export const addTaskToLLM = async (request: string, clbOut: (type: string, chunk?: string) => void) => new Promise(async (resolve, reject) => {
    try {
        const answer = await session.prompt(request, {
            onResponseChunk(chunk) {
                // @ts-ignore
                if (chunk.type === "segment" && chunk.segmentStartTime != null) clbOut(chunk.segmentType, '')

                clbOut('process', chunk.text)

                // @ts-ignore
                if (chunk.type === "segment" && chunk.segmentEndTime != null) clbOut(chunk.segmentType, '')
            }
        });
        clbOut('end', answer);
        resolve(null);
    } catch (error) {
        reject(error);
    }
})

// const q1 = "Реши уравнение 2x-8=15";
// console.log(chalk.yellow("User: ") + q1);
// await addTaskToLLM(q1, (type, chunk) => {
//     if (type != 'process') console.log(chalk.yellow(type));
//     process.stdout.write(chunk as string);
// })

// process.stdout.write(chalk.yellow("AI: "));
// const a1 = await session.prompt(q1, {
//     onResponseChunk(chunk) {
//         if (chunk.type === "segment" && chunk.segmentStartTime != null)
//             process.stdout.write(chalk.bold(` [segment start: ${chunk.segmentType}] `));
//
//         process.stdout.write(chunk.text);
//
//         if (chunk.type === "segment" && chunk.segmentEndTime != null)
//             process.stdout.write(chalk.bold(` [segment end: ${chunk.segmentType}] `));
//     }
// });
// process.stdout.write("\n");
// console.log(chalk.yellow("Consolidated AI answer: ") + a1);
// console.log();
