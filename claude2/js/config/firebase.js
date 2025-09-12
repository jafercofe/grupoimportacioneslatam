class FirebaseManager {
    constructor() {
        this.db = null;
        this.auth = null;  // 🔥 NUEVO: Authentication
        this.initialized = false;
        this.config = {
            apiKey: "AIzaSyBlzaQCL7M98QeifzkEMZ4d8deC7oHqCT0",
            authDomain: "novo-crm-e9779.firebaseapp.com",
            projectId: "novo-crm-e9779",
            storageBucket: "novo-crm-e9779.firebasestorage.app",
            messagingSenderId: "43652899432",
            appId: "1:43652899432:web:6c787bced791b8ea6d91dd"
        };
    }

    async initialize() {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK no está cargado');
            }
            
            firebase.initializeApp(this.config);
            this.db = firebase.firestore();
            this.auth = firebase.auth();  // 🔥 NUEVO: Inicializar Auth
            
            // Test connection
            await this.db.collection('test').limit(1).get();
            
            this.initialized = true;
            console.log("Firebase y Auth inicializados correctamente");
            return this.db;
        } catch (error) {
            console.error("Error inicializando Firebase:", error);
            throw error;
        }
    }

    getDB() {
        return this.db;
    }

    getAuth() {  // 🔥 NUEVO: Obtener Auth
        return this.auth;
    }

    isInitialized() {
        return this.initialized;
    }
}