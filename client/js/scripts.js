// scripts.js - Полная реализация с правильными API путями

// Константы
const API_BASE_URL = '/api'; // Используем относительный путь
const AUTH_ENDPOINT = `${API_BASE_URL}/auth/login`;
const USERS_ENDPOINT = `${API_BASE_URL}/users`;
const REQUEST_TIMEOUT = 10000; // 10 секунд

// DOM элементы
const authForm = document.getElementById('authForm');
const appContent = document.getElementById('appContent');
const loginInput = document.getElementById('login');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const authError = document.getElementById('authError');
const usersTableBody = document.getElementById('usersTableBody');
const addUserBtn = document.getElementById('addUserBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Состояние приложения
let currentEditId = null;
let editMode = false;
let authToken = localStorage.getItem('authToken');

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupEventListeners();
});

// ==================== АВТОРИЗАЦИЯ ====================

// Функция для выполнения запросов с таймаутом
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Превышено время ожидания ответа от сервера');
        }
        throw error;
    }
}

async function handleLogin() {
    const login = loginInput.value.trim();
    const password = passwordInput.value.trim();

    if (!login || !password) {
        showAuthError('Введите логин и пароль');
        return;
    }

    try {
        showLoader();
        const response = await fetchWithTimeout(AUTH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ login, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка авторизации');
        }

        const { token, user } = await response.json();
        authToken = token;
        localStorage.setItem('authToken', token);
        showAppContent();
        await loadAndRenderUsers();
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        showAuthError(error.message || 'Ошибка сети. Проверьте подключение к интернету.');
        passwordInput.value = '';
    } finally {
        hideLoader();
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('authToken');
    showAuthForm();
}

function checkAuthState() {
    if (authToken) {
        showAppContent();
        loadAndRenderUsers();
    } else {
        showAuthForm();
    }
}

function showAuthForm() {
    authForm.classList.remove('hidden');
    appContent.classList.add('hidden');
    loginInput.focus();
}

function showAppContent() {
    authForm.classList.add('hidden');
    appContent.classList.remove('hidden');
}

function showAuthError(message) {
    authError.textContent = message;
    setTimeout(() => authError.textContent = '', 5000);
}

// ==================== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ====================

async function loadAndRenderUsers() {
    try {
        showLoader();
        const users = await fetchUsers();
        renderUsers(users);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showError(error.message || 'Не удалось загрузить пользователей');
        if (error.message.includes('401')) handleLogout();
    } finally {
        hideLoader();
    }
}

async function fetchUsers() {
    const response = await fetchWithTimeout(USERS_ENDPOINT, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            handleLogout();
            throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
        }
        throw new Error(await response.text());
    }

    return await response.json();
}

function renderUsers(users) {
    usersTableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    users.forEach(user => {
        const row = document.createElement('tr');
        row.dataset.id = user.id;
        
        row.innerHTML = `
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.role)}</td>
            <td class="actions">
                <button class="btn btn-sm btn-edit">Редактировать</button>
                <button class="btn btn-sm btn-delete">Удалить</button>
            </td>
        `;
        
        fragment.appendChild(row);
    });

    usersTableBody.appendChild(fragment);
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (addUserBtn) addUserBtn.addEventListener('click', handleAddUser);
    
    // Делегирование событий для таблицы
    usersTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) handleEdit(e);
        if (e.target.classList.contains('btn-delete')) handleDelete(e);
    });
}

function handleAddUser() {
    if (editMode) {
        alert('Завершите текущее редактирование');
        return;
    }
    
    editMode = true;
    currentEditId = null;
    
    const newRow = document.createElement('tr');
    newRow.className = 'edit-row';
    newRow.innerHTML = `
        <td><input type="text" class="form-control" placeholder="ФИО" required></td>
        <td><input type="email" class="form-control" placeholder="Email" required></td>
        <td>
            <select class="form-control form-select" required>
                <option value="" disabled selected>Выберите роль</option>
                <option>Администратор</option>
                <option>Редактор</option>
                <option>Гость</option>
            </select>
        </td>
        <td class="actions">
            <button class="btn btn-sm btn-save">Сохранить</button>
            <button class="btn btn-sm btn-cancel">Отмена</button>
        </td>
    `;
    
    usersTableBody.prepend(newRow);
    newRow.querySelector('.btn-save').addEventListener('click', handleSave);
    newRow.querySelector('.btn-cancel').addEventListener('click', cancelEdit);
}

// ... (остальные функции handleEdit, handleSave, handleDelete, cancelEdit)

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loader);
}

function hideLoader() {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.remove();
    }
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'alert alert-danger';
    errorElement.textContent = message;
    
    const card = document.querySelector('.card');
    if (card) card.prepend(errorElement);
    
    setTimeout(() => errorElement.remove(), 5000);
}