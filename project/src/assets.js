// Картинки и музыка лежат в корне public/ и НЕ импортируются в JS.
// Путь строится через getStaticUrl: на проде это window.BASE_STATIC_URL + 'имя_файла',
// в DEV — '/имя_файла'. Так же, как в лендингах платформы.
import { getStaticUrl } from './utils/pathHelper';

const FILES = ['belt_frame.png','btn_snow_left.png','btn_snow_right.png','btn_snow_wide.png','belt_tile.png','bench.png','bg.png','box_blue.png','box_green.png','box_open.png','box_purple.png','box_red.png','elf_happy.png','elf_idle.png','elf_panic.png','hopper.png','junk.png','junk_cherry.png','junk_chocolate.png','junk_coal.png','junk_ladder.png','loader.png','part_antlers.png','part_bell.png','part_bow.png','part_button.png','part_candy.png','part_candy_cane.png','part_carrot.png','part_dough.png','part_gear.png','part_glass_ball.png','part_gold_cap.png','part_icing.png','part_paint.png','part_red_nose.png','part_scarf.png','part_snowball.png','part_star.png','part_wheel.png','part_yarn.png','slot.png','toy_car.png','toy_gingerbread.png','toy_ornament.png','toy_reindeer.png','toy_snowman.png','toy_teddy.png','toy_wand.png','trash.png','ui_clock.png','ui_star.png'];

export const ASSETS = Object.fromEntries(
  FILES.map((f) => [f.replace(/\.(webp|png|jpg|jpeg|svg|mp3|m4a)$/, ''), getStaticUrl(`/${f}`)]),
);

// музыка лежит на статике отдельно (structures/source/ny_2027): основной m4a (AAC) и запасной mp3
ASSETS.music_bg = 'https://static2.mts.ru/structures/source/ny_2027/music_bg.m4a';
ASSETS.music_bg_fallback = 'https://static2.mts.ru/structures/source/ny_2027/music_bg_fallback.mp3';
