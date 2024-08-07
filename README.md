# Серверная часть социальной сети Nirvana
Проект создан с использованием NodeJS, Typescript и Express. В качестве базы данных используется Mongo.
## Особенности
- Пользователи могут создавать персонализированные страницы, загружая обложку, фото профиля, указывая название и создавая персональную ссылку.
- Владельцы страниц могут управлять ими и удалять их вместе со всеми связанными данными.
- Система рейтингов основана на активности пользователей (комментарии, чаты, посты).
- Пользователи могут публиковать посты с текстом и изображениями, настраивать доступ к публикациям.
- Реализованы функции подписки на страницы, добавления в список диалогов, фильтрации ленты новостей.
- Доступен анонимный чат с возможностью перехода в постоянный диалог.
- Предусмотрена персонализация поиска собеседников по различным критериям.

## Запуск проекта
Собранное [клиентское приложение](https://github.com/Ciyoxe/Nirvana_client) должно располагаться в папке `public`
```
npm install
npm run start
```
