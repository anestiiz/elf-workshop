# Эльфийский цех — исходники для платформы (v14)

## Посмотреть локально

    cd project
    npm install
    npm run dev          # откроется http://localhost:5173

## Сборка для заливки

    npm run build        # → папка landing-YYYYMMDDHHMM/ — её и заливать

Устроено как лендинги платформы:
- vite.config.js — тот же, что в лендингах (оптимизация картинок, папка landing-…).
- index.html — объявление LP_DATA, BASE_STATIC_URL/ENV через meta data-personal-version,
  скрипт виджета профиля МТС.
- Картинки — в корне public/. В коде они НЕ импортируются: путь строится через
  getStaticUrl('/имя_файла') (src/utils/pathHelper.js), на проде это BASE_STATIC_URL + 'имя_файла'.
- Музыка лежит на статике: structures/source/ny_2027/music_bg.m4a (+ запасной music_bg_fallback.mp3).
- Шрифты MTS Wide / MTS Text / MTS Compact — со static2.mts.ru.
- Хедер — src/components/layout/Header.jsx (+ MTSHeader.jsx), скрыт при ?mymts_brws / ?brws / ?deeplink.
