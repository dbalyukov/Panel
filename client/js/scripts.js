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
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');

// Состояние приложения
let currentEditId = null;
let editMode = false;
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupEventListeners();
    setupSidebarNavigation();
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
        currentUser = user;
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
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
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showAuthForm();
}

function checkAuthState() {
    if (authToken) {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try { currentUser = JSON.parse(userStr); } catch { currentUser = null; }
        }
        showAppContent();
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
    updateUserHeader();
    showSection('dashboard');
}

function updateUserHeader() {
    const userNameSpan = document.querySelector('.user-name');
    const userAvatarDiv = document.getElementById('userMenuBtn');
    if (!currentUser) return;
    userNameSpan.textContent = currentUser.name;
    userAvatarDiv.textContent = getInitials(currentUser.name);
}

function getInitials(name) {
    if (!name) return '';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
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
    if (!usersTableBody) return;
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
    if (addUserBtn) addUserBtn.addEventListener('click', handleAddUser);
    if (usersTableBody) {
        usersTableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-edit')) handleEdit(e);
            if (e.target.classList.contains('btn-delete')) handleDelete(e);
        });
    }
    
    // Обработчики для выпадающего меню
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', toggleUserDropdown);
    }
    
    // Закрытие выпадающего меню при клике вне его
    document.addEventListener('click', (e) => {
        if (userDropdown && userDropdown.classList.contains('show') && 
            !userDropdown.contains(e.target) && 
            !userMenuBtn.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });
    // Делегируем клик по кнопке выхода
    if (userDropdown) {
        userDropdown.addEventListener('click', (e) => {
            if (e.target.closest('#logoutBtn')) {
                handleLogout();
                userDropdown.classList.remove('show');
            }
        });
    }
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

// ==================== НАВИГАЦИЯ ПО РАЗДЕЛАМ ====================

function setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            showSection(section);
        });
    });
}

