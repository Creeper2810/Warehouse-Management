const {
  User,
  PersonalAccessToken,
} = require('./models');
const {
  abilitiesForRole,
  can,
  hashPlainToken,
  parseAbilities,
  randomToken,
  sanitizeUser,
} = require('./utils');

async function createBearerToken(user, name = 'mobile-token', abilities = null) {
  const plainToken = randomToken(32);
  const tokenHash = hashPlainToken(plainToken);
  const tokenAbilities = abilities || abilitiesForRole(user.role);

  const record = await PersonalAccessToken.create({
    tokenable_type: 'App\\Models\\User',
    tokenable_id: user.id,
    name,
    token: tokenHash,
    abilities: JSON.stringify(tokenAbilities),
  });

  return `${record.id}|${plainToken}`;
}

async function attachUser(req, _res, next) {
  try {
    req.auth = { type: 'guest', token: null, abilities: [] };

    if (req.session?.userId) {
      const user = await User.findByPk(req.session.userId);
      if (user) {
        req.user = user;
        req.auth = { type: 'session', token: null, abilities: abilitiesForRole(user.role) };
        return next();
      }
      delete req.session.userId;
    }

    const header = req.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return next();

    const bearer = match[1];
    const separator = bearer.indexOf('|');
    if (separator === -1) return next();

    const tokenId = bearer.slice(0, separator);
    const plainToken = bearer.slice(separator + 1);
    const token = await PersonalAccessToken.findByPk(tokenId);
    if (!token || token.token !== hashPlainToken(plainToken)) return next();
    if (token.expires_at && new Date(token.expires_at) <= new Date()) return next();

    const user = await User.findByPk(token.tokenable_id);
    if (!user) return next();

    token.last_used_at = new Date();
    await token.save();

    req.user = user;
    req.auth = {
      type: 'bearer',
      token,
      abilities: parseAbilities(token.abilities),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  return next();
}

function requireAbility(ability) {
  return (req, res, next) => {
    if (!can(req.user, ability, req.auth?.abilities || [])) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    return next();
  };
}

function currentUserResponse(req) {
  return sanitizeUser(req.user);
}

module.exports = {
  createBearerToken,
  attachUser,
  requireAuth,
  requireAdmin,
  requireAbility,
  currentUserResponse,
};
