const spicedPg = require("spiced-pg");
var db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);

module.exports.getSignatures = () => {
    return db.query(`SELECT * FROM users`);
};

module.exports.addSignatures = (user_id, signature) => {
    return db.query(
        `
    INSERT INTO signatures (user_id, signature)
    VALUES ($1, $2)
    RETURNING id`,
        [user_id, signature]
    );
};

module.exports.getCount = () => {
    return db.query(`SELECT COUNT(*) FROM signatures`);
};

module.exports.getPic = (id) => {
    return db.query(`SELECT signature FROM signatures WHERE user_id = ${id}`);
};

module.exports.insertData = (first, last, email, password) => {
    return db.query(
        `
    INSERT INTO users (first, last, email, password)
    VALUES ($1, $2, $3, $4)
    RETURNING id`,
        [first, last, email, password]
    );
};

module.exports.getHashed = (email) => {
    return db.query(`SELECT password FROM users WHERE email = $1`, [email]);
};

module.exports.getId = (email) => {
    return db.query(`SELECT id FROM users WHERE email = $1`, [email]);
};

module.exports.checkSign = (userId) => {
    return db.query(
        `SELECT EXISTS(SELECT signature FROM signatures WHERE user_id = $1)`,
        [userId]
    );
};

module.exports.getSign = (userId) => {
    return db.query(
        `
    SELECT signature FROM signatures WHERE user_id = $1
    `,
        [userId]
    );
};

module.exports.insertProfile = (age, city, url, id) => {
    return db.query(
        `
    INSERT INTO user_profiles(age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNINg id`,
        [age, city, url, id]
    );
};

module.exports.getProfile = () => {
    return db.query(`
     SELECT signatures.signature, users.first, users.last, user_profiles.age AS age, user_profiles.city AS city, user_profiles.url AS url
     FROM signatures
     LEFT JOIN user_profiles
     ON signatures.user_id = user_profiles.user_id
     JOIN users
     ON user_profiles.user_id = users.id;
  `);
};

module.exports.citySigners = (city) => {
    return db.query(
        `
    SELECT signatures.signature, users.first, users.last, user_profiles.age AS age, user_profiles.city AS city, user_profiles.url AS url
     FROM signatures
     LEFT JOIN user_profiles
     ON signatures.user_id = user_profiles.user_id
     JOIN users
     ON user_profiles.user_id = users.id
     WHERE LOWER(city) = LOWER($1)`,
        [city]
    );
};

module.exports.upsert = (age, city, url, id) => {
    return db.query(
        `
  INSERT INTO user_profiles (age, city, url)
  VALUES ($1, $2, $3)
  ON CONFLICT (user_id)
  DO UPDATE SET age = $1, city = $2, url = $3;`,
        [age || null, city, url, id]
    );
};

module.exports.noPassUpdate = (first, last, email, id) => {
    return db.query(
        `
    UPDATE users
    SET first = $1, last = $2, email = $3
    WHERE id = $4`,
        [first, last, email, id]
    );
};

module.exports.passUpdate = (password, id) => {
    return db.query(
        `
    UPDATE users
    SET password = $1
    WHERE id = $2`,
        [password, id]
    );
};

module.exports.delete = (id) => {
    return db.query(
        `
    DELETE FROM signatures
    WHERE user_id = $1`,
        [id]
    );
};
