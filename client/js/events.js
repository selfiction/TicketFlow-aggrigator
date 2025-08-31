class Events {
  constructor() {
    this.auth = auth;
  }

  // Получение всех мероприятий
  async getAllEvents() {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();

      if (data.status === 'success') {
        return { success: true, events: data.events };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Ошибка сети. Попробуйте позже.' };
    }
  }

  // Создание мероприятия
  async createEvent(eventData) {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.auth.token}`
        },
        body: JSON.stringify(eventData)
      });

      const data = await response.json();

      if (data.status === 'success') {
        return { success: true, event: data.event };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Ошибка сети. Попробуйте позже.' };
    }
  }
}

// Создаем экземпляр Events
const eventsManager = new Events();