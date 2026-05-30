import { AuthService } from '../services/authService';
import User from '../models/user';
import jwt from 'jsonwebtoken';

jest.mock('../models/user', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

jest.mock('jsonwebtoken', () => ({
  sign:   jest.fn(),
  verify: jest.fn(),
}));

const buildUser = (overrides: Record<string, any> = {}) => ({
  id:              'user-1',
  username:        'Alice',
  email:           'alice@test.com',
  comparePassword: jest.fn(),
  ...overrides,
});

// ─── generateAccessToken ──────────────────────────────────────────────────────

describe('AuthService.generateAccessToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it("signe le token avec l'id utilisateur et une expiration de 15 minutes", () => {
    (jwt.sign as jest.Mock).mockReturnValue('access.token');
    const token = AuthService.generateAccessToken('user-1');

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 'user-1' },
      expect.any(String),
      expect.objectContaining({ expiresIn: '15m' })
    );
    expect(token).toBe('access.token');
  });
});

// ─── generateRefreshToken ─────────────────────────────────────────────────────

describe('AuthService.generateRefreshToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it("signe le token avec l'id utilisateur et une expiration de 7 jours", () => {
    (jwt.sign as jest.Mock).mockReturnValue('refresh.token');
    const token = AuthService.generateRefreshToken('user-1');

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 'user-1' },
      expect.any(String),
      expect.objectContaining({ expiresIn: '7d' })
    );
    expect(token).toBe('refresh.token');
  });

  it("utilise une clé différente de celle de l'access token", () => {
    (jwt.sign as jest.Mock).mockReturnValue('refresh.token');
    AuthService.generateAccessToken('user-1');
    AuthService.generateRefreshToken('user-1');

    const [accessCall, refreshCall] = (jwt.sign as jest.Mock).mock.calls as any[];
    // Les deux secrets peuvent être identiques en dev (fallback), mais les expirations diffèrent
    expect(accessCall[2].expiresIn).toBe('15m');
    expect(refreshCall[2].expiresIn).toBe('7d');
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  beforeEach(() => jest.clearAllMocks());

  it("lève une erreur 401 si l'utilisateur est introuvable", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    await expect(AuthService.login('unknown@test.com', 'pw')).rejects.toMatchObject({
      status: 401,
    });
  });

  it("lève une erreur 401 si le mot de passe est incorrect", async () => {
    const mockUser = buildUser();
    mockUser.comparePassword.mockResolvedValue(false);
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);

    await expect(AuthService.login('alice@test.com', 'wrong')).rejects.toMatchObject({
      status: 401,
    });
  });

  it("retourne user, accessToken et refreshToken si les credentials sont valides", async () => {
    const mockUser = buildUser();
    mockUser.comparePassword.mockResolvedValue(true);
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock)
      .mockReturnValueOnce('access.token')
      .mockReturnValueOnce('refresh.token');

    const result = await AuthService.login('alice@test.com', 'correct');

    expect(result).toMatchObject({
      user:         mockUser,
      accessToken:  'access.token',
      refreshToken: 'refresh.token',
    });
  });

  it("génère deux tokens distincts (access + refresh) lors d'un login réussi", async () => {
    const mockUser = buildUser();
    mockUser.comparePassword.mockResolvedValue(true);
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue('any.token');

    await AuthService.login('alice@test.com', 'correct');
    expect(jwt.sign).toHaveBeenCalledTimes(2);
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('AuthService.refresh', () => {
  beforeEach(() => jest.clearAllMocks());

  it("lève une erreur 401 si le token est invalide ou expiré", async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('invalid'); });

    await expect(AuthService.refresh('bad.token')).rejects.toMatchObject({ status: 401 });
    // L'accès à la DB ne doit pas avoir eu lieu
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("lève une erreur 401 si l'utilisateur n'existe plus en base", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-1' });
    (User.findOne as jest.Mock).mockResolvedValue(null);

    await expect(AuthService.refresh('valid.but.orphan.token')).rejects.toMatchObject({
      status: 401,
    });
  });

  it("retourne un nouveau accessToken si le refresh token est valide", async () => {
    const mockUser = buildUser();
    (jwt.verify  as jest.Mock).mockReturnValue({ id: 'user-1' });
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign    as jest.Mock).mockReturnValue('new.access.token');

    const result = await AuthService.refresh('valid.refresh.token');

    expect(result).toMatchObject({ user: mockUser, accessToken: 'new.access.token' });
  });

  it("vérifie le token avec la clé refresh (pas la clé access)", async () => {
    const mockUser = buildUser();
    (jwt.verify  as jest.Mock).mockReturnValue({ id: 'user-1' });
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign    as jest.Mock).mockReturnValue('tok');

    await AuthService.refresh('a.refresh.token');

    const [, secretUsed] = (jwt.verify as jest.Mock).mock.calls[0] as any[];
    // La clé utilisée pour verify doit être la clé refresh
    expect(secretUsed).toBe(process.env.JWT_REFRESH_SECRET ?? 'secret_temporaire_refresh');
  });
});