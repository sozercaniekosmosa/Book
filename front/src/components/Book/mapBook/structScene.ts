export const structScene = {
    options: {tags: 'scene image-gen deletable sceneImagePrompt', excludes: 'desc Название кратко sceneImagePrompt'},
    desc: 'Сцена - место, где происходят события или изменения, значимые для сюжета и раскрытия персонажей',
    sceneImagePrompt: '',
    'Краткое описание': {
        options: {excludes: 'toggle', includes: 'value'},
        desc: 'Подробно описать сцену и действия в ней',
        value: ''
    },
    'Название кратко': {
        options: {excludes: 'toggle', includes: 'value'},
        desc: 'Название сцены кратко 1-2 слова',
        value: ''
    },
    'Описание сцены': {
        options: {excludes: 'toggle', includes: 'value'},
        desc:
            'Название сцены и краткое описание окружение и предметов\n' +
            'Время действия — Хронологический период (историческая эпоха, современность), время года, суток (зима, ночь, рассвет), сезонные особенности (лето, зима).\n' +
            'Настроение, тон — Эмоциональная окраска (радость, таинственность, тревожность), использование метафор, сравнений для создания образов.\n' +
            'Сенсорные детали — Зрительные образы (цвета, формы, движения), звуки (шум ветра, тишина, музыка), запахи, тактильные ощущения (аромат цветов, холод).\n' +
            'Символизм и подтекст — Символические элементы несущие скрытый смысл (разбитое зеркало, часы, старый портрет, гроза как символ кризиса), аллегории, намёки на темы произведения.',
        requirements:
            'Необходимо четко сформулировать и перечислить: Название, время действия, настроение, тон сенсорные детали символизм и подтекст.\n' +
            'Строго запрещено описать персонажей, должно быть только описание сцены (помещение, место, ландшафт, ...)',
        example:
            'Мастерская просторное помещение с высокими окнами и потолками. В центре стоял верстак с инструментами, а у глухой стены распологался камин вкотором потрескивали дрова\n' +
            'Время действия — Наши дни, современность. ' +
            'Раннее лето, ясное утро. ' +
            'Начало лета, когда зелень еще свежая и яркая, а солнце уже теплое, но не палящее. Воздух чистый после ночного дождя.\n' +
            'Настроение, тон — Радость, безмятежность, чувство светлой надежды и предвкушения нового дня. ' +
            '«Солнечные зайчики танцевали на стенах, будто приглашая присоединиться к новому дню», «воздух был свеж, как только что распустившийся цветок», «город просыпался, мягко потягиваясь в лучах восхода».\n' +
            'Сенсорные детали — Золотистый солнечный свет, заливающий улицы; ярко-зеленая листва, сверкающая каплями росы; разноцветные балконы с цветущими гераньками; велосипедист в яркой майке, скользящий по пустынной набережной. ' +
            'Мелодичный перезвон велосипедного звонка; щебетание проснувшихся воробьев; отдаленный смех; умиротворяющий шум листвы на легком ветру.\n' +
            'Символизм и подтекст — Символ нового начала, чистого листа, безграничных возможностей, которые несет каждый новый день. ' +
            'Символ раскрытия потенциала, красоты настоящего момента и хрупкой, но яркой жизни. ',
        value: ''
    },
    'Персонажи': {
        options: {excludes: 'toggle', includes: 'value'},
        desc: 'Краткое описание персонажей участвующих в сцене, их  положение (позицию)',
        requirements: 'Перечисли всех персонажей (дай крактое описание) их положение внутри сцены и относительно друг-друга (сверху, в середине, слева, ...), ' +
            'отношения если это важно и предметы (рамер и положение) в сцене. Обязательно опиши положение персонажей относистельно друг-друга. ' +
            'Не описывай предметы и любые другие неодушевленные объекты.',
        example:
            '- Сергей (Главный герой и друг Анны) стоял у окна облоктившись на стену слева от кресла' +
            '- Максим (отец Бориса) сидел в кресле в середине комнаты' +
            '- Свенсон (Антагонист) уверенно направился к открывшемуся проходу',
        value: ''
    },
    'Детали окружения': {
        options: {excludes: 'toggle', includes: 'value'},
        desc: 'Описания окружения, персонажи, предметы, освещение, зувки, запахи и т.д.',
        requirements: 'Подробно опиши окружение, перечисли/опиши всех персонажей',
        example:
            'Сергей стоял у окна задумчиво разглядывая старую книгу ' +
            'Джонсон (отец Билли) вошел в холл ' +
            'Интерьер, мебель, Большой шкаф с оторваной ручкой, блестящий декор, предметы,  ' +
            'Сундук доверху набитый золотом, огромная переклееная скотчем коробка с надписью "Хрупко" ' +
            'Природа, деревья, река, животные, ' +
            'Освещение (сумерки, яркий свет, свечи), ' +
            'Социальная обстановка (богатый квартал, трущобы, замок, опасный район).' +
            'Швейная машинка "Singer" страрая, похоже еще довоенная',
        value: ''
    },
    'События': {
        options: {excludes: 'toggle desc requirements example', tags: 'arc-events incompressible', quantEvents: 5},
        desc: 'События - действия  происходящие на сцене: диалоги, физические действия персонажей, акустические, световые, природные',
        requirements:
            'События должны быть описаны достаточно конкретно, чтобы их можно было визуализировать или воспроизвести на сцене.\n' +
            'События должны быть разделены на события так что бы их можно было использовать для минимального количества иллюстаций в комиксе в виде 1 событие 1 иллюстрация: 1) ... событие 2) ... событие 3) ...\n' +
            'Если события включает диалог — он должен быть оформлен с указанием говорящего персонажа и его реплик, с ремарками (паузы, интонации, манеры, действия во время речи).\n' +
            'Физические действия должны быть ясны по направлению, интенсивности и последовательности.\n' +
            'Технические эффекты и природные явления (звук, свет, проекции) должны указывать на источник, длительность или характер воздействия.\n' +
            'Событие не должно быть абстрактным или описывать внутренние мысли без внешнего проявления — только то, что можно увидеть, услышать, почувствовать.\n' +
            'Должна соблюдаться причинно-следственная связь с предыдущими/последующими событиями, если это важно для сцены.\n' +
            'Минимум $quantEvents$ событий/действий.',
        example:
            '1. Герой и время: Герой смотрит на часы – половина второго, затем в окно и снова на часы – без четверти пять.\n' +
            '2. Героиня приходит: Героиня входит в офис, явно не выспавшаяся после ночи в клубе, её одежда немного помята.\n' +
            '3. Бой: Парировав удар, герой скользит вбок и отвечает жёстким ребром ладони в горло противнику.\n' +
            '4. Офисная перепалка:\n' +
            '[Анна] (нервно перебирая бумаги): Ты опять забыл выключить кофемашину?\n' +
            '[Макс] (не отрываясь от экрана): Это не я. Может, это призрак офиса?\n' +
            '[Анна] (с сарказмом): Очень смешно. Завтра придёт ревизор, а у нас — запах гари и счёт за электричество в два раза больше.\n' +
            '5. Страх и напряжение:\n' +
            '[Лена] (шёпотом, прижимаясь к стене): Он здесь... Я слышала шаги.\n' +
            '[Дима] (медленно достаёт фонарь): Ты уверена? ... Ладно, держись за меня.\n' +
            'Внезапно — громкий хлопок двери, свет мигает и гаснет.\n' +
            'Герой произносит "Я больше не могу", основной свет гаснет, остаётся узкий луч прожектора сверху — музыка обрывается.\n' +
            '6. Инцидент с бокалом:\n' +
            '[Официант] ставит бокал с треснувшим краем перед героиней: С вашего позволения...\n',
        value: '',

    },
    // 'Результат': {
    //     options: {excludes: 'toggle desc requirements example', tags: 'art', quantParagraphs: 6},
    //     desc: 'Литературно переработаный текст',
    //     requirements:
    //         'Act as a professional fiction writer.\n' +
    //         'Transform the *События* of scene [$sceneName$] by describing its *Описание сцены* and *Детали окружения* into a vivid, cinematic literary passage in Russian.\n' +
    //         'Preserve meaning and sequence, but express everything through imagery, emotion, and natural dialogue.\n' +
    //         'Show, don’t tell. Add atmosphere, gestures, and inner tension.\n' +
    //         'Transform the following scene according to two crucial factors: perplexity and burstiness.\n' +
    //         '* Perplexity refers to the linguistic and structural complexity of the text.\n' +
    //         '* Burstiness reflects variation in sentence length, rhythm, and intensity.\n' +
    //         'Rewrite the text so that it demonstrates a high level of both perplexity and burstiness, while maintaining coherence and meaning.\n' +
    //         'Write in the style of modern literary prose with dialogue and turns of phrase that are natural to the Russian language.\n' +
    //         '\n' +
    //         'Output Format and Style Instructions:\n' +
    //         'Content: Output only the generated literary text, without any introductory phrases, comments, or explanations.\n' +
    //         'Length: The text must contain at least $quantParagraphs$ letters.\n' +
    //         'Dialogue: Every new utterance in the dialogue must start on a new line.\n' +
    //         'Rhythm and Atmosphere: The text must possess a smooth, flowing rhythm and a strong, consistently maintained atmosphere (e.g., melancholy, tension, tranquility, etc.).',
    //     value: ''
    // }
};

