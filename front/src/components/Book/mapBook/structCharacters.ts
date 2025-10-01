export const structCharacter = {
    options: {tags: 'character', excludes: 'desc requirements'},
    'Общее описание': {
        options: {excludes: 'toggle', includes: 'value'},
        desc: 'Общее описание персонажа',
        value: ''
    },
    'Основные': {
        options: {excludes: 'Имя кратко', width: '20%'},

        'Имя кратко': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Имя кратко 1-2 слова возможно прозвище',
            value: ''
        },

        'Имя полное': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: '<Фамилия> <Имя> <Отчество>, <2–3 уменьшительно‑ласкательных варианта>, по прозвищу <Короткое прозвище>',
            value: ''
        },
        'Возраст': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Средний, пожилой, молодой, 35 лет, юноша, и т.п.',
            value: ''
        },
        'Цели': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: '<Цели>, <Мотвация>',
            value: ''
        },
        'Жизненная ситуация': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Социальный статус, проблемы',
            value: ''
        },

        'Прошлое': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'История жизни в прошлом',
            value: ''
        },
        'Отношения': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Отношения: друзья, семья, знакомые, коллеги',
            value: ''
        },
        'Интеллект и творчество': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Интеллектуальные и творческие способности',
            value: ''
        },

        'Скрытые цели': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Скрытые цели и мотвация',
            value: ''
        },
        'Мораль': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Моральные/аморальные  аспекты личности',
            value: ''
        },

        'Имеет при себе': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Уже имеет или получил: предметы, умения, информация',
            value: ''
        },
    },
    'Тело/физические характеристики': {
        options: {width: '20%'},
        'Пол': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Пол',
            value: ''
        },
        'Рост': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Рост персонажа (сантиметры, высокий, низкий, и т.д. )',
            value: ''
        },
        'Голова': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Голова, форма, лицо, шея,визуально внеше приятное отталкивающее, визуальные и физические особенности',
            value: ''
        },
        'Руки': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Руки, форма, размер, визуально внешние и физические характеристики и особенности',
            value: ''
        },
        'Ноги': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Ноги, форма, размер, визуально внешние и физические характеристики и особенности',
            value: ''
        },
        'Торс': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Торс, форма, размер, визуально внешние и физические характеристики и особенности',
            value: ''
        },
        'Телосложение': {
            options: {excludes: 'toggle', includes: 'value'}, desc: 'Телосложение',
            value: ''
        },
        'Волосы': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Цвет волос, длина, стрижка/прическа, особенности',
            value: ''
        },
        'Глаза': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Цвет глаз, форма, особенности',
            value: ''
        },
        'Кожа': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Цвет кожи, внешний вид, визуальные особенности',
            value: ''
        },
        'Физические особенности': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Описание физических особенностей могут быть положительные/отрицательные. Близко посаженные глаза, выдющийся подбородок, крючковатые пальцы, ослепительная улыбка и т.д.',
            value: ''
        },
        'Осанка': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Осанка',
            value: ''
        },
        'Шрамы и травмы': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Шрамы и травмы',
            value: ''
        },
        'Татуирвоки': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Татуирвоки',
            value: ''
        },
        'Речь': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Тембр голоса, скорость, манера, речь правильная четкая, особенности, дефекты, акцент и т.д.',
            value: ''
        }
    },
    'Стиль и визуальные особенности': {
        options: {width: '25%'},
        'Одежда': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Предметы одежды: штаны, рубашка',
            value: ''
        },
        'Состояние одежды': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Состояние одежды',
            value: ''
        },
        'Стиль одежды': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Стиль одежды',
            value: ''
        },
        'Аксессуары': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Аксессуары',
            value: ''
        },
    },
    'Эмоциональные и психические аспекты': {
        options: {width: '33.33%'},
        'Привычки': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Привычки, типичные или особенные жесты, характеристика, которая описывает суть персонажа',
            examples:
                'Игра на скрипке, когда думает. ' +
                'Лежать на диване, отвернувшись к стене. ' +
                'Поправлять очки и проводить рукой по шраму. ' +
                'Мысленно подсчитывать «шантажируемый процент». ' +
                'Стучать костяной ногой по палубе. ' +
                'Громко говорить на кокни и небрежно есть. ' +
                'Прямо и бесстрашно смотреть в глаза. ' +
                'Перебирать усы и говорить двусмысленно. ' +
                'Теребить предмет одежды. ' +
                'С азартом «продавать» скучную работу.',
            value: ''
        },
        'Характер': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Тип темперамента: энергичный, целеустремлённый, спокойный, чувствительный',
            value: ''
        },
        'Склонность к сарказму': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Склонность к сарказму',
            value: ''
        },
        'Эмпатия': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Способность к сопереживанию',
            value: ''
        },
        'Фобии': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Список страхов',
            value: ''
        },
        'Харизма влияние на других': {
            options: {excludes: 'toggle', includes: 'value'},
            desc: 'Влияние на других, способность мобилизовать и вести за собой',
            value: ''
        }
    }
};

export const minorCharacter = {
    // requirements: 'В первую очередь описывай персонажей которые еще не описаны',
    desc: 'Второстепенный, но важный для сюжета персонаж.',
    ...structCharacter,
};