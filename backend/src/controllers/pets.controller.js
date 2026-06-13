import { query } from '../config/db.js';

// GET /api/pets  → mascotas del usuario autenticado
export const listPets = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/pets/:id
export const getPet = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM pets WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/pets
export const createPet = async (req, res, next) => {
  try {
    const { name, species, breed, size, birth_date, notes } = req.body;
    if (!name || !species) {
      return res.status(400).json({ message: 'Nombre y especie son obligatorios' });
    }
    const { rows } = await query(
      `INSERT INTO pets (owner_id, name, species, breed, size, birth_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, name, species, breed || null, size || null, birth_date || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/pets/:id
export const updatePet = async (req, res, next) => {
  try {
    const { name, species, breed, size, birth_date, notes } = req.body;
    const { rows } = await query(
      `UPDATE pets SET name=$1, species=$2, breed=$3, size=$4, birth_date=$5, notes=$6
       WHERE id=$7 AND owner_id=$8 RETURNING *`,
      [name, species, breed, size, birth_date, notes, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/pets/:id
export const deletePet = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM pets WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json({ message: 'Mascota eliminada' });
  } catch (err) {
    next(err);
  }
};
