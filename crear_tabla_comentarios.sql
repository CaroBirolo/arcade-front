-- Tabla de comentarios para FreeClassicGamesOnline
-- Crear tabla de comentarios
CREATE TABLE IF NOT EXISTS comentarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    juego_id INTEGER NOT NULL,
    juego_slug TEXT NOT NULL,
    nombre TEXT NOT NULL,
    email TEXT,
    contenido TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    estado TEXT DEFAULT 'pendiente',
    ip_address TEXT,
    user_agent TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion DATETIME,
    FOREIGN KEY (juego_id) REFERENCES juego_detalle(id)
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_comentarios_juego_id ON comentarios(juego_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_juego_slug ON comentarios(juego_slug);
CREATE INDEX IF NOT EXISTS idx_comentarios_estado ON comentarios(estado);
CREATE INDEX IF NOT EXISTS idx_comentarios_fecha ON comentarios(fecha_creacion);

-- Tabla para trackear spam/abuso
CREATE TABLE IF NOT EXISTS comentarios_spam (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    ip_address TEXT,
    cantidad_comentarios INTEGER DEFAULT 1,
    ultima_accion DATETIME DEFAULT CURRENT_TIMESTAMP,
    bloqueado INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_spam_email ON comentarios_spam(email);
CREATE INDEX IF NOT EXISTS idx_spam_ip ON comentarios_spam(ip_address);
CREATE INDEX IF NOT EXISTS idx_spam_bloqueado ON comentarios_spam(bloqueado);