function showSection(section) {
    const pageTitle = document.getElementById('pageTitle');
    const dynamicContent = document.getElementById('dynamicContent');
    switch (section) {
        case 'dashboard':
            pageTitle.textContent = 'Панель управления';
            dynamicContent.innerHTML = `
                <div class="dashboard-block">
                    <h2 style="margin-bottom: 24px;">Обзор ресурсов</h2>
                    <div class="dashboard-cards">
                        <div class="dashboard-card">
                            <div class="dashboard-card-title"><i class='fas fa-server'></i> Виртуальные машины</div>
                            <div class="dashboard-card-value">3 кластера, 12 VM</div>
                            <div class="dashboard-card-desc">CPU: 24 vCPU, RAM: 96 ГБ, Диск: 2 ТБ</div>
                        </div>
                        <div class="dashboard-card">
                            <div class="dashboard-card-title"><i class='fas fa-database'></i> Базы данных</div>
                            <div class="dashboard-card-value">2 кластера</div>
                            <div class="dashboard-card-desc">CPU: 8 vCPU, RAM: 32 ГБ, Диск: 500 ГБ</div>
                        </div>
                        <div class="dashboard-card">
                            <div class="dashboard-card-title"><i class='fas fa-hdd'></i> Объектное хранилище</div>
                            <div class="dashboard-card-value">1 бакет</div>
                            <div class="dashboard-card-desc">Использовано: 120 ГБ из 1 ТБ</div>
                        </div>
                        <div class="dashboard-card">
                            <div class="dashboard-card-title"><i class='fas fa-shield-alt'></i> WAF</div>
                            <div class="dashboard-card-value">1 активный</div>
                            <div class="dashboard-card-desc">Защищено: 2 сайта</div>
                        </div>
                        <div class="dashboard-card">
                            <div class="dashboard-card-title"><i class='fas fa-bolt'></i> DDoS</div>
                            <div class="dashboard-card-value">Включено</div>
                            <div class="dashboard-card-desc">Последняя атака: 2 дня назад</div>
                        </div>
                        <div class="dashboard-card">
                            <div class="dashboard-card-title"><i class='fas fa-network-wired'></i> Балансировщики</div>
                            <div class="dashboard-card-value">1 балансировщик</div>
                            <div class="dashboard-card-desc">Трафик: 120 Мбит/с</div>
                        </div>
                        <div class="dashboard-card">
                            <div class="dashboard-card-title"><i class='fas fa-chart-line'></i> Мониторинг</div>
                            <div class="dashboard-card-value">Активен</div>
                            <div class="dashboard-card-desc">Последний инцидент: 5 дней назад</div>
                        </div>
                    </div>
                </div>
            `;
            loadAndRenderUsers();
            break;
        case 'infrastructure':
            pageTitle.textContent = 'Виртуальная инфраструктура';
            renderClustersList();
            break;
        case 'databases':
            pageTitle.textContent = 'Базы данных';
            dynamicContent.innerHTML = `
                <div class="empty-cluster-block">
                    <div class="empty-cluster-illustration">
                        <i class="fas fa-database fa-4x" style="color:#2F6BFF;"></i>
                    </div>
                    <div class="empty-cluster-title">У вас еще нет ни одной базы данных</div>
                    <div class="empty-cluster-desc">Создайте свой первый кластер баз данных. В любом регионе.</div>
                    <button class="btn btn-primary" id="createDbClusterBtn" style="margin-top:24px;">Создать кластер</button>
                </div>
            `;
            document.getElementById('createDbClusterBtn').addEventListener('click', () => {
                showCreateClusterPage();
            });
            break;
        case 'storage':
            pageTitle.textContent = 'Объектное хранилище';
            dynamicContent.innerHTML = `
                <div class="empty-cluster-block">
                    <div class="empty-cluster-illustration">
                        <i class="fas fa-hdd fa-4x" style="color:#2F6BFF;"></i>
                    </div>
                    <div class="empty-cluster-title">У вас еще нет ни одного бакета</div>
                    <div class="empty-cluster-desc">Создайте свой первый бакет для хранения объектов.</div>
                    <button class="btn btn-primary" id="createStorageBtn" style="margin-top:24px;">Создать бакет</button>
                </div>
            `;
            document.getElementById('createStorageBtn').addEventListener('click', () => {
                showCreateClusterPage();
            });
            break;
        case 'waf':
            pageTitle.textContent = 'WAF';
            dynamicContent.innerHTML = `
                <div class="empty-cluster-block">
                    <div class="empty-cluster-illustration">
                        <i class="fas fa-shield-alt fa-4x" style="color:#2F6BFF;"></i>
                    </div>
                    <div class="empty-cluster-title">У вас еще нет ни одной WAF-конфигурации</div>
                    <div class="empty-cluster-desc">Создайте свою первую WAF-конфигурацию для защиты приложений.</div>
                    <button class="btn btn-primary" id="createWafBtn" style="margin-top:24px;">Создать WAF</button>
                </div>
            `;
            document.getElementById('createWafBtn').addEventListener('click', () => {
                showCreateClusterPage();
            });
            break;
        case 'ddos':
            pageTitle.textContent = 'Защита от DDoS';
            dynamicContent.innerHTML = `
                <div class="empty-cluster-block">
                    <div class="empty-cluster-illustration">
                        <i class="fas fa-bolt fa-4x" style="color:#2F6BFF;"></i>
                    </div>
                    <div class="empty-cluster-title">У вас еще нет ни одной активной защиты от DDoS</div>
                    <div class="empty-cluster-desc">Создайте первую стратегию защиты от DDoS для ваших сервисов.</div>
                    <button class="btn btn-primary" id="createDdosBtn" style="margin-top:24px;">Создать стратегию</button>
                </div>
            `;
            document.getElementById('createDdosBtn').addEventListener('click', () => {
                showCreateClusterPage();
            });
            break;
        case 'balancers':
            pageTitle.textContent = 'Балансировщики нагрузки';
            dynamicContent.innerHTML = `
                <div class="empty-cluster-block">
                    <div class="empty-cluster-illustration">
                        <i class="fas fa-network-wired fa-4x" style="color:#2F6BFF;"></i>
                    </div>
                    <div class="empty-cluster-title">У вас еще нет ни одного балансировщика</div>
                    <div class="empty-cluster-desc">Создайте свой первый балансировщик нагрузки для распределения трафика.</div>
                    <button class="btn btn-primary" id="createBalancerBtn" style="margin-top:24px;">Создать балансировщик</button>
                </div>
            `;
            document.getElementById('createBalancerBtn').addEventListener('click', () => {
                showCreateClusterPage();
            });
            break;
        case 'monitoring':
            pageTitle.textContent = 'Мониторинг';
            dynamicContent.innerHTML = `
                <div class="empty-cluster-block">
                    <div class="empty-cluster-illustration">
                        <i class="fas fa-chart-line fa-4x" style="color:#2F6BFF;"></i>
                    </div>
                    <div class="empty-cluster-title">У вас еще нет ни одной метрики мониторинга</div>
                    <div class="empty-cluster-desc">Создайте первую метрику для отслеживания состояния сервисов.</div>
                    <button class="btn btn-primary" id="createMonitoringBtn" style="margin-top:24px;">Создать метрику</button>
                </div>
            `;
            document.getElementById('createMonitoringBtn').addEventListener('click', () => {
                showCreateClusterPage();
            });
            break;
        case 'settings':
            pageTitle.textContent = 'Настройки';
            loadAndRenderUserSettings();
            break;
        default:
            pageTitle.textContent = 'Панель управления';
            dynamicContent.innerHTML = '<p>Добро пожаловать в панель управления!</p>';
    }
}

