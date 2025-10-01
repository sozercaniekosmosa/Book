import React, {useEffect, useState} from "react";
import JSONTreeEditor, {CallbackParams, Clb, DefaultIcon, useJsonStore} from "./JSONTreeEditor";
import {structPlot} from "./mapBook/structPlot.ts";
import {useShallow} from "zustand/react/shallow";
import TextWrite from "../Auxiliary/TextWrite.tsx";
import ButtonEx from "../Auxiliary/ButtonEx.tsx";
import clsx from "clsx";
import {generateUID, getID, getObjectByPath, isEmpty, walkAndFilter} from "../../lib/utils.ts";
import {toGPT} from "./general.utils.ts";
import {promptWrite} from "./prompts.ts";
import {eventBus} from "../../lib/events.ts";
import {template} from "../../lib/strings.ts";
import {structPlotArc5, structPlotArc8, structPlotArcHero, structPlotArcTravelCase} from "./mapBook/structArcs.ts";
import {Tooltip} from "../Auxiliary/Tooltip.tsx";
import {minorCharacter} from "./mapBook/structCharacters.ts";
import {structScene} from "./mapBook/structScene.ts";

const CONTROL_BTN = 'opacity-30 hover:opacity-100';
const SET_OPTIONS = 'options desc example requirements variants';
const LIST_KEY_NAME = {desc: 'Описание', example: 'Пример', requirements: 'Требования', variants: 'Варианты'};

// forced update browse
if (+localStorage.getItem('___refresh') < Date.now()) {
    localStorage.setItem('___refresh', String(Date.now() + 3000));
    window.location.reload();
}

const TextEditor = ({toWrite, value, parent, className = ''}) => {
    const [curVal, setCurVal] = useState(value);
    return <TextWrite value={curVal}
                      placeholder={parent?.desc}
                      onChange={e => setCurVal(e.target.value)}
                      onBlur={() => toWrite(curVal)} fitToTextSize={true}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter" && e.ctrlKey) {
                              toWrite(curVal);
                              (e.target as HTMLInputElement).blur();
                              // console.log(parent);
                          }
                      }}
                      className={className}
    />;
};

const InputEditor = ({doInput, value, className = ''}) => {
    const [curVal, setCurVal] = useState(value);

    return <div className="flex flex-row">
        <input value={curVal}
               onChange={e => setCurVal(e.target.value)}
               onBlur={() => doInput(+curVal)}
               onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                   if (e.key === "Enter") {
                       (e.target as HTMLInputElement).blur();
                       doInput(+curVal);
                   }
               }}
               className={'w-[1.5em] ' + className}
        />
    </div>;
};

const Button = (props: any) => <ButtonEx  {...{...props}}>{props.children}</ButtonEx>

const pathHandler = (path: (string | number)[]) => {
    return path.join('.').toLocaleLowerCase().replaceAll(/[^a-zA-Zа-яА-Я.]/g, '-');
}

const isNode = (path: string, name: string) => path.endsWith(name);
const isChildOf = (path: string, name: string) => path.startsWith(name + '.');

//eslint-disable-next-line
const isImmediateChildren = (path: string, name: string) => {
    const len = (name + '.').length;
    if (path.startsWith(name + '.')) {
        return !path.substring(len).includes('.');
    }
};

const deleteFields = (dataStruct: any, arrFields) => {
    return walkAndFilter(dataStruct, ({value}) => {
        arrFields.forEach((field: string) => {
            if (value?.hasOwnProperty(field)) delete value[field];
        });
        return value;
    })
}
/**
 * Подготовка, убирает из верхних узлов все не заполненые с (value=='')
 * @param dataStruct
 */
