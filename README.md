# Cloud Panel - Панель управления облачными ресурсами

Современная панель управления для мониторинга и управления облачными ресурсами. Проект включает в себя веб-интерфейс и API для взаимодействия с облачной инфраструктурой.

## Особенности

- Современный адаптивный интерфейс
- Безопасная аутентификация и авторизация
- Мониторинг облачных ресурсов
- Управление виртуальной инфраструктурой
- Защита от DDoS-атак
- Балансировка нагрузки
- Объектное хранилище
- WAF (Web Application Firewall)

## Технологии

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Адаптивный дизайн
- Современные веб-стандарты

### Backend
- Node.js
- Express.js
- MySQL
- JWT аутентификация

### Инфраструктура
- Nginx
- SSL/TLS
- Docker (опционально)

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/cloud-panel.git
cd cloud-panel
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл .env в корневой директории:
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=cloud_panel
JWT_SECRET=your_jwt_secret
```

4. Запустите миграции базы данных:
```bash
npm run migrate
```

5. Запустите сервер разработки:
```bash
npm run dev
```

## Развертывание

1. Настройте Nginx:
```bash
sudo cp nginx.conf /etc/nginx/conf.d/cloud-panel.conf
sudo nginx -t
sudo systemctl restart nginx
```

2. Настройте SSL сертификаты:
```bash
sudo mkdir -p /etc/nginx/ssl
sudo cp your-cert.crt /etc/nginx/ssl/cloud-panel.crt
sudo cp your-key.key /etc/nginx/ssl/cloud-panel.key
```

3. Запустите продакшн сервер:
```bash
npm start
```

## Структура проекта

```
cloud-panel/
├── client/              # Frontend файлы
│   ├── js/             # JavaScript файлы
│   ├── css/            # Стили
│   └── index.html      # Главная страница
├── server/             # Backend файлы
│   ├── routes/         # Маршруты API
│   ├── migrations/     # Миграции БД
│   └── utils/          # Утилиты
├── nginx.conf          # Конфигурация Nginx
└── package.json        # Зависимости и скрипты
```

## Безопасность

- Все запросы проходят через HTTPS
- Защита от XSS и CSRF атак
- Rate limiting для API
- Безопасные заголовки HTTP
- JWT аутентификация
- Защита от DDoS

## Лицензия

MIT

## Авторы

- Ваше имя - [GitHub](https://github.com/your-username)

## Поддержка

Если у вас возникли проблемы или есть предложения по улучшению, создайте issue в репозитории проекта.

## Важно для подключения к базе данных

- Для корректной работы используйте MariaDB или MySQL, запущенные на этом сервере.
- В файле server/config.js host для базы данных жёстко прописан как '127.0.0.1'.
- Не используйте DB_HOST=localhost, чтобы избежать проблем с IPv6.
- Убедитесь, что MariaDB/MySQL запущен и слушает порт 3306 на 127.0.0.1. 