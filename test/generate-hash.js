const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('usertesting', 10);
console.log(hash);
