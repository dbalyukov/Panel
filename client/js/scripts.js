class AuthService {
  static getToken() {
    return localStorage.getItem('authToken');
  }

  static setToken(token) {
    localStorage.setItem('authToken', token);
  }

  static removeToken() {
    localStorage.removeItem('authToken');
  }

  static async login(credentials) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    return response.json();
  }
}

class UserService {
  static async getAll() {
    const response = await fetch('/api/users', {
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) AuthService.removeToken();
      throw new Error(await response.text());
    }
    
    return response.json();
  }

  // Другие методы для работы с пользователями...
}

class UI {
  constructor() {
    this.initElements();
    this.bindEvents();
    this.checkAuth();
  }

  initElements() {
    this.authForm = document.getElementById('authForm');
    this.appContent = document.getElementById('appContent');
    // ... другие элементы
  }

  bindEvents() {
    document.getElementById('loginBtn').addEventListener('click', this.handleLogin.bind(this));
    // ... другие обработчики
  }

  async checkAuth() {
    if (AuthService.getToken()) {
      await this.loadUsers();
      this.showApp();
    } else {
      this.showAuth();
    }
  }

  async handleLogin() {
    try {
      const credentials = {
        login: document.getElementById('login').value.trim(),
        password: document.getElementById('password').value.trim()
      };
      
      const { token, user } = await AuthService.login(credentials);
      AuthService.setToken(token);
      await this.loadUsers();
      this.showApp();
    } catch (error) {
      this.showError(error.message);
    }
  }

  // ... другие методы
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  new UI();
});