async function loadAndRenderUserSettings() {
    const dynamicContent = document.getElementById('dynamicContent');
    try {
        showLoader();
        const response = await fetchWithTimeout('/api/users/me', {
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
        const user = await response.json();
        dynamicContent.innerHTML = `
            <div class="card">
                <div class="card-title">Профиль пользователя</div>
                <table class="user-profile-table">
                  <thead>
                    <tr>
                      <th>Имя</th>
                      <th>Email</th>
                      <th>Роль</th>
                      <th>Создан</th>
                      <th>Обновлён</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${escapeHtml(user.name)}</td>
                      <td>${escapeHtml(user.email)}</td>
                      <td>${escapeHtml(user.role)}</td>
                      <td>${escapeHtml(new Date(user.created_at).toLocaleString())}</td>
                      <td>${escapeHtml(new Date(user.updated_at).toLocaleString())}</td>
                    </tr>
                  </tbody>
                </table>
                <button class="btn btn-outline" id="showChangePasswordFormBtn" style="margin-top:20px;">Сменить пароль</button>
                <button class="btn btn-primary" id="showUsersListBtn" style="margin-top:20px; margin-left:12px;">Отобразить список пользователей</button>
            </div>
        `;
        document.getElementById('showChangePasswordFormBtn').addEventListener('click', openChangePasswordModal);
        document.getElementById('showUsersListBtn').addEventListener('click', showUsersListPage);
    } catch (error) {
        dynamicContent.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message || 'Ошибка загрузки данных пользователя')}</div>`;
    } finally {
        hideLoader();
    }
}

async function showUsersListPage() {
    const dynamicContent = document.getElementById('dynamicContent');
    try {
        showLoader();
        const response = await fetchWithTimeout('/api/users', {
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
        const users = await response.json();
        dynamicContent.innerHTML = `
            <div class="card">
                <div class="card-title">Список пользователей</div>
                <div style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
                    <button class="btn btn-primary" id="addUserBtn">Добавить пользователя</button>
                    <button class="btn btn-outline" id="backToSettingsBtn">Вернуться к настройкам пользователя</button>
                </div>
                <table class="user-profile-table">
                  <thead>
                    <tr>
                      <th>Имя</th>
                      <th>Email</th>
                      <th>Роль</th>
                      <th>Создан</th>
                      <th>Обновлён</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${users.map(u => {
                        const created = u.created_at ? formatDate(u.created_at) : '-';
                        const updated = u.updated_at ? formatDate(u.updated_at) : '-';
                        return `
                      <tr data-user-id="${u.id}">
                        <td>${escapeHtml(u.name)}</td>
                        <td>${escapeHtml(u.email)}</td>
                        <td>${escapeHtml(u.role)}</td>
                        <td>${created}</td>
                        <td>${updated}</td>
                        <td>
                          <button class="btn btn-sm btn-edit-user">Изменить</button>
                          <button class="btn btn-sm btn-delete-user">Удалить</button>
                        </td>
                      </tr>
                        `;
                    }).join('')}
                  </tbody>
                </table>
            </div>
        `;
        document.getElementById('addUserBtn').addEventListener('click', openAddUserModal);
        document.getElementById('backToSettingsBtn').addEventListener('click', loadAndRenderUserSettings);
        // Делегируем обработку кнопок "Изменить" и "Удалить"
        dynamicContent.querySelector('tbody').addEventListener('click', handleUserTableActions);
    } catch (error) {
        dynamicContent.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message || 'Ошибка загрузки пользователей')}</div>`;
    } finally {
        hideLoader();
    }
}

