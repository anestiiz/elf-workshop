// Короткое обучение «руками»: 3 действия + финальная карточка. Никаких длинных текстов —
// игрок сразу делает то, что потом будет делать в смене.
// wait — условие перехода к следующему шагу, button — шаг листается кнопкой, enter — что подготовить на шаге.
export const TUT = [
  { id: 'build', target: 'belts', hint: 'drag', enter: { order: 'wand' },
    title: 'Собери игрушку',
    text: 'Перетащи с ленты в одну ячейку 3 детали из заказа.',
    wait: (g) => g.slots.some((s) => s.state === 'toy') },
  { id: 'deliver', target: 'slotToy',
    text: 'Готово! Нажми на игрушку — она уедет в подарок.',
    wait: (g) => g.delivered >= 1, after: 1.6 },
  { id: 'junk', target: 'junkFix', enter: { junk: true },
    text: 'Ой, брак! Нажми на корзину, а потом на ячейку с браком.',
    wait: (g) => !g.slots.some((s) => s.state === 'junk') },
  { id: 'done', pos: 'center', button: 'Поехали!',
    title: 'Ты готов!',
    text: 'Успевай собрать каждый заказ, пока не кончилась полоска. Лента будет ускоряться.' },
];
export const TUT_JUNK_STEP = TUT.findIndex((s) => s.id === 'junk');
