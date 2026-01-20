const fs = require("fs");

const csvFile = "juego_detalle.csv";
const sqlFile = "juego_detalle.sql";

// leer CSV
const csv = fs.readFileSync(csvFile, "utf8").trim();
const lines = csv.split("\n");

// quitar encabezado
lines.shift();

let sql = `
INSERT INTO juego_detalle_import (
  slug,
  plataforma,
  nombre,
  anio,
  genero,
  desarrollador,
  jugadores,
  estilo,
  gameplay,
  objetivo,
  descripcion_corta,
  descripcion_larga
)
VALUES
`;

const values = lines.map((line) => {
  const cols = line.split(",").map(c =>
    c.trim() === "" ? "NULL" : `'${c.replace(/'/g, "''")}'`
  );
  return `(${cols.join(",")})`;
});

sql += values.join(",\n") + ";";

// guardar SQL
fs.writeFileSync(sqlFile, sql);

console.log("✅ juego_detalle.sql generado correctamente");
