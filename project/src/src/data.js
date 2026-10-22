// Детали на ленте. id совпадает с именем картинки: part_<id>.png / junk_<id>.png
export const PARTS = {
  glass_ball: { e: '🔮', n: 'Стеклянный шар' },
  gold_cap:   { e: '👑', n: 'Колпачок' },
  paint:      { e: '🎨', n: 'Краски' },
  star:       { e: '⭐', n: 'Звезда' },
  bow:        { e: '🎀', n: 'Бант' },
  candy_cane: { e: '🍭', n: 'Леденец' },
  dough:      { e: '🥣', n: 'Тесто' },
  icing:      { e: '🧁', n: 'Глазурь' },
  candy:      { e: '🍬', n: 'Конфета' },
  antlers:    { e: '🌿', n: 'Рожки' },
  bell:       { e: '🔔', n: 'Колокольчик' },
  red_nose:   { e: '🔴', n: 'Красный нос' },
  snowball:   { e: '❄️', n: 'Снежок' },
  carrot:     { e: '🥕', n: 'Морковка' },
  scarf:      { e: '🧣', n: 'Шарф' },
  wheel:      { e: '🛞', n: 'Колесо' },
  gear:       { e: '⚙️', n: 'Шестерёнка' },
  yarn:       { e: '🧶', n: 'Пряжа' },
  button:     { e: '🔘', n: 'Пуговица' },
  // мусор — не входит ни в один рецепт
  chocolate:  { e: '🍫', n: 'Шоколадка', junk: true },
  cherry:     { e: '🍒', n: 'Вишня', junk: true },
  ladder:     { e: '🪜', n: 'Лесенка', junk: true },
  coal:       { e: '🪨', n: 'Уголёк', junk: true, coal: true },
  // бонусы: не кладутся в ячейку, срабатывают от нажатия
  bonus_freeze: { e: '❄️', n: 'Волшебная снежинка', bonus: 'freeze' },
  bonus_magnet: { e: '🧲', n: 'Магнит', bonus: 'magnet' },
};

// Игрушки: toy_<id>.png. Порядок = порядок открытия по сменам.
export const TOYS = [
  { id: 'ornament',    e: '🪩', n: 'Ёлочный шар', need: ['glass_ball', 'gold_cap', 'paint'] },
  { id: 'wand',        e: '🪄', n: 'Палочка',     need: ['star', 'bow', 'candy_cane'] },
  { id: 'gingerbread', e: '🍪', n: 'Пряник',      need: ['dough', 'icing', 'candy'] },
  { id: 'reindeer',    e: '🦌', n: 'Оленёнок',    need: ['antlers', 'bell', 'red_nose'] },
  { id: 'snowman',     e: '⛄', n: 'Снеговик',    need: ['snowball', 'carrot', 'scarf'] },
  { id: 'car',         e: '🚗', n: 'Машинка',     need: ['wheel', 'gear', 'paint'] },
  { id: 'teddy',       e: '🧸', n: 'Мишка',       need: ['yarn', 'button', 'bow'] },
];

export const BOX_COLORS = ['red', 'green', 'blue', 'purple'];

export const SHIFT_SECONDS = 90;
export const SPEED_STEP_SECONDS = 30; // каждые 30 с лента ускоряется

export function levelCfg(L) {
  const k = 1 + 0.2 * (L - 1);           // чуть круче — меньше уровней
  return {
    level: L,
    toys: TOYS.slice(0, Math.min(TOYS.length, 2 + L)),
    travel: Math.max(5, 10 - 0.6 * (L - 1)),        // секунд на проезд ленты
    patience: Math.max(22, 40 - 3 * (L - 1)),        // секунд на заказ
    orderEvery: Math.max(7, 13 - (L - 1)),           // как часто приходят новые заказы
    maxOrders: 3,
    junk: Math.min(0.24, 0.1 + 0.04 * (L - 1)),      // доля мусора на ленте
    coal: L >= 2,
    stars: [200, 450, 700].map((v) => Math.round((v * k) / 10) * 10),
    // разнообразие вводится постепенно:
    urgent: L >= 2 ? Math.min(0.35, 0.22 + 0.05 * (L - 2)) : 0,    // смена 2+: срочные заказы
    bonusEvery: L >= 3 ? Math.max(14, 22 - 2 * (L - 3)) : 0,        // смена 3+: бонусы на ленте
    hazardEvery: L >= 4 ? Math.max(20, 34 - 4 * (L - 4)) : 0,       // смена 4+: помехи
    hazards: L >= 5 ? ['reverse', 'shuffle'] : ['reverse'],
  };
}
