const ticketsManager = {

    // Покупка билета - максимально упрощенная версия
    purchaseTicket: async function(eventId, quantity = 1, seat = '', selectedSeats = []) {
        console.log('Попытка покупки билета на мероприятие:', eventId);
        
        try {
            // Проверяем авторизацию
            if (!auth || !auth.isAuthenticated()) {
                console.error('Пользователь не авторизован');
                return {
                    success: false,
                    message: 'Для покупки билетов необходимо войти в систему'
                };
            }

            // Проверяем eventId
            if (!eventId) {
                console.error('Не указан ID мероприятия');
                return {
                    success: false,
                    message: 'Не указано мероприятие'
                };
            }

            // Подготавливаем данные
            const purchaseData = {
                eventId: eventId,
                quantity: quantity,
                seat: seat
            };

            console.log('Отправляем данные:', purchaseData);

            // Делаем запрос
            const response = await fetch('/api/tickets/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}`
                },
                body: JSON.stringify(purchaseData)
            });

            // Проверяем ответ
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка сервера:', response.status, errorText);
                return {
                    success: false,
                    message: `Ошибка сервера: ${response.status}`
                };
            }

            // Парсим ответ
            const result = await response.json();
            console.log('Ответ сервера:', result);

            if (result.status === 'success') {
                return {
                    success: true,
                    message: result.message,
                    tickets: result.tickets
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'Неизвестная ошибка'
                };
            }

        } catch (error) {
            console.error('Критическая ошибка при покупке:', error);
            return {
                success: false,
                message: 'Ошибка соединения с сервером'
            };
        }
    },

    // Альтернативная простая функция покупки
    simplePurchase: async function(eventId, quantity = 1) {
        try {
            const formData = new FormData();
            formData.append('eventId', eventId);
            formData.append('quantity', quantity);

            const response = await fetch('/api/tickets/purchase-simple', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Ошибка в simplePurchase:', error);
            return { success: false, message: 'Ошибка покупки' };
        }
    },

    // Получение билетов пользователя
    getMyTickets: async function() {
        try {
            const response = await fetch('/api/tickets/my', {
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Ошибка получения билетов:', error);
            return { success: false, message: 'Ошибка загрузки билетов' };
        }
    }
};

// Упрощенное отображение билетов
function displayTickets(tickets) {
    const ticketsContainer = document.getElementById('tickets-container');
    const ticketsList = document.getElementById('ticketsList');
    const ticketsCount = document.getElementById('ticketsCount');

    ticketsContainer.innerHTML = '';
    tickets.forEach(ticket => {
    const eventDate = new Date(ticket.event.date).toLocaleDateString('ru-RU');
    
    const ticketElement = document.createElement('div');
    ticketElement.className = 'ticket-card';
    ticketElement.innerHTML = `
      <div class="ticket-header">
        <span class="ticket-code">${ticket.code}</span>
        <span class="ticket-status ${getStatusClass(ticket.status)}">${ticket.status}</span>
      </div>
      <div class="ticket-info">
        <h3>${ticket.event.title}</h3>
        <p><i class="fas fa-calendar"></i> ${eventDate} в ${ticket.event.time}</p>
        <p><i class="fas fa-map-marker-alt"></i> ${ticket.event.venue}, ${ticket.event.city}</p>
        <p><i class="fas fa-chair"></i> ${ticket.seat}</p>
        <p><i class="fas fa-ruble-sign"></i> ${ticket.price} руб.</p>
        
        ${ticket.qrCode ? `
          <div class="ticket-qr">
            <img src="${ticket.qrCode}" alt="QR-код билета" style="max-width: 150px;">
            <p class="qr-hint">Покажите этот QR-код на входе</p>
          </div>
        ` : ''}
      </div>
      <div class="ticket-actions">
        ${ticket.qrCode ? `
          <button class="btn-secondary" onclick="downloadQRCode('${ticket._id}')">
            <i class="fas fa-download"></i> Скачать QR-код
          </button>
        ` : ''}
        ${ticket.status === 'Активен' ? `
          <button class="btn-warning" onclick="invalidateTicket('${ticket.code}')">
            <i class="fas fa-times"></i> Аннулировать
          </button>
        ` : ''}
      </div>
    `;
    
    ticketsContainer.appendChild(ticketElement);
  });
    
    console.log('Отображаем билеты:', tickets);
    
    if (!tickets || tickets.length === 0) {
        ticketsList.innerHTML = `
            <div class="no-tickets">
                <i class="fas fa-ticket-alt"></i>
                <h3>Билетов не найдено</h3>
                <p>У вас пока нет приобретенных билетов</p>
                <button class="btn btn-primary" onclick="window.location.href='/'">
                    Найти мероприятия
                </button>
                <button class="btn btn-secondary" onclick="createTestTicket()" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> Создать тестовый билет
                </button>
            </div>
        `;
        ticketsCount.textContent = 'Найдено билетов: 0';
        return;
    }
    
    ticketsCount.textContent = `Найдено билетов: ${tickets.length}`;
    
    ticketsList.innerHTML = tickets.map(ticket => {
        console.log('Обрабатываем билет:', ticket);
        
        const eventDate = ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString('ru-RU') : 'Дата не указана';
        const purchaseDate = new Date(ticket.purchaseDate).toLocaleDateString('ru-RU');
        const eventTitle = ticket.event?.title || 'Мероприятие без названия';
        const eventVenue = ticket.event?.venue || 'Место не указано';
        const eventCity = ticket.event?.city ? `, ${ticket.event.city}` : '';
        
        return `
            <div class="ticket-card">
                <div class="ticket-header">
                    <div class="ticket-code">${ticket.code || 'Без кода'}</div>
                    <div class="ticket-status status-${getStatusClass(ticket.status)}">
                        ${ticket.status || 'Неизвестно'}
                    </div>
                </div>
                
                <div class="ticket-info">
                    <div class="ticket-event">${eventTitle}</div>
                    
                    <div class="ticket-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${eventDate} ${ticket.event?.time || ''}</span>
                    </div>
                    
                    <div class="ticket-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${eventVenue}${eventCity}</span>
                    </div>
                    
                    <div class="ticket-detail">
                        <i class="fas fa-chair"></i>
                        <span>${ticket.seat || 'Место не указано'}</span>
                    </div>
                    
                    <div class="ticket-detail">
                        <i class="fas fa-clock"></i>
                        <span>Куплен: ${purchaseDate}</span>
                    </div>
                    
                    <div class="ticket-price">
                        ${ticket.price || 0} руб.
                    </div>
                </div>
                
                <div class="ticket-actions">
                    <button class="btn btn-primary" onclick="viewTicket('${ticket._id}')">
                        <i class="fas fa-eye"></i> Подробнее
                    </button>
                    <button class="btn btn-secondary" onclick="saveTicket('${ticket.code}')">
                        <i class="fas fa-download"></i> Сохранить
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Максимально упрощенная функция покупки
window.simpleBuyTicket = async function(eventId) {
  console.log('🛒 Попытка покупки билета на мероприятие:', eventId);
  
  if (!auth.isAuthenticated()) {
    alert('Войдите в систему для покупки билетов');
    return false;
  }

  // Проверяем eventId
  if (!eventId) {
    alert('Ошибка: не указано мероприятие');
    return false;
  }

  const quantity = parseInt(prompt('Сколько билетов хотите купить?', '1') || '1');
  if (isNaN(quantity) || quantity < 1) {
    alert('Введите корректное количество билетов');
    return false;
  }

  try {
    console.log('Отправляем запрос на покупку...');
    
    const response = await fetch('/api/tickets/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        eventId: eventId,
        quantity: quantity,
        seat: ''
      })
    });

    const result = await response.json();
    console.log('Ответ сервера:', result);

    if (result.status === 'success') {
      alert('✅ Билеты успешно куплены!');
      return true;
    } else {
      alert('❌ Ошибка: ' + (result.message || 'Неизвестная ошибка'));
      return false;
    }
  } catch (error) {
    console.error('Ошибка покупки:', error);
    alert('❌ Ошибка соединения с сервером');
    return false;
  }
};

// Функция оплаты билетов
async function purchaseTicketsWithPayment(eventId, quantity, paymentMethod = 'stripe') {
  try {
    console.log('Создание платежа для мероприятия:', eventId);
    
    const response = await fetch('/api/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        eventId: eventId,
        quantity: quantity,
        paymentMethod: paymentMethod
      })
    });

    const result = await response.json();

    if (result.status === 'success') {
      // Перенаправляем на страницу оплаты
      window.location.href = result.payment.paymentUrl;
    } else {
      throw new Error(result.message || 'Ошибка создания платежа');
    }

  } catch (error) {
    console.error('Ошибка создания платежа:', error);
    alert('Ошибка при создании платежа: ' + error.message);
  }
}

// Проверка статуса платежа
async function checkPaymentStatus(paymentId) {
  try {
    const response = await fetch(`/api/payments/${paymentId}/status`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Ошибка проверки статуса платежа:', error);
    return { status: 'error', message: 'Ошибка проверки статуса' };
  }
}

// Функция для получения QR-кода билета
async function getTicketQRCode(ticketId) {
  try {
    const response = await fetch(`/api/tickets/${ticketId}/qrcode`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        success: true,
        qrCodeUrl: data.qrCodeUrl,
        ticket: data.ticket
      };
    } else {
      return {
        success: false,
        message: data.message
      };
    }
  } catch (error) {
    console.error('Ошибка получения QR-кода:', error);
    return {
      success: false,
      message: 'Ошибка получения QR-кода'
    };
  }
}

// Функция для сканирования QR-кода
async function scanTicketQRCode(qrData) {
  try {
    const response = await fetch('/api/tickets/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({ qrData })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка сканирования QR-кода:', error);
    return {
      status: 'error',
      message: 'Ошибка сканирования QR-кода'
    };
  }
}

// Функция для проверки билета по коду
async function checkTicketByCode(ticketCode) {
  try {
    const response = await fetch(`/api/tickets/check/${ticketCode}`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка проверки билета:', error);
    return {
      status: 'error',
      message: 'Ошибка проверки билета'
    };
  }
}

// Простая функция покупки билетов
// Обновляем функцию покупки билетов
// Обновленная функция покупки билетов
async function purchaseTickets() {
    console.log('Начало покупки билетов...');
    
    // Проверяем авторизацию
    if (!auth.isAuthenticated()) {
        alert('warning', 'Требуется авторизация', 'Для покупки билетов необходимо войти в систему');
        openLoginModal();
        return;
    }

    // Проверяем доступность мероприятия
    if (!currentEvent || !currentEvent._id) {
        alert('error', 'Ошибка', 'Мероприятие не выбрано');
        return;
    }

    // Проверяем тип рассадки и выбранные места
    const seatingConfig = currentEvent.seatingConfig || { type: 'free' };
    
    if (seatingConfig.type === 'reserved') {
        // Для reserved seating проверяем выбранные места
        if (selectedSeats.length === 0) {
            alert('error', 'Ошибка', 'Выберите места для покупки');
            return;
        }
        
        if (selectedSeats.length !== currentQuantity) {
            alert('error', 'Ошибка', `Выберите ${currentQuantity} мест(а)`);
            return;
        }
    }

    // Показываем загрузку
    const purchaseBtn = document.getElementById('purchaseButton');
    const originalText = purchaseBtn.textContent;
    purchaseBtn.disabled = true;
    purchaseBtn.textContent = 'Покупка...';

    try {
        console.log('Отправка запроса на покупку...');
        
        // Подготавливаем данные для отправки
        const requestData = {
            eventId: currentEvent._id,
            quantity: currentQuantity
        };

        // Добавляем выбранные места для reserved seating
        if (seatingConfig.type === 'reserved' && selectedSeats.length > 0) {
            requestData.selectedSeats = selectedSeats;
        }

        // Отправляем запрос
        const response = await fetch('/api/tickets/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`
            },
            body: JSON.stringify(requestData)
        });

        // Проверяем ответ
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Ответ сервера:', result);

        if (result.status === 'success') {
            // Успешная покупка
            alert('success', 'Успех!', result.message);
            
            // Показываем информацию о билетах

            showPurchaseSuccess(result.tickets);
            
        } else {
            // Ошибка от сервера
            alert('error', 'Ошибка', result.message || 'Неизвестная ошибка');
        }

    } catch (error) {
        console.error('Ошибка покупки:', error);
        alert('error', 'Ошибка', 'Не удалось покупку. Попробуйте еще раз.');
    } finally {
        // Восстанавливаем кнопку
        purchaseBtn.disabled = false;
        purchaseBtn.textContent = originalText;
    }
}