const prepareStructure = (dataStruct: any) => {


    const dataFilteredEmptyVal = walkAndFilter(dataStruct, ({parent, key, value, hasChild, arrPath}) => {

        if (parent?.hasOwnProperty('value') && parent.value == '') return null;
        if (value?.hasOwnProperty('value') && value.value == '') return null;
        if (key != 'value' && isEmpty(value)) return null; // Убираем пустые узлы типа: {}
        if (value?.hasOwnProperty('value') && typeof value.value != "object" && !value?.options?.tags?.includes('incompressible'))
            return value.value; // Сжимаем объект в каждый узел подставляем значение value

        return value;
    })

    const delFields = deleteFields(dataFilteredEmptyVal, ['options', 'desc', 'example', 'requirements', 'variants']);

    let nodeCharacters = delFields?.['Персонажи'];

    if (Object.keys(nodeCharacters?.['Главный герой']).length == 2) delete nodeCharacters['Главный герой'];
    if (Object.keys(nodeCharacters?.['Антогонист']).length == 2) delete nodeCharacters['Антогонист'];

    // const arrSecondaryChar = Object.entries(nodeCharacters?.['Второстепенные песонажи']) // => в массив
    // const arrFields = ['desc', 'example', 'requirements'];
    // const numberOfCharacters = arrSecondaryChar.length - arrFields.length;
    // const arrSkip = arrSecondaryChar
    //     .filter(([key, _]) => !arrFields.includes(key)) // отбрасываем ненужные
    //     .filter(([_, val]) => Object.keys(val).length == 0) // оставляем только пустые
    //     .map(([key, _]) => key) // мапим только значения

    // if (arrSkip) {
    //     if (numberOfCharacters == arrSkip.length) {
    //         delete nodeCharacters?.['Второстепенные песонажи']
    //     } else {
    //         arrSkip.forEach(key => delete nodeCharacters?.['Второстепенные песонажи'][key]) // чистим пустые
    //     }
    // }

    if (isEmpty(nodeCharacters)) delete dataFilteredEmptyVal?.['Персонажи'];

    // let res = walkAndFilter(dataFilteredEmptyVal, ({parent, key, value, hasChild, arrPath}) => {
    //     if (isEmpty(value)) return null; // Убираем пустые узлы типа: {}
    //     return value;
    // })
    // res = walkAndFilter(res, ({parent, key, value, hasChild, arrPath}) => {
    //     if (isEmpty(value)) return null; // Убираем пустые узлы типа: {}
    //     return value;
    // })

    return dataFilteredEmptyVal;
}

const SceneHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    const sceneName = value?.['Основные']?.['Название кратко']?.value;
    const sceneDesc = value?.['Основные']?.['Название кратко']?.desc;

    const [_val, set_val] = useState<any>(sceneName);


    return <>
        <TextWrite
            className="text-black !w-auto"
            fitToTextSize={true}
            value={_val}

            onChange={(e) => set_val(e.target.value)}
            onBlur={() => useJsonStore.getState().setAtPath(path.concat(['Основные', 'Название кратко', 'value']), _val)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    useJsonStore.getState().setAtPath(path.concat(['Основные', 'Название кратко', 'value']), _val);
                    (e.target as HTMLInputElement).blur();
                }
            }}

            placeholder={sceneDesc}
        />
        <ButtonEx className={clsx(
            "bi-x-lg w-[24px] h-[24px] hover:!bg-red-700 hover:text-white transition",
            CONTROL_BTN
        )}
                  description="Удалить"
                  onConfirm={() => {
                      useJsonStore.getState().removeAtPath(path);
                      // @ts-ignore
                      eventBus.dispatchEvent('set-scroll-top', useJsonStore.getState().temp?.scrollTop);
                  }}/>
    </>;
};
const CharacterHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    const characterName = value?.['Основные']?.['Имя кратко']?.value;
    const characterDesc = value?.['Основные']?.['Имя кратко']?.desc;

    const [_val, set_val] = useState<any>(characterName);


    return <>
        <TextWrite
            className="text-black !w-auto"
            fitToTextSize={true}
            value={_val}

            onChange={(e) => set_val(e.target.value)}
            onBlur={() => useJsonStore.getState().setAtPath(path.concat(['Основные', 'Имя кратко', 'value']), _val)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    useJsonStore.getState().setAtPath(path.concat(['Основные', 'Имя кратко', 'value']), _val);
                    (e.target as HTMLInputElement).blur();
                }
            }}

            placeholder={characterDesc}
        />
        <ButtonEx className={clsx(
            "bi-x-lg w-[24px] h-[24px] hover:!bg-red-700 hover:text-white transition",
            CONTROL_BTN
        )}
                  description="Удалить"
                  onConfirm={() => useJsonStore.getState().removeAtPath(path)}/>
    </>;
};
const DefaultHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    const strPath = pathHandler(path);
    const isCharacterParent = isNode(strPath, 'персонажи.второстепенные-песонажи');
    const isScenes = isChildOf(strPath, 'сюжетная-арка') && deep == 2;
    const isSceneItem = isChildOf(strPath, 'сюжетная-арка') && deep == 3;
    const isPlotArc = isNode(strPath, 'сюжетная-арка')
    const isPlotArcItem = value?.options?.tags?.includes('plot-arc');

    let isOptions = LIST_KEY_NAME[keyName];
    let name: any = isOptions ?? keyName;
    if (isSceneItem) name = null; // Убираем имя заголовка для сцены

    return <>
        <div className="text-nowrap">{name}</div>
        {/*чистим заголовок для сцены*/}
        {isPlotArc && // Сюжетная арка
            <div className="flex flex-row w-fit gap-1 [&>*]:ring-1 pl-1">
                <>{[[structPlotArc5, '5-Актов'], [structPlotArc8, '8-Актов'], [structPlotArcHero, 'Герой'], [structPlotArcTravelCase, 'Попаданец']]
                    .map(([plot, plotName], i) =>
                        <ButtonEx
                            key={i}
                            className={clsx(plotName == value?.options?.name && 'bg-gray-300', 'h-[19px]', CONTROL_BTN)}
                            description={"Изменить на " + plotName}
                            onConfirm={() => props.toWrite(plot)}
                            disabled={plotName == value?.options?.name}
                        >
                            {plotName as string}
                        </ButtonEx>)}</>
            </div>
        }
        {isCharacterParent && // Персонажи кнопка [+]
            <ButtonEx className={clsx("bi-plus-circle w-[24px] h-[24px]", CONTROL_BTN)}
                      onClick={() => useJsonStore.getState().mergeAtPath(path, {['Персонаж-' + getID()]: minorCharacter})}/>
        }
        {isScenes && // Сцены кнопка [+]
            <ButtonEx className={clsx("bi-plus-circle w-[24px] h-[24px]", CONTROL_BTN)}
                      onClick={() => useJsonStore.getState().mergeAtPath(path, {['Сцена-' + getID()]: structScene})}/>
        }
        {isPlotArcItem && <div className="flex flex-row gap-1">
            <Tooltip text={"Количество сцен"} direction={"right"} className={clsx(
                'text-gray-500', CONTROL_BTN)}>
                <InputEditor
                    className={"text-center"}
                    value={value.options.quantScene}
                    doInput={(val: number) => {
                        if (isNaN(val)) val = 3;
                        toWrite(val, [...path, 'options', 'quantScene']);
                    }}
                />
            </Tooltip>
            <ButtonEx className={clsx("bi-stack text-[11px]", CONTROL_BTN)} onClick={() => {
                const arr = value.value.split('\n')
                if (Array.isArray(arr)) {
                    arr.forEach(item => {
                        let _structScene = JSON.parse(JSON.stringify(structScene));
                        _structScene['Описание сцены'].value = item;
                        useJsonStore.getState().mergeAtPath(path, {['Сцена-' + getID()]: _structScene})
                    })
                }
            }}/>
        </div>}
        {!isOptions && <ButtonEx // Кнопка очистить поля
            className={clsx("bi-eraser-fill w-[24px] h-[24px] hover:!bg-sky-600 hover:text-white transition", CONTROL_BTN)}
            description="Очистить"
            onConfirm={() => walkAndFilter(value, ({key, value, arrPath}) => {
                key == 'value' && useJsonStore.getState().setAtPath(path.concat(arrPath), '');
                return value;
            })}/>
        }
    </>;
};
const GPTHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    let total = 0;

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type, data}) => {
            if (type == 'gpt-progress-rewrite') {
                const numb = data.split('value').length - 1
                const prc = numb / total * 100;
                if (!Number.isFinite(prc)) return;
                eventBus.dispatchEvent('message-local', {type: 'progress', data: numb / total * 100})
            }
        });
    }, []);

    return <>
        <Button className={clsx('bi-stars w-[24px] h-[24px]', CONTROL_BTN)} onAction={async () => {

            let source = JSON.parse(JSON.stringify(useJsonStore.getState().json));
            source = prepareStructure(source);

            let target = JSON.parse(JSON.stringify(value));

            const [obj, key] = getObjectByPath(source, path as string[]);
            obj[key] = target;

            const listPathSrc = {};
            source = walkAndFilter(source, ({parent, key, value, hasChild, arrPath}) => {
                if (value?.hasOwnProperty('value') && !value.value && typeof value.value !== "object") {

                    const id = generateUID();
                    listPathSrc[id] = [...arrPath, 'value'];
                    value.id = id;

                    if (value?.hasOwnProperty('options')) { // Подстановка значений
                        const strValue = JSON.stringify(value);
                        const _strValue = template(strValue, {...value.options});
                        value = JSON.parse(_strValue);
                    }

                }
                return value;
            });

            source = deleteFields(source, ['options']);
            total = Object.keys(listPathSrc).length;

            source.uid = Date.now();
            let resultStruct = await toGPT({prompt: promptWrite, source, path: path.join('.')});

            console.log(listPathSrc);
            console.log(source, target);

            console.log(resultStruct);

            total = 0;
            eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})

            walkAndFilter(resultStruct, ({parent, key, value, hasChild, arrPath}) => {
                if (value?.hasOwnProperty('id')) {
                    const id = value.id;
                    let val = value.value.replaceAll(/\n\n/g, '\n');
                    const path = listPathSrc[id];
                    if (typeof val == 'string')
                        toWrite(val, path)
                    else
                        console.error('Тип результата не соответствует', val);

                }
                return value;
            });

        }}/>
        <Button className={clsx('bi-arrows-expand w-[24px] h-[24px]', CONTROL_BTN)} onAction={async () => {

            // debugger;
            let source = {};
            source = JSON.parse(JSON.stringify(useJsonStore.getState().json));
            source = prepareStructure(source);

            let target = JSON.parse(JSON.stringify(value));

            const _value = target.value;
            const countWords = _value.split(' ').length; // Посчитаем слова


            const neg = 'Герой жует бутерброд, а в нём оказывается дохлый таракан. ' + 'Во время застолья у него застревает кусок еды между зубами, и все это замечают. ' + 'Он случайно чихает в момент, когда кто-то протягивает ему руку. ' + 'У героя рвутся штаны на виду у большого количества людей. ' + 'Он наступает в собачьи экскременты и тащит их на обуви в помещение. ' + 'В транспорте к нему прижимается человек с сильным запахом пота. ' + 'Герой приходит в гости и обнаруживает в чашке чая чужой волос. ' + 'Его громко тошнит на людной вечеринке. ' + 'У него прилипает жвачка к волосам. ' + 'Во время публичного выступления у него начинает течь нос. ' + 'Герой случайно отправляет личное сообщение не тому человеку. ' + 'Его зовут на сцену, а у него оказывается ширинка расстёгнута. ' + 'В автобусе он пытается удержаться за поручень, но хватает чью-то липкую руку. ' + 'Герой падает в грязную лужу прямо перед знакомым человеком. ' + 'В ресторане он обнаруживает в супе насекомое. ' + 'Герой неловко пердит в тишине, и все это слышат. ' + 'Он случайно проливает на себя горячий кофе и пахнет обожжённой тканью. ' + 'В лифте у кого-то разливается молоко, и запах быстро становится невыносимым. ' + 'Герой забывает выключить микрофон и все слышат его личный разговор. ' + 'У него ломается зуб во время важного свидания. ' + 'Герой случайно наступает на чей-то каблук и отрывает его. ' + 'Его подвозят, а в машине резкий запах рыбы или тухлой еды. ' + 'Он замечает, что у него вся рубашка в потных пятнах именно в момент приветствия. ' + 'Герой слышит, как у соседей занимаются интимом, и не может заснуть. ' + 'Он поднимает упавшую монету, а она оказывается вся в чем-то липком.'

            const pos = 'Герой помогает слабому — например, заступается за ребёнка или животное. ' + 'Неожиданный талант — герой вдруг проявляет скрытую способность (поёт, рисует, играет), удивляя и вдохновляя окружающих. ' + 'Победа над собой — герой преодолевает внутренний страх или сомнение. ' + 'Маленькая победа — успешно чинит что-то своими руками, что казалось безнадёжным. ' + 'Приятный сюрприз для других — готовит подарок или устраивает праздник. ' + 'Искренняя благодарность — кто-то благодарит героя от всего сердца за помощь. ' + 'Непоколебимая честность — он говорит правду в трудной ситуации, хотя мог бы промолчать. ' + 'Случайная доброта — помогает незнакомцу без всякой выгоды. ' + 'Творческое решение — находит нестандартный выход из сложной ситуации. ' + 'Заслуженное признание — его труд замечают и ценят. ' + 'Неожиданный успех — выигрывает конкурс, сдаёт трудный экзамен или получает похвалу. ' + 'Улыбка ребёнка — герой делает что-то, от чего ребёнок искренне радуется. ' + 'Проявление мужества — защищает друга, рискуя собой. ' + 'Тёплый жест — делится последним куском хлеба или отдаёт свою куртку замёрзшему. ' + 'Смех и радость — смешит других своим остроумием или неловкой, но доброй ситуацией. ' + 'Неожиданный союзник — животное или человек доверяет герою с первого взгляда. ' + 'Заслуженное восхищение — он показывает мастерство в деле, которому учился долго. ' + 'Возвращение надежды — герой вдохновляет другого персонажа, у которого "опустились руки". ' + 'Трогательная забота — лечит, ухаживает или поддерживает кого-то в болезни или беде. ' + 'Красивый жест великодушия — прощает врага или делится успехом с другими. ' + 'Озарение — герой неожиданно понимает что-то важное, что открывает дорогу к счастью. ' + 'Детская радость — делает что-то наивное и простое (например, запускает воздушного змея), и это заражает радостью всех вокруг. ' + 'Маленькое чудо — случайно оказывается в нужном месте и спасает ситуацию. ' + 'Верность слову — исполняет обещание, несмотря на трудности.'

            target.example = '';
            target.value = '';

            // let promptRequirements = template('Увеличить объем текста который в скобках до $x2Words$ слов сохраняя смысл', {
            // let promptRequirements = template('Уменьшить объем текста который в скобках до $halfWords$ слов сохраняя смысл', {
            let promptRequirements = template(
                //     'Перепиши текст в скобках так, чтобы он сохранил смысл, но звучал доброжелательно, мягко и позитивно. ' +
                //     'Убирай резкость и грубость, заменяй на вежливые, ободряющие слова. ' +
                //     'Критику делай конструктивной и уважительной. ' +
                //     'Приказы превращай в дружеские рекомендации. ' +
                //     'Итоговый стиль: тёплый, ясный, дружелюбный.',

                //     'Перепиши текст в скобках так, чтобы он сохранил смысл, но звучал максимально злым, ' +
                //     'агрессивным и враждебным. Замени нейтральные слова на жесткие с ' +
                //     'отрицательной окраской, добавь презрение, сарказм и холодную агрессию.',

                //     'Перепиши текст в скобках сохранияя сюжет, но добавляяя для персонажа нелепую/неприятную ситуацию/событие, ' +
                //     'которое вызывают у читателя отвращение, неловкость, стыд, брезгливость или раздражение. Используй узнаваемые ситуации: ' +
                //     'падения, опаздания, помощь которая оказывает персонаж, но та обрачивается болшей бедой, досадные ошибки, социальные промахи, неловкие ситуации. ' +
                //     'Делай вставки правдоподобными и естественными, чтобы они усиливали эмоциональный дискомфорт без разрушения логики повествования',

                'Сохраняя сюжет, добавь удачную/приятную ситуацию/событие, ' +
                'вызывающе радость, воодушевление, гордость, симпатию или восхищение. Используй узнаваемые ситуации. ' +
                'неожиданные везения, своевременные появления, помощь, которую персонаж оказывает и которая приносит значительную пользу, счастливые совпадения, удачные решения, социальные триумфы, вдохновляющие моменты. ' +
                'Делай вставки правдоподобными и естественными, чтобы они усиливали положительный эмоциональный эффект без разрушения логики повествования, для этого текста: ',

                {
                    halfWords: Math.trunc(countWords * .5),
                    x2Words: countWords * 2,
                });
            target.requirements =
                promptRequirements + ' ' +
                _value // Добвляем текущее значение value в промпт
            // + (target.requirements ?? '');

            const [obj, key] = getObjectByPath(source, path as string[]);
            obj[key] = target;
            // source = target;

            const listPathSrc = {};
            source = walkAndFilter(source, ({parent, key, value, hasChild, arrPath}) => {
                if (value?.hasOwnProperty('value') && !value.value && typeof value.value !== "object") {

                    const id = generateUID();
                    listPathSrc[id] = [...arrPath, 'value'];
                    value.id = id;

                    if (value?.hasOwnProperty('options')) { // Подстановка значений
                        const strValue = JSON.stringify(value);
                        const _strValue = template(strValue, {...value.options});
                        value = JSON.parse(_strValue);
                    }

                }
                return value;
            });

            source = deleteFields(source, ['options']);
            total = Object.keys(listPathSrc).length;
            // console.log(source, target);
            // return

            // @ts-ignore
            source.uid = Date.now();
            let resultStruct = await toGPT({prompt: promptWrite, source, path: path.join('.')});

            console.log(listPathSrc);
            console.log(source, target);

            console.log(resultStruct);

            total = 0;
            eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})

            walkAndFilter(resultStruct, ({parent, key, value, hasChild, arrPath}) => {
                if (value?.hasOwnProperty('id')) {
                    const id = value.id;
                    let val = value.value.replaceAll(/\n\n/g, '\n');
                    const path = listPathSrc[id];
                    if (typeof val == 'string')
                        toWrite(val, path)
                    else
                        console.error('Тип результата не соответствует', val);

                }
                return value;
            });

        }}/>
    </>
};