function handleUserTableActions(e) {
    const tr = e.target.closest('tr[data-user-id]');
    if (!tr) return;
    const userId = tr.getAttribute('data-user-id');
    if (e.target.classList.contains('btn-edit-user')) {
        openEditUserModal(userId);
    } else if (e.target.classList.contains('btn-delete-user')) {
        deleteUser(userId);
    }
}

function openAddUserModal() {
    const modal = document.getElementById('changePasswordModal');
    const modalBody = document.getElementById('changePasswordModalBody');
    modal.classList.remove('hidden');
    modalBody.innerHTML = `
        <form id="addUserForm" class="change-password-form">
            <div class="form-group">
                <label for="addUserName">Имя</label>
                <input type="text" id="addUserName" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="addUserEmail">Email</label>
                <input type="email" id="addUserEmail" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="addUserRole">Роль</label>
                <select id="addUserRole" class="form-control" required>
                    <option value="">Выберите роль</option>
                    <option value="Администратор">Администратор</option>
                    <option value="Редактор">Редактор</option>
                    <option value="Гость">Гость</option>
                </select>
            </div>
            <div class="form-group">
                <label for="addUserPassword">Пароль</label>
                <input type="password" id="addUserPassword" class="form-control" required autocomplete="new-password">
            </div>
            <button type="submit" class="btn btn-primary">Добавить</button>
            <div id="addUserMessage" style="margin-top:10px;"></div>
        </form>
    `;
    document.getElementById('addUserForm').addEventListener('submit', handleAddUserSubmit);
    document.getElementById('closeChangePasswordModal').onclick = closeChangePasswordModal;
    modal.querySelector('.modal-backdrop').onclick = closeChangePasswordModal;
}

async function handleAddUserSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('addUserName').value.trim();
    const email = document.getElementById('addUserEmail').value.trim();
    const role = document.getElementById('addUserRole').value;
    const password = document.getElementById('addUserPassword').value;
    const messageDiv = document.getElementById('addUserMessage');
    messageDiv.textContent = '';
    messageDiv.className = '';
    if (!name || !email || !role || !password) {
        messageDiv.textContent = 'Заполните все поля';
        messageDiv.className = 'alert alert-danger';
        return;
    }
    if (password.length < 6) {
        messageDiv.textContent = 'Пароль должен быть не короче 6 символов';
        messageDiv.className = 'alert alert-danger';
        return;
    }
    try {
        showLoader();
        const response = await fetchWithTimeout('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, email, role, password })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Ошибка добавления пользователя');
        }
        messageDiv.textContent = 'Пользователь успешно добавлен!';
        messageDiv.className = 'alert alert-success';
        setTimeout(() => {
            closeChangePasswordModal();
            showUsersListPage();
        }, 1000);
    } catch (error) {
        messageDiv.textContent = error.message || 'Ошибка добавления пользователя';
        messageDiv.className = 'alert alert-danger';
    } finally {
        hideLoader();
    }
}

