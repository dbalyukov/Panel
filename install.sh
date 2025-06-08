#!/bin/bash

# Создание необходимых директорий
sudo mkdir -p /var/www/cloud-panel
sudo mkdir -p /var/www/cloud-panel/client
sudo mkdir -p /var/www/cloud-panel/server

# Копирование файлов
echo "Копирование файлов проекта..."
sudo cp -r client/* /var/www/cloud-panel/client/
sudo cp -r server/* /var/www/cloud-panel/server/
sudo cp package.json /var/www/cloud-panel/
sudo cp panel.conf /etc/nginx/conf.d/

# Установка прав доступа
echo "Настройка прав доступа..."
sudo chown -R www-data:www-data /var/www/cloud-panel
sudo chmod -R 755 /var/www/cloud-panel

# Установка Node.js зависимостей
echo "Установка зависимостей Node.js..."
cd /var/www/cloud-panel
npm install

# Настройка systemd сервиса
echo "Настройка systemd сервиса..."
sudo cp cloud-panel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cloud-panel
sudo systemctl start cloud-panel

# Проверка конфигурации Nginx
echo "Проверка конфигурации Nginx..."
sudo nginx -t

# Перезапуск Nginx
echo "Перезапуск Nginx..."
sudo systemctl restart nginx

# Запуск Node.js приложения
echo "Запуск Node.js приложения..."
cd /var/www/cloud-panel
npm start

echo "Установка завершена!"
echo "Проверьте статус сервиса: sudo systemctl status cloud-panel" 