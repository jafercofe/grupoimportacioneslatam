class PermissionsLoadingManager {
    constructor() {
        this.loadingElement = null;
        this.progressSteps = [
            { text: 'Verificando usuario...', subtitle: 'Obteniendo datos de sesión' },
            { text: 'Cargando tipos de trabajador...', subtitle: 'Consultando base de datos' },
            { text: 'Obteniendo permisos...', subtitle: 'Configurando accesos' },
            { text: 'Aplicando restricciones...', subtitle: 'Configurando interfaz' },
            { text: 'Finalizando...', subtitle: 'Preparando sistema' }
        ];
        this.currentStep = 0;
    }

    show() {
        // Agregar clase al body para deshabilitar interacción
        document.body.classList.add('loading-permissions');
        
        // Crear elemento de loading
        this.loadingElement = document.createElement('div');
        this.loadingElement.className = 'global-permissions-loading';
        this.loadingElement.innerHTML = `
            <div class="permissions-loading-content">
                <div class="permissions-loading-spinner"></div>
                <div class="permissions-loading-text" id="permissions-loading-text">
                    Inicializando sistema de permisos...
                </div>
                <div class="permissions-loading-subtitle" id="permissions-loading-subtitle">
                    Verificando credenciales
                </div>
                <div class="permissions-progress-bar">
                    <div class="permissions-progress-fill" id="permissions-progress-fill"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.loadingElement);
        
        // Iniciar progreso simulado
        this.startProgressSimulation();
    }

    updateStep(stepIndex, customText = null, customSubtitle = null) {
        if (!this.loadingElement) return;
        
        this.currentStep = Math.min(stepIndex, this.progressSteps.length - 1);
        const step = this.progressSteps[this.currentStep];
        
        const textEl = document.getElementById('permissions-loading-text');
        const subtitleEl = document.getElementById('permissions-loading-subtitle');
        const progressEl = document.getElementById('permissions-progress-fill');
        
        if (textEl) textEl.textContent = customText || step.text;
        if (subtitleEl) subtitleEl.textContent = customSubtitle || step.subtitle;
        if (progressEl) progressEl.style.width = `${((stepIndex + 1) / this.progressSteps.length) * 100}%`;
        
        console.log(`Permissions Loading: ${step.text}`);
    }

    startProgressSimulation() {
        // Simular progreso mientras se cargan los permisos reales
        let step = 0;
        const interval = setInterval(() => {
            if (step < this.progressSteps.length && this.loadingElement) {
                this.updateStep(step);
                step++;
            } else {
                clearInterval(interval);
            }
        }, 800);
        
        // Limpiar intervalo si se oculta antes de completar
        this.progressInterval = interval;
    }

    hide() {
        if (this.loadingElement) {
            // Animación de salida
            this.loadingElement.classList.add('fade-out');
            
            setTimeout(() => {
                if (this.loadingElement && this.loadingElement.parentNode) {
                    this.loadingElement.parentNode.removeChild(this.loadingElement);
                }
                this.loadingElement = null;
                
                // Remover clase del body para habilitar interacción
                document.body.classList.remove('loading-permissions');
                
            }, 300);
        }
        
        // Limpiar intervalo de progreso
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    isVisible() {
        return !!this.loadingElement;
    }
}

// 3. INTEGRACIÓN CON EL SISTEMA EXISTENTE:

// Crear instancia global
window.permissionsLoadingManager = new PermissionsLoadingManager();