function openEditUserModal(userId) {
    fetchWithTimeout(`/api/users`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(users => {
        const user = users.find(u => String(u.id) === String(userId));
        if (!user) return;
        const modal = document.getElementById('changePasswordModal');
        const modalBody = document.getElementById('changePasswordModalBody');
        modal.classList.remove('hidden');
        modalBody.innerHTML = `
            <form id="editUserForm" class="change-password-form">
                <div class="form-group">
                    <label for="editUserName">Имя</label>
                    <input type="text" id="editUserName" class="form-control" required value="${escapeHtml(user.name)}">
                </div>
                <div class="form-group">
                    <label for="editUserEmail">Email</label>
                    <input type="email" id="editUserEmail" class="form-control" required value="${escapeHtml(user.email)}">
                </div>
                <div class="form-group">
                    <label for="editUserRole">Роль</label>
                    <select id="editUserRole" class="form-control" required>
                        <option value="Администратор" ${user.role === 'Администратор' ? 'selected' : ''}>Администратор</option>
                        <option value="Редактор" ${user.role === 'Редактор' ? 'selected' : ''}>Редактор</option>
                        <option value="Гость" ${user.role === 'Гость' ? 'selected' : ''}>Гость</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <div id="editUserMessage" style="margin-top:10px;"></div>
            </form>
        `;
        document.getElementById('editUserForm').addEventListener('submit', (e) => handleEditUserSubmit(e, userId));
        document.getElementById('closeChangePasswordModal').onclick = closeChangePasswordModal;
        modal.querySelector('.modal-backdrop').onclick = closeChangePasswordModal;
    });
}

async function handleEditUserSubmit(e, userId) {
    e.preventDefault();
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const role = document.getElementById('editUserRole').value;
    const messageDiv = document.getElementById('editUserMessage');
    messageDiv.textContent = '';
    messageDiv.className = '';
    if (!name || !email || !role) {
        messageDiv.textContent = 'Заполните все поля';
        messageDiv.className = 'alert alert-danger';
        return;
    }
    try {
        showLoader();
        const response = await fetchWithTimeout(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, email, role })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Ошибка изменения пользователя');
        }
        messageDiv.textContent = 'Данные пользователя обновлены!';
        messageDiv.className = 'alert alert-success';
        if (currentUser && String(currentUser.id) === String(userId)) {
            currentUser = result;
            localStorage.setItem('currentUser', JSON.stringify(result));
            updateUserHeader();
        }
        setTimeout(() => {
            closeChangePasswordModal();
            showUsersListPage();
        }, 1000);
    } catch (error) {
        messageDiv.textContent = error.message || 'Ошибка изменения пользователя';
        messageDiv.className = 'alert alert-danger';
    } finally {
        hideLoader();
    }
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить пользователя?')) return;
    try {
        showLoader();
        const response = await fetchWithTimeout(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Ошибка удаления пользователя');
        }
        showUsersListPage();
    } catch (error) {
        alert(error.message || 'Ошибка удаления пользователя');
    } finally {
        hideLoader();
    }
}

function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    const modalBody = document.getElementById('changePasswordModalBody');
    modal.classList.remove('hidden');
    modalBody.innerHTML = `
        <form id="changePasswordForm" class="change-password-form">
            <div class="form-group">
                <label for="oldPassword">Старый пароль</label>
                <input type="password" id="oldPassword" class="form-control" required autocomplete="current-password">
            </div>
            <div class="form-group">
                <label for="newPassword">Новый пароль</label>
                <input type="password" id="newPassword" class="form-control" required autocomplete="new-password">
            </div>
            <div class="form-group">
                <label for="confirmPassword">Подтвердите новый пароль</label>
                <input type="password" id="confirmPassword" class="form-control" required autocomplete="new-password">
            </div>
            <button type="submit" class="btn btn-primary">Изменить пароль</button>
            <div id="changePasswordMessage" style="margin-top:10px;"></div>
        </form>
    `;
    document.getElementById('changePasswordForm').addEventListener('submit', handleChangePasswordSubmit);
    document.getElementById('closeChangePasswordModal').onclick = closeChangePasswordModal;
    modal.querySelector('.modal-backdrop').onclick = closeChangePasswordModal;
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    modal.classList.add('hidden');
    document.getElementById('changePasswordModalBody').innerHTML = '';
}

async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('changePasswordMessage');
    messageDiv.textContent = '';
    messageDiv.className = '';

    if (newPassword !== confirmPassword) {
        messageDiv.textContent = 'Новые пароли не совпадают';
        messageDiv.className = 'alert alert-danger';
        return;
    }
    if (newPassword.length < 6) {
        messageDiv.textContent = 'Пароль должен быть не короче 6 символов';
        messageDiv.className = 'alert alert-danger';
        return;
    }
    try {
        showLoader();
        const response = await fetchWithTimeout('/api/users/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Ошибка смены пароля');
        }
        messageDiv.textContent = 'Пароль успешно изменён!';
        messageDiv.className = 'alert alert-success';
        document.getElementById('changePasswordForm').reset();
        setTimeout(closeChangePasswordModal, 1200);
    } catch (error) {
        messageDiv.textContent = error.message || 'Ошибка смены пароля';
        messageDiv.className = 'alert alert-danger';
    } finally {
        hideLoader();
    }
}

