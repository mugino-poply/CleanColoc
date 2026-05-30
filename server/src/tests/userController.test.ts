import { UserController } from '../controllers/userController';
import { UserService }    from '../services/userService';
import { AuthService }    from '../services/authService';

jest.mock('../services/userService', () => ({
  UserService: {
    registerUser: jest.fn(),
    getUserById:  jest.fn(),
    updateUser:   jest.fn(),
    deleteUser:   jest.fn(),
  },
}));

jest.mock('../services/authService', () => ({
  AuthService: {
    login:   jest.fn(),
    refresh: jest.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildReq = (overrides: Record<string, any> = {}): any => ({
  body:    {},
  params:  {},
  cookies: {},
  user:    { id: 'user-uuid-1' },
  ...overrides,
});

const buildRes = (): any => {
  const r: any = {};
  r.status      = jest.fn().mockReturnValue(r);
  r.json        = jest.fn().mockReturnValue(r);
  r.send        = jest.fn().mockReturnValue(r);
  r.cookie      = jest.fn().mockReturnValue(r);
  r.clearCookie = jest.fn().mockReturnValue(r);
  return r;
};

const buildNext = (): jest.Mock => jest.fn();

// ─── register ─────────────────────────────────────────────────────────────────

describe('UserController.register', () => {
  beforeEach(() => jest.clearAllMocks());

  it("crée un utilisateur et retourne 201", async () => {
    const mockUser = { id: 'user-1', username: 'Alice', email: 'alice@test.com' };
    (UserService.registerUser as jest.Mock).mockResolvedValue(mockUser);

    const r = buildRes();
    await UserController.register(
      buildReq({ body: { username: 'Alice', email: 'alice@test.com', password: 'secret' } }),
      r, buildNext()
    );

    expect(UserService.registerUser).toHaveBeenCalledTimes(1);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: mockUser })
    );
  });

  it("propage l'erreur via next() si le service lève une exception", async () => {
    const err = new Error('Email déjà utilisé');
    (UserService.registerUser as jest.Mock).mockRejectedValue(err);

    const n = buildNext();
    await UserController.register(buildReq({ body: {} }), buildRes(), n);
    expect(n).toHaveBeenCalledWith(err);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('UserController.login', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 200 avec accessToken et pose le cookie refreshToken", async () => {
    const mockUser   = { id: 'user-1', username: 'Alice', email: 'alice@test.com' };
    const mockTokens = { user: mockUser, accessToken: 'access.token', refreshToken: 'refresh.token' };
    (AuthService.login as jest.Mock).mockResolvedValue(mockTokens);

    const r = buildRes();
    await UserController.login(
      buildReq({ body: { email: 'alice@test.com', password: 'secret' } }),
      r, buildNext()
    );

    expect(AuthService.login).toHaveBeenCalledWith('alice@test.com', 'secret');
    expect(r.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh.token',
      expect.objectContaining({ httpOnly: true })
    );
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'access.token' })
    );
  });

  it("propage l'erreur si les credentials sont invalides", async () => {
    const err = new Error('Identifiants invalides');
    (AuthService.login as jest.Mock).mockRejectedValue(err);

    const n = buildNext();
    await UserController.login(
      buildReq({ body: { email: 'x@x.com', password: 'wrong' } }),
      buildRes(), n
    );
    expect(n).toHaveBeenCalledWith(err);
  });
});

// ─── getProfile ───────────────────────────────────────────────────────────────

