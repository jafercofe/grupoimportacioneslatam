class NotificationService {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 5000) {
        const notification = {
            id: Date.now() + Math.random(),
            message,
            type,
            duration
        };

        this.notifications.push(notification);
        this.render(notification);

        if (duration > 0) {
            setTimeout(() => this.remove(notification.id), duration);
        }

        return notification.id;
    }

    render(notification) {
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.dataset.id = notification.id;
        
        element.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${notification.message}</span>
                <button class="notification-close" onclick="notificationService.remove(${notification.id})">
                    &times;
                </button>
            </div>
        `;

        this.container.appendChild(element);
        
        // Animate in
        setTimeout(() => element.classList.add('show'), 100);
    }

    remove(id) {
        const element = this.container.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.classList.remove('show');
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }

        // Remove from notifications array
        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    success(message) {
        return this.show(message, 'success', 3000);
    }

    error(message) {
        return this.show(message, 'error', 0); // No auto-dismiss for errors
    }

    warning(message) {
        return this.show(message, 'warning', 5000);
    }

    info(message) {
        return this.show(message, 'info', 4000);
    }

    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification.id);
        });
        this.notifications = [];
    }

    // NUEVA: Función para mostrar loading que se puede cancelar manualmente
    loading(message) {
        return this.show(message, 'info', 0); // Sin auto-dismiss
    }
}

// Export globally
window.notificationService = new NotificationService();