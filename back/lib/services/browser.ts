import {chromium} from "playwright";
import {saveVideo} from "playwright-video";

export async function renderToBrowser({
                                          urlTemplate = 'http://localhost:3000/templates/template.html',
                                          fps = 30,
                                          data,
                                          pathOut,
                                          debug = false,
                                          options = {devtools: true},
                                          width = 1920,
                                          height = 1080,
                                      }) {

    try {
        let capture;

        // Запускаем браузер
        let browser = await chromium.launch({headless: debug === false, ...options});
        const context = await browser.newContext({viewport: {width, height}});
        const page = await context.newPage();

        await page.goto(urlTemplate);

        // @ts-ignore
        const videoDur = await page.evaluate((data) => window?.render(data), data) ?? 0;

        if (!debug) {
            // const savePath = join('.\\', `${Date.now()}.mp4`);
            if (videoDur > 0) capture = await saveVideo(page, pathOut, {followPopups: false, fps});

            if (videoDur === 0) {
                await page.screenshot({path: pathOut})
            }

            if (videoDur > 0) await page.waitForTimeout(videoDur);
            if (videoDur > 0) await capture.stop();

            await page.close();
        } else {
            await page.close();
        }

    } catch (error) {
        console.error('Ошибка при преобразовании HTML в PNG:', error);
    }

}