describe('UserController.getProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 200 avec les données du profil", async () => {
    const mockUser = { id: 'user-1', username: 'Alice', email: 'alice@test.com' };
    (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

    const r = buildRes();
    await UserController.getProfile(buildReq({ params: { id: 'user-1' } }), r, buildNext());

    expect(UserService.getUserById).toHaveBeenCalledWith('user-1');
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith({ data: mockUser });
  });

  it("propage l'erreur si l'utilisateur n'existe pas", async () => {
    const err = new Error('Utilisateur introuvable');
    (UserService.getUserById as jest.Mock).mockRejectedValue(err);

    const n = buildNext();
    await UserController.getProfile(buildReq({ params: { id: 'ghost' } }), buildRes(), n);
    expect(n).toHaveBeenCalledWith(err);
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('UserController.refresh', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 401 si le cookie refreshToken est absent", async () => {
    const r = buildRes();
    await UserController.refresh(buildReq({ cookies: {} }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(401);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Refresh token') })
    );
    expect(AuthService.refresh).not.toHaveBeenCalled();
  });

  it("retourne 200 avec un nouveau accessToken si le cookie est valide", async () => {
    const mockUser = { id: 'user-1', username: 'Alice', email: 'alice@test.com' };
    (AuthService.refresh as jest.Mock).mockResolvedValue({
      user:        mockUser,
      accessToken: 'new.access.token',
    });

    const r = buildRes();
    await UserController.refresh(
      buildReq({ cookies: { refreshToken: 'valid.refresh.token' } }),
      r, buildNext()
    );

    expect(AuthService.refresh).toHaveBeenCalledWith('valid.refresh.token');
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'new.access.token' })
    );
  });

  it("propage l'erreur si le refresh token est expiré ou invalide", async () => {
    const err = new Error('Token invalide');
    (AuthService.refresh as jest.Mock).mockRejectedValue(err);

    const n = buildNext();
    await UserController.refresh(
      buildReq({ cookies: { refreshToken: 'expired.token' } }),
      buildRes(), n
    );
    expect(n).toHaveBeenCalledWith(err);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('UserController.logout', () => {
  beforeEach(() => jest.clearAllMocks());

  it("efface le cookie et retourne 200", async () => {
    const r = buildRes();
    await UserController.logout(buildReq(), r, buildNext());

    expect(r.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ httpOnly: true })
    );
    expect(r.status).toHaveBeenCalledWith(200);
  });
});

// ─── updateProfile ────────────────────────────────────────────────────────────

describe('UserController.updateProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si aucun champ n'est fourni", async () => {
    const r = buildRes();
    await UserController.updateProfile(buildReq({ body: {} }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(UserService.updateUser).not.toHaveBeenCalled();
  });

  it("met à jour le profil et retourne 200", async () => {
    const updated = { id: 'user-1', username: 'Nouvelle Alice', avatarUrl: null };
    (UserService.updateUser as jest.Mock).mockResolvedValue(updated);

    const r = buildRes();
    await UserController.updateProfile(
      buildReq({ body: { username: 'Nouvelle Alice' } }),
      r, buildNext()
    );

    expect(UserService.updateUser).toHaveBeenCalledWith(
      'user-uuid-1',
      expect.objectContaining({ username: 'Nouvelle Alice' })
    );
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: updated })
    );
  });
});

// ─── deleteAccount ────────────────────────────────────────────────────────────

describe('UserController.deleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si le mot de passe est absent", async () => {
    const r = buildRes();
    await UserController.deleteAccount(buildReq({ body: {} }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(UserService.deleteUser).not.toHaveBeenCalled();
  });

  it("supprime le compte, efface le cookie et retourne 204", async () => {
    (UserService.deleteUser as jest.Mock).mockResolvedValue(undefined);

    const r = buildRes();
    await UserController.deleteAccount(
      buildReq({ body: { password: 'correct-password' } }),
      r, buildNext()
    );

    expect(UserService.deleteUser).toHaveBeenCalledWith('user-uuid-1', 'correct-password');
    expect(r.clearCookie).toHaveBeenCalledWith('refreshToken');
    expect(r.status).toHaveBeenCalledWith(204);
    expect(r.send).toHaveBeenCalled();
  });

  it("propage l'erreur si le mot de passe est incorrect", async () => {
    const err = new Error('Mot de passe incorrect');
    (UserService.deleteUser as jest.Mock).mockRejectedValue(err);

    const n = buildNext();
    await UserController.deleteAccount(
      buildReq({ body: { password: 'wrong' } }),
      buildRes(), n
    );
    expect(n).toHaveBeenCalledWith(err);
  });
});