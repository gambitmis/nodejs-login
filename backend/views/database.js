const mysql = require("mysql2");
const dbConnection = musql.CreatePool({
    host: "db",
    user: "dbadmin",
    password: "password",
    database: "login"
}).promise()