function toggleUserDropdown(e) {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return isNaN(d) ? '-' : d.toLocaleString();
}

function showCreateClusterPage() {
    const pageTitle = document.getElementById('pageTitle');
    const dynamicContent = document.getElementById('dynamicContent');
    pageTitle.textContent = 'Создание кластера';
    dynamicContent.innerHTML = `
        <div class="card">
            <div class="card-title">Создание кластера</div>
            <p>Здесь будет форма создания кластера. Требования к странице будут добавлены позже.</p>
            <button class="btn btn-outline" id="backToInfraBtn" style="margin-top:20px;">Назад</button>
        </div>
    `;
    document.getElementById('backToInfraBtn').addEventListener('click', () => showSection('infrastructure'));
}

// Массив для хранения кластеров (заглушка)
let clusters = [];

function renderClustersList() {
    const dynamicContent = document.getElementById('dynamicContent');
    if (clusters.length === 0) {
        dynamicContent.innerHTML = `
            <div class="empty-cluster-block">
                <div class="empty-cluster-illustration">
                    <i class="fas fa-server fa-4x" style="color:#2F6BFF;"></i>
                </div>
                <div class="empty-cluster-title">У вас еще нет ни одного кластера виртуальных машин</div>
                <div class="empty-cluster-desc">Создайте свой первый кластер виртуальных машин. В любом регионе.</div>
                <button class="btn btn-primary" id="createClusterBtn" style="margin-top:24px;">Создать кластер</button>
            </div>
        `;
        document.getElementById('createClusterBtn').addEventListener('click', openCreateClusterModal);
    } else {
        dynamicContent.innerHTML = `
            <div class="clusters-list-block">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                    <h2 style="font-size:22px; font-weight:600;">Кластеры виртуальных машин</h2>
                    <button class="btn btn-primary" id="createClusterBtn">Создать кластер</button>
                </div>
                <table class="user-profile-table">
                    <thead>
                        <tr>
                            <th>Имя</th>
                            <th>Описание</th>
                            <th>Регион</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clusters.map((c, idx) => `
                            <tr>
                                <td><a href="#" class="cluster-link" data-cluster-idx="${idx}">${escapeHtml(c.name)}</a></td>
                                <td>${escapeHtml(c.description || '')}</td>
                                <td>${escapeHtml(c.region || '')}</td>
                                <td>Активен</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('createClusterBtn').addEventListener('click', openCreateClusterModal);
        document.querySelectorAll('.cluster-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const idx = this.getAttribute('data-cluster-idx');
                openClusterSettings(idx);
            });
        });
    }
}

function openCreateClusterModal() {
    const modal = document.getElementById('changePasswordModal');
    const modalBody = document.getElementById('changePasswordModalBody');
    modal.classList.remove('hidden');
    modalBody.innerHTML = `
        <form id="createClusterForm" class="change-password-form">
            <div class="form-group">
                <label for="clusterName">Название <span style='color:#FF4D4F'>*</span></label>
                <input type="text" id="clusterName" class="form-control" required maxlength="64" placeholder="Введите название кластера">
            </div>
            <div class="form-group">
                <label for="clusterDesc">Описание (опционально)</label>
                <input type="text" id="clusterDesc" class="form-control" maxlength="128" placeholder="Описание кластера">
            </div>
            <div class="form-group">
                <label for="clusterRegion">Регион</label>
                <select id="clusterRegion" class="form-control">
                    <option value="">Не выбран</option>
                    <option value="Москва-1">Москва-1</option>
                    <option value="Москва-2">Москва-2</option>
                </select>
            </div>
            <div class="form-actions" style="margin-top:24px; display:flex; gap:12px; justify-content:flex-end;">
                <button type="button" class="btn btn-outline" id="closeCreateClusterModal">Закрыть</button>
                <button type="submit" class="btn btn-primary">Создать</button>
            </div>
            <div id="createClusterMessage" style="margin-top:10px;"></div>
        </form>
    `;
    document.getElementById('closeCreateClusterModal').onclick = closeChangePasswordModal;
    modal.querySelector('.modal-backdrop').onclick = closeChangePasswordModal;
    document.getElementById('createClusterForm').addEventListener('submit', handleCreateClusterSubmit);
}

function handleCreateClusterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('clusterName').value.trim();
    const description = document.getElementById('clusterDesc').value.trim();
    const region = document.getElementById('clusterRegion').value;
    const messageDiv = document.getElementById('createClusterMessage');
    messageDiv.textContent = '';
    messageDiv.className = '';
    if (!name) {
        messageDiv.textContent = 'Название обязательно для заполнения';
        messageDiv.className = 'alert alert-danger';
        return;
    }
    clusters.push({ name, description, region });
    closeChangePasswordModal();
    renderClustersList();
}

function openClusterSettings(clusterIdx) {
    const cluster = clusters[clusterIdx];
    const dynamicContent = document.getElementById('dynamicContent');
    const tabs = [
        { key: 'vms', label: 'Виртуальные машины', icon: 'fa-server' },
        { key: 'dedicated', label: 'Выделенные серверы', icon: 'fa-database' },
        { key: 'disks', label: 'Диски', icon: 'fa-hdd' },
        { key: 'k8s', label: 'Managed Kubernetes', icon: 'fa-cubes' },
        { key: 'ssh', label: 'Ключи SSH', icon: 'fa-key' },
        { key: 'network', label: 'Сеть', icon: 'fa-network-wired' }
    ];
    let activeTab = 'vms';
    renderClusterSettingsUI(cluster, tabs, activeTab, clusterIdx);
}

function renderClusterSettingsUI(cluster, tabs, activeTab, clusterIdx) {
    const dynamicContent = document.getElementById('dynamicContent');
    dynamicContent.innerHTML = `
        <div class="cluster-settings-wrapper fixed-cluster-sidebar">
            <div class="cluster-settings-sidebar">
                <div class="cluster-region-select">
                    <select id="clusterRegionSelect" class="form-control">
                        <option value="Москва-1" ${cluster.region === 'Москва-1' ? 'selected' : ''}>Москва-1</option>
                        <option value="Москва-2" ${cluster.region === 'Москва-2' ? 'selected' : ''}>Москва-2</option>
                    </select>
                </div>
                <div class="cluster-settings-title">${escapeHtml(cluster.name)}</div>
                <ul class="cluster-settings-menu">
                    ${tabs.map(tab => `
                        <li class="cluster-settings-menu-item${tab.key === activeTab ? ' active' : ''}" data-tab="${tab.key}">
                            <i class="fas ${tab.icon}"></i> ${tab.label}
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="cluster-settings-main">
                ${renderClusterTabContent(activeTab, cluster)}
            </div>
        </div>
    `;
    // Обработчик смены региона
    dynamicContent.querySelector('#clusterRegionSelect').addEventListener('change', function() {
        cluster.region = this.value;
        renderClusterSettingsUI(cluster, tabs, activeTab, clusterIdx);
    });
    // Навешиваем обработчики на вкладки
    dynamicContent.querySelectorAll('.cluster-settings-menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            renderClusterSettingsUI(cluster, tabs, tab, clusterIdx);
        });
    });
}

function renderClusterTabContent(tab, cluster) {
    switch(tab) {
        case 'vms':
            return `
                <div class="empty-cluster-block" style="box-shadow:none; margin:0; max-width:500px;">
                    <div class="empty-cluster-illustration">
                        <i class="fas fa-server fa-4x" style="color:#2F6BFF;"></i>
                    </div>
                    <div class="empty-cluster-title">Самое время создать первую виртуальную машину</div>
                    <div class="empty-cluster-desc">Создайте свою первую виртуальную машину. Выбирайте подходящий образ, конфигурацию, сеть. Сделать это очень просто. В любом регионе.</div>
                    <button class="btn btn-primary" style="margin-top:24px;">Создать виртуальную машину</button>
                </div>
            `;
        case 'dedicated':
            return `<div style="padding:32px;">Выделенные серверы: пока нет данных.</div>`;
        case 'disks':
            return `<div style="padding:32px;">Диски: пока нет данных.</div>`;
        case 'k8s':
            return `<div style="padding:32px;">Managed Kubernetes: пока нет данных.</div>`;
        case 'ssh':
            return `<div style="padding:32px;">Ключи SSH: пока нет данных.</div>`;
        case 'network':
            return `<div style="padding:32px;">Сеть: пока нет данных.</div>`;
        default:
            return '';
    }
}