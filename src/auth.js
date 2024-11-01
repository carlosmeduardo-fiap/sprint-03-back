const jwt = require('jsonwebtoken');

const { permissions } = require('./permissions')

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
      id: userId,
      role: payload.role,
    };

    return next();
  } catch {
    return res.status(401).send('Token inválido.');
  }
}

function getUserPermissions(role) {
  const builder = {
    permissions: [],
    can(action, subject) {
      this.permissions = this.permissions || [];

      this.permissions.push({ action, subject });
    },
    cannot(action, subject) {
      return !this.permissions.some(permission =>
        (permission.action === 'manage' || permission.action === action)
        && permission.subject === subject
      );
    },
  };

  permissions[role](builder);
  
  return builder;
}

module.exports = {
  validateToken,
  getUserPermissions
}