// // Функция для кнопки покупки
// window.buyTickets = async function(eventId) {
//   const quantity = parseInt(prompt('Сколько билетов хотите купить?', '1') || '1');
//   if (isNaN(quantity) || quantity < 1) {
//     alert('Введите корректное количество билетов');
//     return;
//   }

//   await purchaseTickets(eventId, quantity);
// };

// WORKING VARIANT IS BELOW

// Функция для кнопки покупки 
window.buyTickets = async function(eventId) {
  const quantity = parseInt(prompt('Сколько билетов хотите купить?', '1') || '1');
  if (isNaN(quantity) || quantity < 1) {
    alert('Введите корректное количество билетов');
    return;
  }

  await purchaseTickets(eventId, quantity);
};

// Функция показа модального окна с купленными билетами
function showPurchaseSuccessModal(tickets) {
    const modal = document.getElementById('seatingVisualizationSection');
    const ticketsList = document.getElementById('ticketsList');
    
    // Очищаем предыдущий список
    ticketsList.innerHTML = '';
    
    // Добавляем каждый билет в список
    tickets.forEach(ticket => {
        const eventDate = new Date(ticket.event.date).toLocaleDateString('ru-RU');
        const purchaseDate = new Date(ticket.purchaseDate).toLocaleDateString('ru-RU');
        
        const ticketItem = document.createElement('div');
        ticketItem.className = 'ticket-item';
        ticketItem.innerHTML = `
            <div class="ticket-header">
                <span class="ticket-code">${ticket.code}</span>
                <span class="ticket-status status-active">Активен</span>
            </div>
            
            <div class="ticket-details">
                <p><strong>Мероприятие:</strong> ${ticket.event.title}</p>
                <p><strong>Дата:</strong> ${eventDate} в ${ticket.event.time}</p>
                <p><strong>Место:</strong> ${ticket.event.venue}, ${ticket.event.city}</p>
                <p><strong>Место:</strong> ${ticket.seat}</p>
                <p><strong>Цена:</strong> ${ticket.price} руб.</p>
                <p><strong>Куплен:</strong> ${purchaseDate}</p>
            </div>
            
            ${ticket.qrCode ? `
                <div class="ticket-qr">
                    <img src="${ticket.qrCode}" alt="QR-код билета ${ticket.code}">
                    <p class="qr-hint">Покажите этот QR-код на входе</p>
                </div>
            ` : `
                <div class="ticket-qr">
                    <div style="padding: 20px; background: #f5f5f5; border-radius: 5px;">
                        <i class="fas fa-qrcode" style="font-size: 2rem; color: #ccc;"></i>
                        <p class="qr-hint">QR-код генерируется...</p>
                    </div>
                </div>
            `}
        `;
        
        ticketsList.appendChild(ticketItem);
    });
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Блокируем прокрутку фона
}





// Обновляем обработчик кнопок покупки
function addBookButtonHandlers() {
    const bookButtons = document.querySelectorAll('.book-btn');
    
    bookButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const eventId = this.getAttribute('data-event-id');
            if (!eventId) {
                notifications.error('Ошибка', 'Не удалось определить мероприятие');
                return;
            }
            
            // Запрашиваем количество билетов
            const quantity = parseInt(prompt('Сколько билетов вы хотите приобрести?', '1') || '1');
            if (isNaN(quantity) || quantity < 1) {
                notifications.error('Ошибка', 'Пожалуйста, введите корректное количество билетов');
                return;
            }
            
            purchaseTicket(eventId, quantity);
        });
    });
}