const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('AdminPass456!', 10));