export const structEventResult = {
    options: {tags: 'event nowrap deletable incompressible', excludes: 'toggle desc requirements example', numberOfLetters: 500},
    'Событие': {
        options: {tags: 'hide', excludes: 'toggle desc requirements example'},
        desc: 'Краткое описание события',
        value: ''
    },
    'Литературное описаное событие': {
        options: {tags: 'hide', excludes: 'toggle desc requirements example'},
        desc: 'Литературное описаное события',
        requirements:
            'Act as a professional fiction writer.\n' +
            'Transform the *Событие* into a vivid, cinematic literary passage in Russian.\n' +
            'Preserve meaning and sequence, but express everything through imagery, emotion, and natural dialogue.\n' +
            'Show, don’t tell. Add atmosphere, gestures, and inner tension.\n' +
            'Transform the following scene according to two crucial factors: perplexity and burstiness.\n' +
            '* Perplexity refers to the linguistic and structural complexity of the text.\n' +
            '* Burstiness reflects variation in sentence length, rhythm, and intensity.\n' +
            'Rewrite the text so that it demonstrates a high level of both perplexity and burstiness, while maintaining coherence and meaning.\n' +
            'Write in the style of modern literary prose with dialogue and turns of phrase that are natural to the Russian language.\n' +
            '\n' +
            'Output Format and Style Instructions:\n' +
            'Content: Output only the generated literary text, without any introductory phrases, comments, or explanations.\n' +
            'Length: The text must contain at least $numberOfLetters$ letters.\n' +
            'Dialogue: Every new utterance in the dialogue must start on a new line.\n' +
            'Rhythm and Atmosphere: The text must possess a smooth, flowing rhythm and a strong, consistently maintained atmosphere (e.g., melancholy, tension, tranquility, etc.).',
        value: ''
    }
}