export const StoryEditor: React.FC = () => {

    const {change, reset, json, toggleCollapse} = useJsonStore(useShallow((s) => ({
        change: s.setAtPath,
        reset: s.reset,
        json: s.json,
        toggleCollapse: s.toggleCollapse,
    })));

    const clbEditorValue: Clb = (props) => {
        const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;
        const key = LIST_KEY_NAME[keyName];
        const isOptionsShowed = parent?.options?.forcedIncludes
        if (key) {
            return <div>
                {key}
                <TextEditor {...props}/>
            </div>
        }
        if (Array.isArray(parent)) {
            return <div>
                <TextEditor {...props}/>
            </div>
        }
        return <TextEditor {...props} className={clsx(
            isOptionsShowed && 'pointer-events-none opacity-50'
        )}/>
    }

    const clbHeader: Clb = (props) => {

        const {
            children, header, parent, toWrite,

            collapsed, deep, keyName, path, toSwitch, value,
        } = props;
        const arrSize = [14, 14, 14];

        const strPath = pathHandler(path);

        const options = value?.options;

        const isToggle = !options?.excludes?.includes('toggle') && Object.keys(value).filter(it => !SET_OPTIONS.includes(it)).length > 0;

        const isCharacterHeader = (isChildOf(strPath, 'персонажи.второстепенные-песонажи') && options?.tags == 'character');
        const isSceneHeader = (isChildOf(strPath, 'сюжетная-арка') && options?.tags == 'scene');
        const isDefaultHeader = !isCharacterHeader;

        let isOptions = LIST_KEY_NAME[keyName];

        return <div className={clsx('flex items-center gap-0.5')}
                    style={{fontSize: arrSize?.[deep] ?? 14 + 'px'}}
                    onMouseDown={(e) => {
                        if (e.button != 1) return;
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.button == 1) (async () => await navigator.clipboard.writeText(pathHandler(path)))();
                    }}
        >
            {isToggle &&
                <button type="button" onClick={() => toSwitch()} className="p-1 rounded hover:bg-gray-100">
                    <DefaultIcon collapse={collapsed}/>
                </button>
            }
            {isCharacterHeader && <CharacterHeader {...props}/>}
            {isSceneHeader && <SceneHeader {...props}/>}
            {isDefaultHeader && <DefaultHeader {...props}/>}

            {!isOptions && <GPTHeader {...props}/>}
            {!isOptions && <div className="justify-items-end flex-1">
                <Button className={clsx(
                    value?.options?.forcedIncludes ? 'bi-gear-fill' : 'bi-gear',
                    'w-[24px] h-[24px]',
                    CONTROL_BTN,
                )} onClick={() => {
                    const _path = [...path, 'options', 'forcedIncludes'];
                    change(_path, value?.options?.forcedIncludes ? '' : SET_OPTIONS);
                }}/>
            </div>}
            {/*<ButtonEx className="bi-x-lg w-[24px] h-[24px]" description="Удалить" onConfirm={() => remove(path)}/>*/}
        </div>
    }

    const clbContainer: Clb = (props) => {

        const {children, collapsed, deep, header, keyName, parent, path, toWrite, value} = props;
        const isWrap: boolean = Boolean(value?.options?.width);
        const width: string = parent?.options?.width;

        const strPath = pathHandler(path);

        if (deep == 0) {
            return <div className="">
                {children}
            </div>
        }

        if (isWrap) {
            return <>
                {header}
                <div className="flex flex-row flex-wrap pl-2 border-l ml-2">
                    {children}
                </div>
            </>
        }

        if (width) {
            return <div className="-outline-offset-3 outline-1 outline-gray-200 rounded-[5px] px-2 pt-1 pb-0.5"
                        style={{width}}>
                {header}{children}
            </div>
        }


        return <div className={clsx(LIST_KEY_NAME[keyName] && 'mb-1')}>
            {header}
            <div className={clsx(
                "pl-2 border-l ml-2"
            )}>
                {children}
            </div>
        </div>

        // return null;
    };

    return (
        <div className="p-4">

            <div className="mb-3 flex gap-2">
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => reset()}
                >
                    Reset store
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                        const arr = []

                        const _json = JSON.parse(JSON.stringify(structPlot));

                        arr.forEach(([path, value]) => {
                            const [obj, key] = getObjectByPath(_json, path as string[]);
                            obj[key] = value;
                        })
                        change([], _json);
                        // console.log(_json)

                    }}
                >
                    load
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {

                        const arr = [];
                        walkAndFilter(useJsonStore.getState().json,
                            ({parent, key, value, hasChild, arrPath}) => {

                                if (!hasChild && key == 'value' && value) arr.push([arrPath, value]);

                                return value;
                            })

                        console.log(arr)
                    }}
                >
                    save
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                        // toggle collapse for root -> items
                        toggleCollapse(['Основные']);
                        toggleCollapse(['Вспомогательные']);
                        toggleCollapse(['Персонажи']);
                        toggleCollapse(['Сюжетная арка']);
                    }}
                >
                    Toggle "items" collapse
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {

                        const dataFilteredEmptyVal = walkAndFilter(useJsonStore.getState().json,
                            ({parent, key, value, hasChild, arrPath}) => {

                                if (parent?.hasOwnProperty('value') && parent.value == '') return null;
                                if (value?.hasOwnProperty('value') && value.value == '') return null;
                                if (value?.hasOwnProperty('options')) delete value.options
                                if (value?.hasOwnProperty('desc')) delete value.desc
                                if (value?.hasOwnProperty('example')) delete value.example
                                if (value?.hasOwnProperty('requirements')) delete value.requirements
                                if (value?.hasOwnProperty('variants')) delete value.variants
                                if (key != 'value' && isEmpty(value)) return null; // Убираем пустые узлы типа: {}
                                if (value?.hasOwnProperty('value') && typeof value.value != "object") return value.value; // Сжимаем объект в каждый узел подставляем значение value

                                return value;
                            })

                        walkAndFilter(dataFilteredEmptyVal, ({parent, key, value, hasChild, arrPath}) => {

                            // const [obj, key] = getObjectByPath(resultStruct, shortPath);

                            if (typeof value != "object") {
                                // console.log(arrPath, value)
                                useJsonStore.getState().setAtPath([...arrPath, 'value'], value);
                            }

                            return value;
                        })

                        // console.log(dataFilteredEmptyVal)
                    }}
                >
                    exp
                </button>
            </div>

            <JSONTreeEditor
                jsonData={structPlot}
                clbEditorValue={clbEditorValue}
                clbContainer={clbContainer}
                clbHeader={clbHeader}
            />

            <div className="h-[100vh]"></div>
        </div>
    );
};