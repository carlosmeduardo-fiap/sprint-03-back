const jwt = require('jsonwebtoken');

function validateToken(req, res, next) {
  const authorization = req.headers['authorization'];

  if (!authorization) {
    return res.status(401).send('Token inválido.');
  }

  const [, token] = authorization.split(' ');

  try {
    const payload = jwt.verify(token, 'my-secret-token')

    const userId = payload.sub;

    if (!userId) {
      return res.status(401).send('Token inválido.');
    }

    req.user = {
      id: userId
    };

    return next();
  } catch {
    return res.status(401).send('Token inválido.');
  }
}

module.exports = {
  validateToken
}